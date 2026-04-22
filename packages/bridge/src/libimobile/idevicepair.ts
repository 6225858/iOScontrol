// 设备配对

import { execFile } from 'child_process';
import { TOOLS, getToolPath } from './utils';
import { PairState } from '@ios-control/shared';

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

/** 查询设备配对状态 */
export async function getPairState(udid: string): Promise<PairState> {
  const output = await execTool(TOOLS.IDEVICE_PAIR, ['-u', udid, 'validate']);
  if (output.includes('SUCCESS')) return PairState.Paired;
  if (output.includes('not paired')) return PairState.NotPaired;
  if (output.includes('waiting for pairing')) return PairState.Pairing;
  return PairState.Error;
}

/** 请求设备配对 */
export async function pairDevice(udid: string): Promise<{ success: boolean; message: string }> {
  const output = await execTool(TOOLS.IDEVICE_PAIR, ['-u', udid, 'pair'], 60000);
  if (output.includes('SUCCESS')) {
    return { success: true, message: '配对成功' };
  }
  return { success: false, message: output };
}

/** 取消配对 */
export async function unpairDevice(udid: string): Promise<{ success: boolean; message: string }> {
  const output = await execTool(TOOLS.IDEVICE_PAIR, ['-u', udid, 'unpair'], 60000);
  if (output.includes('SUCCESS')) {
    return { success: true, message: '取消配对成功' };
  }
  return { success: false, message: output };
}

/** 列出已配对设备 */
export async function listPairedDevices(): Promise<string[]> {
  const output = await execTool(TOOLS.IDEVICE_PAIR, ['-l']);
  if (!output) return [];
  return output.split('\n').map(id => id.trim()).filter(Boolean);
}
