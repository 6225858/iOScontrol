// 开发者镜像挂载

import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TOOLS, getToolPath, getDeveloperImagePath } from './utils';

function execTool(tool: string, args: string[], timeout = 60000): Promise<string> {
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

/** 根据设备 iOS 版本查找对应的 DeveloperDiskImage */
function findImageForVersion(iosVersion: string): { imagePath: string; signaturePath: string } | null {
  const imageBase = getDeveloperImagePath();

  // 精确匹配
  const exactDir = path.join(imageBase, iosVersion);
  if (fs.existsSync(exactDir)) {
    const imagePath = path.join(exactDir, 'DeveloperDiskImage.dmg');
    const signaturePath = path.join(exactDir, 'DeveloperDiskImage.dmg.signature');
    if (fs.existsSync(imagePath) && fs.existsSync(signaturePath)) {
      return { imagePath, signaturePath };
    }
  }

  // 降级匹配：查找最接近的较低版本镜像
  const majorMinor = iosVersion.split('.').slice(0, 2).join('.');
  if (fs.existsSync(imageBase)) {
    const versions = fs.readdirSync(imageBase)
      .filter(d => fs.statSync(path.join(imageBase, d)).isDirectory())
      .sort();

    for (let i = versions.length - 1; i >= 0; i--) {
      const v = versions[i];
      if (v <= majorMinor) {
        const imagePath = path.join(imageBase, v, 'DeveloperDiskImage.dmg');
        const signaturePath = path.join(imageBase, v, 'DeveloperDiskImage.dmg.signature');
        if (fs.existsSync(imagePath) && fs.existsSync(signaturePath)) {
          return { imagePath, signaturePath };
        }
      }
    }
  }

  return null;
}

/** 挂载开发者镜像 */
export async function mountDeveloperImage(
  udid: string,
  iosVersion: string
): Promise<{ success: boolean; message: string }> {
  const imageInfo = findImageForVersion(iosVersion);
  if (!imageInfo) {
    return { success: false, message: `未找到 iOS ${iosVersion} 对应的开发者镜像` };
  }

  try {
    const output = await execTool(
      TOOLS.IDEVICE_IMAGE_MOUNTER,
      ['-u', udid, imageInfo.imagePath, imageInfo.signaturePath]
    );

    if (output.includes('Complete') || output.includes('already mounted')) {
      return { success: true, message: '镜像挂载成功' };
    }
    return { success: false, message: output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('already mounted')) {
      return { success: true, message: '镜像已挂载' };
    }
    return { success: false, message: msg };
  }
}

/** 检查镜像是否已挂载 */
export async function isImageMounted(udid: string): Promise<boolean> {
  const output = await execTool(TOOLS.IDEVICE_IMAGE_MOUNTER, ['-u', udid, '-l']);
  return output.includes('DeveloperDiskImage');
}

/** 获取可用的开发者镜像版本列表 */
export function getAvailableImageVersions(): string[] {
  const imageBase = getDeveloperImagePath();
  if (!fs.existsSync(imageBase)) return [];

  return fs.readdirSync(imageBase)
    .filter(d => {
      const dir = path.join(imageBase, d);
      return fs.statSync(dir).isDirectory() &&
        fs.existsSync(path.join(dir, 'DeveloperDiskImage.dmg'));
    })
    .sort();
}
