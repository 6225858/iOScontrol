// IPC 消息处理注册

import { ipcMain, BrowserWindow, dialog, shell } from 'electron';
import { IPC_CHANNELS } from '@ios-control/shared';
import type { BridgeProcess } from './bridge';
import { checkForUpdate, downloadUpdate, quitAndInstall } from './updater';

export function registerIpcHandlers(mainWindow: BrowserWindow, bridgeProcess: BridgeProcess): void {
  // 桥接服务状态
  ipcMain.handle(IPC_CHANNELS.BRIDGE_STATUS, () => {
    return { running: bridgeProcess.isRunning() };
  });

  // 重启桥接服务
  ipcMain.handle(IPC_CHANNELS.BRIDGE_RESTART, () => {
    bridgeProcess.restart();
    return { success: true };
  });

  // 获取应用版本
  ipcMain.handle('app:version', () => {
    return { version: require('electron').app.getVersion() };
  });

  // 获取资源路径
  ipcMain.handle('app:resources-path', () => {
    return process.resourcesPath || process.cwd();
  });

  // 窗口控制
  ipcMain.handle('window:minimize', () => mainWindow.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow.close());
  ipcMain.handle('window:is-maximized', () => mainWindow.isMaximized());

  // 获取桥接服务端口
  ipcMain.on('get-bridge-port', (event) => {
    event.returnValue = parseInt(process.env.BRIDGE_PORT ?? '8020', 10);
  });

  // 文件选择对话框
  ipcMain.handle('dialog:open-file', async (_event, options: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    multiSelections?: boolean;
  }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title ?? '选择文件',
      filters: options.filters ?? [{ name: '所有文件', extensions: ['*'] }],
      properties: [options.multiSelections ? 'multiSelections' : 'openFile'],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // 保存文件对话框
  ipcMain.handle('dialog:save-file', async (_event, options: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options.title ?? '保存文件',
      defaultPath: options.defaultPath,
      filters: options.filters ?? [{ name: '所有文件', extensions: ['*'] }],
    });
    return result.canceled ? '' : result.filePath;
  });

  // 打开外部链接
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  // 在文件管理器中打开
  ipcMain.handle('shell:open-path', async (_event, path: string) => {
    await shell.openPath(path);
  });

  // 自动更新
  ipcMain.handle('update:check', async () => {
    await checkForUpdate();
    return { success: true };
  });

  ipcMain.handle('update:download', async () => {
    await downloadUpdate();
    return { success: true };
  });

  ipcMain.handle('update:install', () => {
    quitAndInstall();
  });
}
