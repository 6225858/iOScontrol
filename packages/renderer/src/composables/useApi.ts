// API 通信封装

import type { ApiResponse } from '@ios-control/shared';

/** 获取桥接服务基础 URL */
function getBridgeBase(): string {
  // 优先使用 Electron preload 暴露的 fetch（自动带端口）
  if (window.iosControl?.fetch) {
    // 通过 preload fetch 时路径直接使用相对路径
    return '';
  }
  // 降级：直接连接本地桥接服务
  const port = window.iosControl ? 8020 : 8020;
  return `http://127.0.0.1:${port}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const fetchFn = window.iosControl?.fetch ?? fetch;
  const base = getBridgeBase();
  const url = base ? `${base}${path}` : path;
  const response = await fetchFn(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  } as RequestInit);
  return response.json();
}

export const bridgeApi = {
  // 设备管理
  getDevices: () => request<{ devices: any[]; groups: any[]; total: number }>('/api/devices'),
  getDevice: (udid: string) => request<any>(`/api/devices/${udid}`),
  pairDevice: (udid: string) => request<any>(`/api/devices/${udid}/pair`, { method: 'POST' }),
  startAutomation: (udid: string) => request<any>(`/api/devices/${udid}/automation`, { method: 'POST' }),
  stopAutomation: (udid: string) => request<any>(`/api/devices/${udid}/automation`, { method: 'DELETE' }),
  testAutomation: (udid: string) => request<any>(`/api/devices/${udid}/test-automation`, { method: 'POST' }),
  mountDevImage: (udid: string) => request<any>(`/api/devices/${udid}/mount-image`, { method: 'POST' }),
  batchMountDevImage: (udids?: string[]) => request<any>('/api/devices/batch/mount-image', {
    method: 'POST',
    body: JSON.stringify({ udids }),
  }),
  setDeviceGroup: (udid: string, groupId: string) => request<any>(`/api/devices/${udid}/group`, {
    method: 'PUT',
    body: JSON.stringify({ groupId }),
  }),
  scanDevices: () => request<any>('/api/devices/scan', { method: 'POST' }),
  getGroups: () => request<any[]>('/api/devices/groups'),

  // 投屏
  startScreen: (udid: string, opts?: { quality?: number; fps?: number }) =>
    request<any>(`/api/screen/${udid}/start`, {
      method: 'POST',
      body: JSON.stringify(opts ?? {}),
    }),
  stopScreen: (udid: string) => request<any>(`/api/screen/${udid}/stop`, { method: 'POST' }),
  sendTouch: (udid: string, action: string, params: Record<string, number>) =>
    request<any>(`/api/screen/${udid}/touch`, {
      method: 'POST',
      body: JSON.stringify({ action, ...params }),
    }),
  getScreenSessions: () => request<any[]>('/api/screen/sessions'),

  // 脚本
  getScripts: () => request<{ scripts: any[]; total: number }>('/api/scripts'),
  reloadScripts: () => request<any>('/api/scripts/reload', { method: 'POST' }),
  executeScript: (id: string, deviceUdids: string[], params?: Record<string, unknown>) =>
    request<{ executionIds: string[] }>(`/api/scripts/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ deviceUdids, params }),
    }),
  stopExecution: (executionId: string) => request<any>(`/api/scripts/execution/${executionId}/stop`, { method: 'POST' }),
  getExecutions: () => request<any>('/api/scripts/executions'),
  getExecution: (id: string) => request<any>(`/api/scripts/execution/${id}`),

  // 文件
  installApp: (udid: string, ipaPath: string) => request<any>('/api/file/install-app', {
    method: 'POST',
    body: JSON.stringify({ udid, ipaPath }),
  }),
  uninstallApp: (udid: string, bundleId: string) => request<any>('/api/file/uninstall-app', {
    method: 'POST',
    body: JSON.stringify({ udid, bundleId }),
  }),
  getApps: (udid: string) => request<any[]>(`/api/file/apps/${udid}`),

  // OCR
  ocrRecognize: (image: string, engine?: string, useGpu?: boolean) =>
    request<any>('/api/ocr/recognize', {
      method: 'POST',
      body: JSON.stringify({ image, engine, useGpu }),
    }),

  // 设置
  getSettings: () => request<any>('/api/settings'),
  updateSettings: (settings: Record<string, unknown>) => request<any>('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  // 集控管理
  getHubNodes: () => request<{ nodes: any[]; total: number }>('/api/hub/nodes'),
  sendHubCommand: (nodeId: string | undefined, command: string, params?: Record<string, unknown>) =>
    request<any>('/api/hub/command', {
      method: 'POST',
      body: JSON.stringify({ nodeId, command, params }),
    }),
  requestHubSync: (nodeId: string) => request<any>('/api/hub/sync', {
    method: 'POST',
    body: JSON.stringify({ nodeId }),
  }),
};
