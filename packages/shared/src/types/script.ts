// 脚本相关类型定义

/** 脚本执行状态 */
export enum ScriptStatus {
  Idle = 'idle',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
}

/** 脚本信息 */
export interface Script {
  id: string;
  name: string;
  /** 脚本文件路径 (.iec) */
  filePath: string;
  /** 脚本参数 */
  params: ScriptParam[];
  /** 所属分组 */
  groupId: string;
  /** 最后执行时间 */
  lastExecutedAt: number | null;
  /** 执行次数 */
  executionCount: number;
  /** 创建时间 */
  createdAt: number;
}

/** 脚本参数 */
export interface ScriptParam {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue: string | number | boolean;
  options?: { label: string; value: string }[];
  required: boolean;
}

/** 脚本执行记录 */
export interface ScriptExecution {
  id: string;
  scriptId: string;
  deviceUdid: string;
  status: ScriptStatus;
  params: Record<string, unknown>;
  startedAt: number;
  completedAt: number | null;
  logs: string[];
  error?: string;
}

/** 定时任务 */
export interface ScheduledTask {
  id: string;
  scriptId: string;
  /** cron 表达式 */
  cron: string;
  /** 目标设备 UDID 列表，空表示全部 */
  targetDevices: string[];
  /** 目标分组 ID，空表示全部 */
  targetGroup: string;
  enabled: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  createdAt: number;
}
