// API 请求/响应类型定义

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  msg: string;
}

/** 分页请求 */
export interface PaginationRequest {
  page: number;
  pageSize: number;
}

/** 分页响应 */
export interface PaginationResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============= 设备管理 API =============

export namespace DeviceAPI {
  /** GET /api/devices - 设备列表 */
  export type ListResponse = ApiResponse<{
    devices: import('./device').IOSDevice[];
    total: number;
  }>;

  /** POST /api/devices/:udid/pair - 设备配对 */
  export type PairRequest = { udid: string };
  export type PairResponse = ApiResponse<{ success: boolean; message: string }>;

  /** POST /api/devices/:udid/automation - 开启自动化 */
  export type StartAutomationRequest = {
    udid: string;
    options?: { wdaPort?: number; agentPort?: number };
  };
  export type StartAutomationResponse = ApiResponse<{ success: boolean; wdaPort: number }>;

  /** POST /api/devices/:udid/mount-image - 刷入开发者镜像 */
  export type MountImageRequest = { udid: string };
  export type MountImageResponse = ApiResponse<{ success: boolean; message: string }>;

  /** GET /api/devices/:udid/info - 设备详细信息 */
  export type DeviceInfoResponse = ApiResponse<import('./device').IOSDevice>;
}

// ============= 投屏 API =============

export namespace ScreenAPI {
  /** POST /api/screen/:udid/start - 启动投屏 */
  export type StartRequest = {
    udid: string;
    quality?: number;
    fps?: number;
  };
  export type StartResponse = ApiResponse<{
    wsUrl: string;
    width: number;
    height: number;
  }>;

  /** POST /api/screen/:udid/stop - 停止投屏 */
  export type StopRequest = { udid: string };
  export type StopResponse = ApiResponse<{ success: boolean }>;

  /** POST /api/screen/:udid/touch - 触控操作 */
  export type TouchRequest = {
    udid: string;
    action: 'tap' | 'swipe' | 'longpress';
    x: number;
    y: number;
    x2?: number;
    y2?: number;
    duration?: number;
  };
  export type TouchResponse = ApiResponse<{ success: boolean }>;
}

// ============= 脚本 API =============

export namespace ScriptAPI {
  /** GET /api/scripts - 脚本列表 */
  export type ListResponse = ApiResponse<{
    scripts: import('./script').Script[];
    total: number;
  }>;

  /** POST /api/scripts/:id/execute - 执行脚本 */
  export type ExecuteRequest = {
    scriptId: string;
    deviceUdids: string[];
    params?: Record<string, unknown>;
  };
  export type ExecuteResponse = ApiResponse<{
    executionIds: string[];
  }>;

  /** POST /api/scripts/:id/stop - 停止脚本 */
  export type StopRequest = {
    executionId: string;
  };
  export type StopResponse = ApiResponse<{ success: boolean }>;
}

// ============= 文件管理 API =============

export namespace FileAPI {
  /** POST /api/file/install-app - 安装 IPA */
  export type InstallAppRequest = {
    udid: string;
    ipaPath: string;
  };
  export type InstallAppResponse = ApiResponse<{ success: boolean; bundleId: string }>;

  /** POST /api/file/transfer - 文件传输 */
  export type TransferRequest = {
    udid: string;
    direction: 'upload' | 'download';
    localPath: string;
    remotePath: string;
  };
  export type TransferResponse = ApiResponse<{ success: boolean }>;

  /** GET /api/file/clipboard - 读取剪切板 */
  export type ClipboardResponse = ApiResponse<{ content: string }>;

  /** POST /api/file/clipboard - 写入剪切板 */
  export type SetClipboardRequest = { udid: string; content: string };
  export type SetClipboardResponse = ApiResponse<{ success: boolean }>;
}

// ============= OCR API =============

export namespace OcrAPI {
  /** POST /api/ocr/recognize - OCR 识别 */
  export type RecognizeRequest = {
    image: string; // base64 或文件路径
    engine?: 'paddleocr' | 'ocrlite';
    useGpu?: boolean;
  };
  export type RecognizeResponse = ApiResponse<{
    text: string;
    regions: Array<{
      text: string;
      confidence: number;
      box: [number, number, number, number];
    }>;
  }>;
}

// ============= 系统设置 API =============

export namespace SettingsAPI {
  /** GET /api/settings - 获取设置 */
  export type GetResponse = ApiResponse<AppSettings>;

  /** POST /api/settings - 更新设置 */
  export type UpdateRequest = Partial<AppSettings>;
  export type UpdateResponse = ApiResponse<{ success: boolean }>;
}

/** 应用配置 */
export interface AppSettings {
  /** 桥接服务端口 */
  bridgePort: number;
  /** 投屏质量 (1-100) */
  screenQuality: number;
  /** 投屏帧率 */
  screenFps: number;
  /** 自动刷入开发者镜像 */
  autoFlushDevImg: boolean;
  /** BundleID 前缀 */
  bundleIdPrefix: string;
  /** iOS17+ tunnel 模式 */
  ios17TunnelMode: 'admin' | 'user';
  /** 分布式中控地址 */
  remoteCenterUrl: string;
  /** OCR 引擎 */
  ocrEngine: 'paddleocr' | 'ocrlite';
  /** OCR GPU 模式 */
  ocrUseGpu: boolean;
  /** 设备扫描模式 */
  scanMode: 'listen' | 'scan' | 'both';
  /** 扫描间隔 (秒) */
  scanInterval: number;
}
