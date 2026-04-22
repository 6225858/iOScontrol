// Electron 主进程入口

import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import { BridgeProcess } from './bridge';
import { registerIpcHandlers } from './ipc-handlers';
import { createTray } from './tray';
import { DEFAULT_BRIDGE_PORT } from '@ios-control/shared';
import { initUpdater, checkForUpdate } from './updater';

let mainWindow: BrowserWindow | null = null;
let bridgeProcess: BridgeProcess | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0A0E1A',
      symbolColor: '#9CA3AF',
      height: 36,
    },
    backgroundColor: '#0A0E1A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });

  // 加载页面
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'bottom' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

// 应用启动
app.whenReady().then(() => {
  mainWindow = createMainWindow();

  // 启动桥接服务
  bridgeProcess = new BridgeProcess(DEFAULT_BRIDGE_PORT);
  bridgeProcess.start();

  // 注册 IPC 处理器
  registerIpcHandlers(mainWindow, bridgeProcess);

  // 创建系统托盘
  createTray(mainWindow);

  // 初始化自动更新
  if (!isDev) {
    initUpdater(mainWindow);
    // 启动后延迟 30 秒检查更新
    setTimeout(() => checkForUpdate(), 30000);
  }

  // macOS 激活
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else {
      mainWindow?.show();
    }
  });

  // 隐藏菜单栏 (Windows)
  Menu.setApplicationMenu(null);
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  bridgeProcess?.stop();
});
