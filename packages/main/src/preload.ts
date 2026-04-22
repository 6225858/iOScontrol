// Preload 脚本 - 暴露安全 API 到渲染进程

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@ios-control/shared';

const api = {
  // 桥接服务
  bridgeStatus: () => ipcRenderer.invoke(IPC_CHANNELS.BRIDGE_STATUS),
  bridgeRestart: () => ipcRenderer.invoke(IPC_CHANNELS.BRIDGE_RESTART),

  // 应用信息
  appVersion: () => ipcRenderer.invoke('app:version'),
  resourcesPath: () => ipcRenderer.invoke('app:resources-path'),

  // 窗口控制
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // 事件监听
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_event, path) => callback(path));
  },
  onBridgeRestartRequested: (callback: () => void) => {
    ipcRenderer.on('bridge:restart-requested', () => callback());
  },

  // 通用 HTTP 代理 (避免渲染进程直接访问桥接服务)
  fetch: async (path: string, options?: RequestInit) => {
    const port = ipcRenderer.sendSync('get-bridge-port') || 8020;
    const url = `http://127.0.0.1:${port}${path}`;
    return fetch(url, options);
  },

  // 获取桥接服务端口
  getBridgePort: () => ipcRenderer.sendSync('get-bridge-port') || 8020,

  // 文件对话框
  openFileDialog: (options?: { title?: string; filters?: { name: string; extensions: string[] }[]; multiSelections?: boolean }) =>
    ipcRenderer.invoke('dialog:open-file', options ?? {}),
  saveFileDialog: (options?: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:save-file', options ?? {}),

  // 外部操作
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),

  // 自动更新
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateDownload: () => ipcRenderer.invoke('update:download'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
};

contextBridge.exposeInMainWorld('iosControl', api);

// 同时将端口写入全局变量，供 WebSocket 连接使用
const bridgePort = ipcRenderer.sendSync('get-bridge-port') || 8020;
(window as any).__bridgePort = bridgePort;
