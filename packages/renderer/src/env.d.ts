/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface Window {
  iosControl: {
    bridgeStatus: () => Promise<{ running: boolean }>;
    bridgeRestart: () => Promise<{ success: boolean }>;
    appVersion: () => Promise<{ version: string }>;
    resourcesPath: () => Promise<string>;
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowClose: () => Promise<void>;
    windowIsMaximized: () => Promise<boolean>;
    onNavigate: (callback: (path: string) => void) => void;
    onBridgeRestartRequested: (callback: () => void) => void;
    fetch: (path: string, options?: RequestInit) => Promise<Response>;
    getBridgePort: () => number;
    openFileDialog: (options?: {
      title?: string;
      filters?: { name: string; extensions: string[] }[];
      multiSelections?: boolean;
    }) => Promise<string[]>;
    saveFileDialog: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    }) => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    openPath: (path: string) => Promise<void>;
    updateCheck: () => Promise<{ success: boolean }>;
    updateDownload: () => Promise<{ success: boolean }>;
    updateInstall: () => void;
  };
  __bridgePort: number;
}
