// 自动更新模块

import { BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

/** 初始化自动更新 */
export function initUpdater(win: BrowserWindow): void {
  mainWindow = win;

  // 不自动下载，由用户决定
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 检查更新失败
  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err?.message);
    sendToRenderer('update:error', { message: err?.message ?? '检查更新失败' });
  });

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
    sendToRenderer('update:checking');
  });

  // 发现新版本
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log(`[Updater] Update available: v${info.version}`);
    sendToRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  // 当前已是最新版本
  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] Already up to date');
    sendToRenderer('update:not-available');
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`[Updater] Download progress: ${percent}%`);
    sendToRenderer('update:progress', {
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  // 下载完成
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`[Updater] Update downloaded: v${info.version}`);
    sendToRenderer('update:downloaded', {
      version: info.version,
    });
  });
}

/** 检查更新 */
export async function checkForUpdate(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('[Updater] Check failed:', err);
  }
}

/** 下载更新 */
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    console.error('[Updater] Download failed:', err);
  }
}

/** 安装更新并重启 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

/** 发送消息到渲染进程 */
function sendToRenderer(channel: string, data?: any): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}
