// 系统设置 API 路由

import type { FastifyInstance } from 'fastify';
import type { AppSettings } from '@ios-control/shared';
import { DEFAULT_BRIDGE_PORT, DEFAULT_SCREEN_QUALITY, DEFAULT_SCREEN_FPS } from '@ios-control/shared';
import * as fs from 'fs';
import * as path from 'path';

const defaultSettings: AppSettings = {
  bridgePort: DEFAULT_BRIDGE_PORT,
  screenQuality: DEFAULT_SCREEN_QUALITY,
  screenFps: DEFAULT_SCREEN_FPS,
  autoFlushDevImg: true,
  bundleIdPrefix: '',
  ios17TunnelMode: 'user',
  remoteCenterUrl: '',
  ocrEngine: 'paddleocr',
  ocrUseGpu: false,
  scanMode: 'both',
  scanInterval: 5,
};

let currentSettings: AppSettings = { ...defaultSettings };

/** 设置变更回调列表 */
const onChangeCallbacks: Array<(settings: AppSettings, changedKeys: string[]) => void> = [];

/** 注册设置变更回调 */
export function onSettingsChange(callback: (settings: AppSettings, changedKeys: string[]) => void): void {
  onChangeCallbacks.push(callback);
}

/** 设置文件路径 */
function getSettingsFilePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'settings.json');
}

/** 从文件加载设置 */
function loadSettings(): void {
  const filePath = getSettingsFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const saved = JSON.parse(data);
      currentSettings = { ...defaultSettings, ...saved };
      console.log('[Settings] Loaded from file');
    } catch (err) {
      console.warn('[Settings] Failed to load settings file:', err);
    }
  }
}

/** 保存设置到文件 */
function saveSettings(): void {
  const filePath = getSettingsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(currentSettings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Settings] Failed to save settings file:', err);
  }
}

/** 通知设置变更 */
function notifyChange(changedKeys: string[]): void {
  for (const cb of onChangeCallbacks) {
    try {
      cb(currentSettings, changedKeys);
    } catch (err) {
      console.error('[Settings] Change callback error:', err);
    }
  }
}

// 初始化时加载设置
loadSettings();

export function registerSettingsRoutes(app: FastifyInstance): void {
  // GET /api/settings - 获取设置
  app.get('/api/settings', async (_req, reply) => {
    return { code: 0, data: currentSettings, msg: '' };
  });

  // POST /api/settings - 更新设置
  app.post<{ Body: Partial<AppSettings> }>('/api/settings', async (req, reply) => {
    const changedKeys = Object.keys(req.body);
    currentSettings = { ...currentSettings, ...req.body };
    saveSettings();
    notifyChange(changedKeys);
    return { code: 0, data: { success: true }, msg: '' };
  });

  // POST /api/settings/reset - 重置设置
  app.post('/api/settings/reset', async (_req, reply) => {
    const changedKeys = Object.keys(currentSettings);
    currentSettings = { ...defaultSettings };
    saveSettings();
    notifyChange(changedKeys);
    return { code: 0, data: currentSettings, msg: '' };
  });
}

/** 导出当前设置供其他模块使用 */
export function getCurrentSettings(): AppSettings {
  return currentSettings;
}
