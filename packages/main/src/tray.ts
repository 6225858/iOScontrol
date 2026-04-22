// 系统托盘管理

import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import * as path from 'path';

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = nativeImage.createEmpty();
  const tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: '设备管理',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', '/devices');
      },
    },
    { type: 'separator' },
    {
      label: '重启桥接服务',
      click: () => {
        mainWindow.webContents.send('bridge:restart-requested');
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('iOS-Control 中控系统');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}
