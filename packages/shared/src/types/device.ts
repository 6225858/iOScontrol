// 设备相关类型定义

/** 设备在线状态 */
export enum DeviceStatus {
  Offline = 'offline',
  Online = 'online',
  Connected = 'connected',
}

/** 自动化状态 */
export enum AutomationStatus {
  None = 'none',
  Starting = 'starting',
  Running = 'running',
  Error = 'error',
}

/** iOS 设备信息 */
export interface IOSDevice {
  /** 设备 UDID */
  udid: string;
  /** 设备型号 (如 iPhone14,2) */
  deviceType: string;
  /** 设备产品名称 (如 iPhone 13 Pro) */
  productName: string;
  /** iOS 版本 */
  iosVersion: string;
  /** 设备名称 */
  deviceName: string;
  /** 在线状态 */
  status: DeviceStatus;
  /** 自动化状态 */
  automationStatus: AutomationStatus;
  /** WDA 端口 (0 表示未启动) */
  wdaPort: number;
  /** 代理 IPA 端口 */
  agentPort: number;
  /** 设备分组 ID */
  groupId: string;
  /** 连接方式 (USB/WiFi) */
  connectionType: 'usb' | 'wifi';
  /** 首次发现时间 */
  firstSeenAt: number;
  /** 最后在线时间 */
  lastSeenAt: number;
}

/** 设备分组 */
export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  deviceCount: number;
  createdAt: number;
}

/** 设备配对状态 */
export enum PairState {
  NotPaired = 'not_paired',
  Paired = 'paired',
  Pairing = 'pairing',
  Error = 'error',
}

/** 开发者镜像版本信息 */
export interface DeveloperImageInfo {
  iosVersion: string;
  imagePath: string;
  signaturePath: string;
  mounted: boolean;
}
