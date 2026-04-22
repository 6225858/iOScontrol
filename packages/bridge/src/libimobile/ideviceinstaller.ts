// 应用安装卸载

import { execFile } from 'child_process';
import { TOOLS, getToolPath } from './utils';

function execTool(tool: string, args: string[], timeout = 120000): Promise<string> {
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

/** 安装 IPA 到设备 */
export async function installApp(
  udid: string,
  ipaPath: string
): Promise<{ success: boolean; message: string }> {
  const output = await execTool(TOOLS.IDEVICE_INSTALLER, ['-u', udid, '-i', ipaPath]);
  if (output.includes('Complete') || output.includes('success')) {
    return { success: true, message: '安装成功' };
  }
  return { success: false, message: output };
}

/** 卸载应用 */
export async function uninstallApp(
  udid: string,
  bundleId: string
): Promise<{ success: boolean; message: string }> {
  const output = await execTool(TOOLS.IDEVICE_INSTALLER, ['-u', udid, '-U', bundleId]);
  if (output.includes('Complete') || output.includes('success') || output.includes('Removed')) {
    return { success: true, message: '卸载成功' };
  }
  return { success: false, message: output };
}

/** 列出设备已安装应用 */
export async function listApps(udid: string): Promise<Array<{ bundleId: string; name: string }>> {
  const output = await execTool(TOOLS.IDEVICE_INSTALLER, ['-u', udid, '-l']);
  const apps: Array<{ bundleId: string; name: string }> = [];

  for (const line of output.split('\n')) {
    const match = line.match(/^\s*(.+?)\s*-\s*(.+?)\s*$/);
    if (match) {
      apps.push({ bundleId: match[1].trim(), name: match[2].trim() });
    }
  }

  return apps;
}

/** 查询应用安装状态 */
export async function isAppInstalled(udid: string, bundleId: string): Promise<boolean> {
  const output = await execTool(TOOLS.IDEVICE_INSTALLER, ['-u', udid, '-l', '-o', 'list_all']);
  return output.includes(bundleId);
}
