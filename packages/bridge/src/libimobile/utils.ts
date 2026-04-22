// libimobiledevice 工具路径解析

import * as path from 'path';
import * as fs from 'fs';

/** 获取平台对应的二进制工具目录 */
export function getBinDir(): string {
  const platform = process.platform;
  const appPath = getAppResourcePath();
  const binDir = path.join(appPath, 'bin', platform === 'win32' ? 'win' : 'mac');

  if (!fs.existsSync(binDir)) {
    console.warn(`[libimobile] Binary directory not found: ${binDir}`);
  }

  return binDir;
}

/** 获取应用资源路径 */
function getAppResourcePath(): string {
  // 开发环境
  if (process.env.NODE_ENV === 'development' || !process.env.RESOURCES_PATH) {
    return path.resolve(process.cwd(), 'resources');
  }
  // 生产环境
  return process.env.RESOURCES_PATH;
}

/** 获取工具可执行文件路径 */
export function getToolPath(toolName: string): string {
  const binDir = getBinDir();
  const ext = process.platform === 'win32' ? '.exe' : '';
  const toolPath = path.join(binDir, `${toolName}${ext}`);

  if (!fs.existsSync(toolPath)) {
    console.warn(`[libimobile] Tool not found: ${toolPath}`);
  }

  return toolPath;
}

/** 常用工具名称常量 */
export const TOOLS = {
  IDEVICE_ID: 'idevice_id',
  IDEVICE_INFO: 'ideviceinfo',
  IDEVICE_PAIR: 'idevicepair',
  IDEVICE_INSTALLER: 'ideviceinstaller',
  IDEVICE_IMAGE_MOUNTER: 'ideviceimagemounter',
  IDEVICE_DATE: 'idevicedate',
  IDEVICE_BACKUP: 'idevicebackup2',
  IDEVICE_SCREENSHOT: 'idevicescreenshot',
  IDEVICE_SYSLOG: 'idevicesyslog',
  IDEVICE_DIAGNOSTICS: 'idevicediagnostics',
  IDEVICE_DEBUG: 'idevicedebug',
  IDEVICE_DDI: 'ideviceddi',
  IDEVICE_ENTER_RECOVERY: 'ideviceenterrecovery',
  IDEVICE_RESTORE: 'idevicerestore',
  USBMUXD: 'usbmuxd',
} as const;

/** DeveloperDiskImage 资源路径 */
export function getDeveloperImagePath(): string {
  const appPath = getAppResourcePath();
  return path.join(appPath, 'DeveloperDiskImage');
}

/** IPA 资源路径 */
export function getIpaPath(): string {
  const appPath = getAppResourcePath();
  return path.join(appPath, 'ipa');
}

/** OCR 模型资源路径 */
export function getOcrModelPath(): string {
  const appPath = getAppResourcePath();
  return path.join(appPath, 'ocr-models');
}
