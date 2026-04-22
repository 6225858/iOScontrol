// 共享常量

/** 桥接服务默认端口 */
export const DEFAULT_BRIDGE_PORT = 8020;

/** 投屏默认配置 */
export const DEFAULT_SCREEN_QUALITY = 50;
export const DEFAULT_SCREEN_FPS = 60;
export const MIN_SCREEN_FPS = 10;
export const MAX_SCREEN_FPS = 120;

/** WDA 默认端口范围 */
export const WDA_PORT_START = 8100;
export const WDA_PORT_END = 8200;

/** 代理 IPA 默认端口范围 */
export const AGENT_PORT_START = 19400;
export const AGENT_PORT_END = 19500;

/** 辅助 App 端口 */
export const ASSIST_APP_PORT = 18924;

/** 设备扫描间隔 (毫秒) */
export const SCAN_INTERVAL = 5000;

/** 桥接服务进程重启最大次数 */
export const BRIDGE_MAX_RESTART = 5;

/** 桥接服务进程重启冷却时间 (毫秒) */
export const BRIDGE_RESTART_COOLDOWN = 10000;

/** 支持的 iOS 版本范围 */
export const MIN_IOS_VERSION = '12.4';
export const MAX_IOS_VERSION = '26.0';

/** 投屏帧缓冲区大小 */
export const SCREEN_FRAME_BUFFER_SIZE = 3;

/** IPC 通道名称 */
export const IPC_CHANNELS = {
  // 设备相关
  DEVICE_LIST: 'device:list',
  DEVICE_INFO: 'device:info',
  DEVICE_PAIR: 'device:pair',
  DEVICE_START_AUTOMATION: 'device:start-automation',
  DEVICE_STOP_AUTOMATION: 'device:stop-automation',
  DEVICE_MOUNT_IMAGE: 'device:mount-image',
  DEVICE_STATUS_CHANGED: 'device:status-changed',

  // 投屏相关
  SCREEN_START: 'screen:start',
  SCREEN_STOP: 'screen:stop',
  SCREEN_FRAME: 'screen:frame',
  SCREEN_TOUCH: 'screen:touch',
  SCREEN_CONFIG: 'screen:config',

  // 脚本相关
  SCRIPT_LIST: 'script:list',
  SCRIPT_EXECUTE: 'script:execute',
  SCRIPT_STOP: 'script:stop',
  SCRIPT_LOG: 'script:log',

  // 文件相关
  FILE_INSTALL_APP: 'file:install-app',
  FILE_TRANSFER: 'file:transfer',
  FILE_CLIPBOARD_GET: 'file:clipboard-get',
  FILE_CLIPBOARD_SET: 'file:clipboard-set',

  // OCR 相关
  OCR_RECOGNIZE: 'ocr:recognize',

  // 设置相关
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // 桥接服务
  BRIDGE_STATUS: 'bridge:status',
  BRIDGE_RESTART: 'bridge:restart',
} as const;

/** 支持的开发者镜像 iOS 版本列表 */
export const DEVELOPER_IMAGE_VERSIONS = [
  '12.4', '12.5',
  '13.0', '13.1', '13.2', '13.3', '13.4', '13.5', '13.6', '13.7',
  '14.0', '14.1', '14.2', '14.3', '14.4', '14.5', '14.6', '14.7', '14.8',
  '15.0', '15.1', '15.2', '15.3', '15.4', '15.5', '15.6', '15.7', '15.8', '15.9',
  '16.0', '16.1', '16.2', '16.3', '16.4', '16.5', '16.6', '16.7',
  '17.0', '17.3',
  '18.0', '18.0-1',
  '26.0',
] as const;
