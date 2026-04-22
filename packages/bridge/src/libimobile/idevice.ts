// 设备列表/信息查询

import { execFile } from 'child_process';
import { TOOLS, getToolPath } from './utils';
import type { IOSDevice, DeviceStatus, AutomationStatus } from '@ios-control/shared';

/** 执行 libimobiledevice 命令行工具 */
function execTool(tool: string, args: string[], timeout = 30000): Promise<string> {
  const toolPath = getToolPath(tool);
  return new Promise((resolve, reject) => {
    execFile(toolPath, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`[${tool}] ${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/** 获取已连接设备 UDID 列表 */
export async function getDeviceList(): Promise<string[]> {
  const output = await execTool(TOOLS.IDEVICE_ID, ['-l']);
  if (!output) return [];
  return output.split('\n').map(id => id.trim()).filter(Boolean);
}

/** 获取设备信息 (键值对) */
export async function getDeviceInfo(udid: string): Promise<Record<string, string>> {
  const output = await execTool(TOOLS.IDEVICE_INFO, ['-u', udid]);
  const info: Record<string, string> = {};

  for (const line of output.split('\n')) {
    const match = line.match(/^\s*(.+?)\s*:\s*(.+?)\s*$/);
    if (match) {
      info[match[1].trim()] = match[2].trim();
    }
  }

  return info;
}

/** 获取设备产品名称 */
export async function getDeviceName(udid: string): Promise<string> {
  const output = await execTool(TOOLS.IDEVICE_INFO, ['-u', udid, '-k', 'DeviceName']);
  return output || 'Unknown';
}

/** 获取设备 iOS 版本 */
export async function getDeviceOSVersion(udid: string): Promise<string> {
  const output = await execTool(TOOLS.IDEVICE_INFO, ['-u', udid, '-k', 'ProductVersion']);
  return output || '0.0';
}

/** 获取设备型号 */
export async function getDeviceType(udid: string): Promise<string> {
  const output = await execTool(TOOLS.IDEVICE_INFO, ['-u', udid, '-k', 'ProductType']);
  return output || 'Unknown';
}

/** 构建完整的 IOSDevice 对象 */
export async function buildDeviceObject(
  udid: string,
  existing?: Partial<IOSDevice>
): Promise<IOSDevice> {
  const [info, name, osVersion, deviceType] = await Promise.all([
    getDeviceInfo(udid).catch(() => ({})),
    getDeviceName(udid).catch(() => 'Unknown'),
    getDeviceOSVersion(udid).catch(() => '0.0'),
    getDeviceType(udid).catch(() => 'Unknown'),
  ]);

  return {
    udid,
    deviceType,
    productName: name,
    iosVersion: osVersion,
    deviceName: name,
    status: 'online' as DeviceStatus,
    automationStatus: (existing?.automationStatus ?? 'none') as AutomationStatus,
    wdaPort: existing?.wdaPort ?? 0,
    agentPort: existing?.agentPort ?? 0,
    groupId: existing?.groupId ?? '',
    connectionType: 'usb',
    firstSeenAt: existing?.firstSeenAt ?? Date.now(),
    lastSeenAt: Date.now(),
  };
}
