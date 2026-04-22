import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IOSDevice, DeviceGroup } from '@ios-control/shared';
import { DeviceStatus, AutomationStatus } from '@ios-control/shared';
import { bridgeApi } from '@/composables/useApi';

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<IOSDevice[]>([]);
  const groups = ref<DeviceGroup[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const onlineDevices = computed(() => devices.value.filter(d => d.status === DeviceStatus.Online));
  const offlineDevices = computed(() => devices.value.filter(d => d.status === DeviceStatus.Offline));
  const automatedDevices = computed(() => devices.value.filter(d => d.automationStatus === AutomationStatus.Running));
  const deviceCount = computed(() => devices.value.length);
  const onlineCount = computed(() => onlineDevices.value.length);
  const automatedCount = computed(() => automatedDevices.value.length);

  /** 加载设备列表 */
  async function fetchDevices(): Promise<void> {
    loading.value = true;
    error.value = null;
    const res = await bridgeApi.getDevices();
    if (res.code === 0) {
      devices.value = res.data.devices;
      if (res.data.groups) {
        groups.value = res.data.groups;
      }
    } else {
      error.value = res.msg;
    }
    loading.value = false;
  }

  /** 设备配对 */
  async function pairDevice(udid: string): Promise<boolean> {
    const res = await bridgeApi.pairDevice(udid);
    return res.code === 0;
  }

  /** 开启自动化 */
  async function startAutomation(udid: string): Promise<boolean> {
    const res = await bridgeApi.startAutomation(udid);
    if (res.code === 0) {
      const device = devices.value.find(d => d.udid === udid);
      if (device) {
        device.automationStatus = AutomationStatus.Running;
        device.wdaPort = res.data.wdaPort;
        device.agentPort = res.data.agentPort;
      }
      return true;
    }
    return false;
  }

  /** 停止自动化 */
  async function stopAutomation(udid: string): Promise<boolean> {
    const res = await bridgeApi.stopAutomation(udid);
    if (res.code === 0) {
      const device = devices.value.find(d => d.udid === udid);
      if (device) {
        device.automationStatus = AutomationStatus.None;
        device.wdaPort = 0;
        device.agentPort = 0;
      }
      return true;
    }
    return false;
  }

  /** 刷入开发者镜像 */
  async function mountDevImage(udid: string): Promise<boolean> {
    const res = await bridgeApi.mountDevImage(udid);
    return res.code === 0;
  }

  /** 设置设备分组 */
  async function setDeviceGroup(udid: string, groupId: string): Promise<void> {
    await bridgeApi.setDeviceGroup(udid, groupId);
    const device = devices.value.find(d => d.udid === udid);
    if (device) {
      device.groupId = groupId;
    }
  }

  /** 手动刷新 */
  async function refresh(): Promise<void> {
    await fetchDevices();
  }

  return {
    devices,
    groups,
    loading,
    error,
    onlineDevices,
    offlineDevices,
    automatedDevices,
    deviceCount,
    onlineCount,
    automatedCount,
    fetchDevices,
    pairDevice,
    startAutomation,
    stopAutomation,
    mountDevImage,
    setDeviceGroup,
    refresh,
  };
});
