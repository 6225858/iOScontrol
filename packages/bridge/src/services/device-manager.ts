// 设备发现/监控/配对核心逻辑

import { EventEmitter } from 'events';
import type { IOSDevice, DeviceStatus, AutomationStatus, DeviceGroup } from '@ios-control/shared';
import { DeviceStatus as DeviceStatusEnum, AutomationStatus as AutoStatusEnum } from '@ios-control/shared';
import { getDeviceList, buildDeviceObject } from '../libimobile/idevice';
import { getPairState, pairDevice as pairDeviceTool } from '../libimobile/idevicepair';
import { mountDeveloperImage } from '../libimobile/ideviceimagemounter';

export interface DeviceManagerEvents {
  'device:connected': (device: IOSDevice) => void;
  'device:disconnected': (udid: string) => void;
  'device:updated': (device: IOSDevice) => void;
  'device:status-changed': (udid: string, status: DeviceStatus) => void;
  'device:automation-changed': (udid: string, status: AutomationStatus) => void;
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, IOSDevice> = new Map();
  private groups: Map<string, DeviceGroup> = new Map();
  private scanTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor() {
    super();
    this.initDefaultGroups();
  }

  private initDefaultGroups(): void {
    const defaults: DeviceGroup[] = [
      { id: 'all', name: '全部设备', color: '#00B4D8', deviceCount: 0, createdAt: Date.now() },
      { id: 'online', name: '在线设备', color: '#10B981', deviceCount: 0, createdAt: Date.now() },
      { id: 'offline', name: '离线设备', color: '#EF4444', deviceCount: 0, createdAt: Date.now() },
    ];
    for (const g of defaults) {
      this.groups.set(g.id, g);
    }
  }

  /** 启动设备扫描 */
  async start(scanInterval = 5000): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log('[DeviceManager] Starting device scan...');
    await this.scan();
    this.scanTimer = setInterval(() => this.scan(), scanInterval);
  }

  /** 停止设备扫描 */
  stop(): void {
    this.running = false;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    console.log('[DeviceManager] Stopped device scan');
  }

  /** 执行一次设备扫描 */
  async scan(): Promise<IOSDevice[]> {
    const udids = await getDeviceList().catch(() => [] as string[]);
    const currentUdids = new Set(udids);
    const knownUdids = new Set(this.devices.keys());

    // 检测新设备
    for (const udid of udids) {
      if (!knownUdids.has(udid)) {
        const device = await buildDeviceObject(udid).catch(() => null);
        if (device) {
          this.devices.set(udid, device);
          this.emit('device:connected', device);
          this.emit('device:status-changed', udid, DeviceStatusEnum.Online);
        }
      } else {
        // 更新已有设备的在线时间
        const existing = this.devices.get(udid)!;
        existing.lastSeenAt = Date.now();
        if (existing.status !== DeviceStatusEnum.Online) {
          existing.status = DeviceStatusEnum.Online;
          this.emit('device:status-changed', udid, DeviceStatusEnum.Online);
        }
      }
    }

    // 检测离线设备
    for (const udid of knownUdids) {
      if (!currentUdids.has(udid)) {
        const device = this.devices.get(udid)!;
        device.status = DeviceStatusEnum.Offline;
        this.emit('device:disconnected', udid);
        this.emit('device:status-changed', udid, DeviceStatusEnum.Offline);
      }
    }

    this.updateGroupCounts();
    return Array.from(this.devices.values());
  }

  /** 获取所有设备 */
  getDevices(): IOSDevice[] {
    return Array.from(this.devices.values());
  }

  /** 获取设备 */
  getDevice(udid: string): IOSDevice | undefined {
    return this.devices.get(udid);
  }

  /** 配对设备 */
  async pairDevice(udid: string): Promise<{ success: boolean; message: string }> {
    const state = await getPairState(udid).catch(() => 'error');
    if (state === 'paired') {
      return { success: true, message: '设备已配对' };
    }
    return pairDeviceTool(udid);
  }

  /** 刷入开发者镜像 */
  async mountDevImage(udid: string): Promise<{ success: boolean; message: string }> {
    const device = this.devices.get(udid);
    if (!device) {
      return { success: false, message: '设备未找到' };
    }
    const result = await mountDeveloperImage(udid, device.iosVersion);
    if (result.success) {
      this.emit('device:updated', device);
    }
    return result;
  }

  /** 批量刷入开发者镜像 */
  async batchMountDevImage(udids?: string[]): Promise<Array<{ udid: string; success: boolean; message: string }>> {
    const targets = udids ?? Array.from(this.devices.keys());
    const results = await Promise.allSettled(
      targets.map(async udid => {
        const result = await this.mountDevImage(udid);
        return { udid, ...result };
      })
    );
    return results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { udid: targets[i], success: false, message: '执行失败' }
    );
  }

  /** 更新设备自动化状态 */
  setAutomationStatus(udid: string, status: AutomationStatus): void {
    const device = this.devices.get(udid);
    if (device) {
      device.automationStatus = status;
      this.emit('device:automation-changed', udid, status);
    }
  }

  /** 设置设备分组 */
  setDeviceGroup(udid: string, groupId: string): void {
    const device = this.devices.get(udid);
    if (device) {
      device.groupId = groupId;
      this.emit('device:updated', device);
      this.updateGroupCounts();
    }
  }

  /** 获取分组列表 */
  getGroups(): DeviceGroup[] {
    return Array.from(this.groups.values());
  }

  /** 添加分组 */
  addGroup(group: DeviceGroup): void {
    this.groups.set(group.id, group);
  }

  /** 删除分组 */
  removeGroup(groupId: string): void {
    if (groupId === 'all' || groupId === 'online' || groupId === 'offline') return;
    this.groups.delete(groupId);
    this.updateGroupCounts();
  }

  private updateGroupCounts(): void {
    const devices = Array.from(this.devices.values());
    const allGroup = this.groups.get('all');
    const onlineGroup = this.groups.get('online');
    const offlineGroup = this.groups.get('offline');

    if (allGroup) allGroup.deviceCount = devices.length;
    if (onlineGroup) onlineGroup.deviceCount = devices.filter(d => d.status === DeviceStatusEnum.Online).length;
    if (offlineGroup) offlineGroup.deviceCount = devices.filter(d => d.status === DeviceStatusEnum.Offline).length;
  }
}
