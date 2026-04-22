/**
 * Native Screen Capture — Node.js 封装
 *
 * 优先使用 C++ addon 通过 USB 直接捕获帧数据，
 * 若 addon 未编译或不可用，则自动降级到 WDA screenshot API。
 */

import * as path from 'path';
import * as fs from 'fs';

let nativeAddon: any = null;
let loadAttempted = false;

/** 获取 native addon 路径 */
function getAddonPath(): string {
  // 生产环境: 编译后的 .node 文件在 dist/native/ 下
  const candidates = [
    path.resolve(__dirname, '../native/ios_screen_capture.node'),
    path.resolve(__dirname, '../../build/Release/ios_screen_capture.node'),
    path.resolve(__dirname, '../../build/Debug/ios_screen_capture.node'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

/** 获取 libimobiledevice 动态库路径 */
function getLibPath(): string {
  const platform = process.platform;
  const subDir = platform === 'win32' ? 'win' : 'mac';
  const resourcePath = process.env.RESOURCES_PATH || path.resolve(process.cwd(), 'resources');

  if (platform === 'win32') {
    return path.join(resourcePath, 'bin', subDir, 'imobiledevice.dll');
  }
  return path.join(resourcePath, 'bin', subDir, 'libimobiledevice.dylib');
}

/** 初始化 native addon */
export function initNativeCapture(): boolean {
  if (loadAttempted) return nativeAddon !== null;
  loadAttempted = true;

  try {
    const addonPath = getAddonPath();
    if (!addonPath) {
      console.warn('[ScreenCapture] Native addon not found, falling back to WDA');
      return false;
    }

    nativeAddon = require(addonPath);

    // 加载动态库
    const libPath = getLibPath();
    if (fs.existsSync(libPath)) {
      const result = nativeAddon.init(libPath);
      if (result !== 0) {
        console.warn(`[ScreenCapture] Failed to load libimobiledevice: ${result}`);
        nativeAddon = null;
        return false;
      }
    } else {
      console.warn(`[ScreenCapture] libimobiledevice not found at: ${libPath}`);
      nativeAddon = null;
      return false;
    }

    console.log('[ScreenCapture] Native addon initialized successfully');
    return true;
  } catch (err) {
    console.warn('[ScreenCapture] Native addon load failed:', (err as Error).message);
    nativeAddon = null;
    return false;
  }
}

/** 通过 USB 捕获一帧（使用 native addon） */
export async function captureFrameNative(udid: string): Promise<Buffer | null> {
  if (!nativeAddon) {
    initNativeCapture();
    if (!nativeAddon) return null;
  }

  try {
    const result = nativeAddon.captureFrame(udid);
    if (Buffer.isBuffer(result) && result.length > 0) {
      return result;
    }
    return null;
  } catch (err) {
    console.error('[ScreenCapture] Native capture error:', err);
    return null;
  }
}

/** 检查 native addon 是否可用 */
export function isNativeAvailable(): boolean {
  if (!loadAttempted) initNativeCapture();
  return nativeAddon !== null;
}
