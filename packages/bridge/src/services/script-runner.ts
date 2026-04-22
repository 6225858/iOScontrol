// 脚本执行引擎

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { Script, ScriptExecution, ScriptStatus, ScheduledTask } from '@ios-control/shared';
import { ScriptStatus as ScriptStatusEnum } from '@ios-control/shared';
import { AGENT_API } from './automation';
import type { DeviceManager } from './device-manager';

interface RunningExecution {
  execution: ScriptExecution;
  process?: ChildProcess;
  abortController: AbortController;
}

export class ScriptRunnerService extends EventEmitter {
  private scripts: Map<string, Script> = new Map();
  private executions: Map<string, RunningExecution> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();
  private scriptDir: string;
  private deviceManager: DeviceManager | null = null;

  constructor(scriptDir: string) {
    super();
    this.scriptDir = scriptDir;
    this.ensureScriptDir();
  }

  /** 注入 DeviceManager 依赖 */
  setDeviceManager(dm: DeviceManager): void {
    this.deviceManager = dm;
  }

  /** 获取设备代理端口 */
  private getAgentPort(udid: string): number {
    if (this.deviceManager) {
      const device = this.deviceManager.getDevice(udid);
      if (device?.agentPort) return device.agentPort;
    }
    return parseInt(process.env.AGENT_PORT ?? '19402', 10);
  }

  private ensureScriptDir(): void {
    if (!fs.existsSync(this.scriptDir)) {
      fs.mkdirSync(this.scriptDir, { recursive: true });
    }
  }

  /** 加载脚本目录 */
  loadScripts(): Script[] {
    this.scripts.clear();

    if (!fs.existsSync(this.scriptDir)) return [];

    const files = fs.readdirSync(this.scriptDir, { recursive: true });
    for (const file of files) {
      const filePath = file.toString();
      if (filePath.endsWith('.iec') || filePath.endsWith('.js')) {
        const script = this.parseScript(filePath);
        if (script) {
          this.scripts.set(script.id, script);
        }
      }
    }

    return Array.from(this.scripts.values());
  }

  /** 获取脚本列表 */
  getScripts(): Script[] {
    return Array.from(this.scripts.values());
  }

  /** 执行脚本 */
  async executeScript(
    scriptId: string,
    deviceUdids: string[],
    params?: Record<string, unknown>
  ): Promise<string[]> {
    const script = this.scripts.get(scriptId);
    if (!script) {
      throw new Error(`脚本未找到: ${scriptId}`);
    }

    const executionIds: string[] = [];

    for (const udid of deviceUdids) {
      const executionId = `${scriptId}_${udid}_${Date.now()}`;
      const execution: ScriptExecution = {
        id: executionId,
        scriptId,
        deviceUdid: udid,
        status: ScriptStatusEnum.Running,
        params: params ?? {},
        startedAt: Date.now(),
        completedAt: null,
        logs: [],
      };

      const abortController = new AbortController();
      const running: RunningExecution = { execution, abortController };
      this.executions.set(executionId, running);
      executionIds.push(executionId);

      // 异步执行
      this.runExecution(running, script).catch(() => {
        execution.status = ScriptStatusEnum.Failed;
      });
    }

    return executionIds;
  }

  /** 停止脚本执行 */
  async stopExecution(executionId: string): Promise<boolean> {
    const running = this.executions.get(executionId);
    if (!running) return false;

    running.abortController.abort();

    // 终止子进程
    if (running.process && !running.process.killed) {
      running.process.kill('SIGTERM');
    }

    running.execution.status = ScriptStatusEnum.Paused;
    running.execution.completedAt = Date.now();
    return true;
  }

  /** 获取执行状态 */
  getExecution(executionId: string): ScriptExecution | undefined {
    return this.executions.get(executionId)?.execution;
  }

  /** 获取所有执行记录 */
  getExecutions(): ScriptExecution[] {
    return Array.from(this.executions.values()).map(r => r.execution);
  }

  /** 添加定时任务 */
  addScheduledTask(task: ScheduledTask): void {
    // 清除旧的定时器
    const oldTimer = this.scheduledTimers.get(task.id);
    if (oldTimer) {
      clearInterval(oldTimer);
    }

    this.scheduledTasks.set(task.id, task);

    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  /** 删除定时任务 */
  removeScheduledTask(taskId: string): void {
    const timer = this.scheduledTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.scheduledTimers.delete(taskId);
    }
    this.scheduledTasks.delete(taskId);
  }

  /** 获取定时任务列表 */
  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /** 调度定时任务执行 */
  private scheduleTask(task: ScheduledTask): void {
    // 简单的 cron 解析：支持每分钟/每小时/每天格式
    const interval = this.parseCronToInterval(task.cron);
    if (interval <= 0) return;

    const timer = setInterval(async () => {
      if (!task.enabled) return;

      const now = Date.now();
      task.lastRunAt = now;

      // 确定目标设备
      let targetUdids = task.targetDevices;
      if (targetUdids.length === 0 && task.targetGroup) {
        // 如果指定了分组，从设备管理器获取（需要注入）
        targetUdids = [];
      }

      if (targetUdids.length === 0) {
        // 无目标设备，跳过
        return;
      }

      try {
        await this.executeScript(task.scriptId, targetUdids);
        task.nextRunAt = Date.now() + interval;
      } catch (err) {
        console.error(`[ScriptRunner] Scheduled task ${task.id} execution failed:`, err);
      }
    }, interval);

    this.scheduledTimers.set(task.id, timer);
    task.nextRunAt = Date.now() + interval;
  }

  /** 简单 cron 表达式转间隔（毫秒） */
  private parseCronToInterval(cron: string): number {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return 0;

    // 简化解析：仅支持固定间隔格式
    // * * * * * = 每分钟 = 60000ms
    // */5 * * * * = 每5分钟 = 300000ms
    // 0 * * * * = 每小时 = 3600000ms
    // 0 0 * * * = 每天 = 86400000ms

    const minute = parts[0];
    const hour = parts[1];

    if (minute.startsWith('*/')) {
      const n = parseInt(minute.slice(2), 10);
      return n * 60000;
    }
    if (minute === '*' && hour === '*') return 60000;
    if (minute === '0' && hour === '*') return 3600000;
    if (minute === '0' && hour === '0') return 86400000;

    // 默认每分钟
    return 60000;
  }

  /** 解析脚本文件 */
  private parseScript(filePath: string): Script | null {
    const fullPath = path.join(this.scriptDir, filePath);
    if (!fs.existsSync(fullPath)) return null;

    try {
      const stat = fs.statSync(fullPath);
      const name = path.basename(filePath, path.extname(filePath));

      // 尝试从脚本文件读取参数定义
      const params = this.parseScriptParams(fullPath);

      return {
        id: Buffer.from(fullPath).toString('base64url').slice(0, 16),
        name,
        filePath: fullPath,
        params,
        groupId: '',
        lastExecutedAt: null,
        executionCount: 0,
        createdAt: stat.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  /** 从脚本文件中解析参数定义 */
  private parseScriptParams(filePath: string): Script['params'] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // 尝试解析 JSON 格式的参数定义（脚本开头注释中）
      const paramMatch = content.match(/\/\*\s*params\s*:\s*([\s\S]*?)\*\//);
      if (paramMatch) {
        try {
          return JSON.parse(paramMatch[1]);
        } catch {
          // JSON 解析失败，返回空
        }
      }

      // 查找 .params.json 伴生文件
      const paramFile = filePath.replace(/\.(iec|js)$/, '.params.json');
      if (fs.existsSync(paramFile)) {
        return JSON.parse(fs.readFileSync(paramFile, 'utf-8'));
      }
    } catch {
      // 忽略
    }

    return [];
  }

  /** 执行脚本 - 通过桥接服务向设备代理发送脚本 */
  private async runExecution(
    running: RunningExecution,
    script: Script,
  ): Promise<void> {
    const { execution, abortController } = running;
    execution.logs.push(`[${new Date().toISOString()}] 开始执行脚本: ${script.name}`);
    execution.logs.push(`[${new Date().toISOString()}] 目标设备: ${execution.deviceUdid}`);
    execution.logs.push(`[${new Date().toISOString()}] 脚本路径: ${script.filePath}`);

    try {
      // 方案1: 如果是 .js 脚本，使用 Node.js 子进程执行
      if (script.filePath.endsWith('.js')) {
        await this.executeJsScript(running, script);
      }
      // 方案2: 如果是 .iec 脚本，通过代理 IPA 执行
      else if (script.filePath.endsWith('.iec')) {
        await this.executeIecScript(running, script);
      }
      // 方案3: 未知格式，标记为不支持
      else {
        execution.status = ScriptStatusEnum.Failed;
        execution.error = `不支持的脚本格式: ${path.extname(script.filePath)}`;
        execution.logs.push(`[${new Date().toISOString()}] 错误: ${execution.error}`);
      }

      if (execution.status === ScriptStatusEnum.Running) {
        execution.status = ScriptStatusEnum.Completed;
        execution.completedAt = Date.now();
        execution.logs.push(`[${new Date().toISOString()}] 脚本执行完成`);
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        execution.status = ScriptStatusEnum.Paused;
        execution.logs.push(`[${new Date().toISOString()}] 脚本执行已停止`);
      } else {
        execution.status = ScriptStatusEnum.Failed;
        execution.error = err instanceof Error ? err.message : String(err);
        execution.logs.push(`[${new Date().toISOString()}] 脚本执行失败: ${execution.error}`);
      }
      execution.completedAt = Date.now();
    }

    // 更新脚本统计
    script.lastExecutedAt = Date.now();
    script.executionCount++;

    this.emit('execution:completed', execution);
  }

  /** 执行 .js 脚本 (Node.js 子进程) */
  private executeJsScript(running: RunningExecution, script: Script): Promise<void> {
    return new Promise((resolve, reject) => {
      const { execution, abortController } = running;

      const env = {
        ...process.env,
        DEVICE_UDID: execution.deviceUdid,
        SCRIPT_PARAMS: JSON.stringify(execution.params),
      };

      const proc = spawn(process.execPath, [script.filePath], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(script.filePath),
      });

      running.process = proc;

      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          execution.logs.push(`[${new Date().toISOString()}] ${line}`);
        }
        this.emit('execution:log', execution.id, lines);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          execution.logs.push(`[${new Date().toISOString()}] [ERR] ${line}`);
        }
      });

      abortController.signal.addEventListener('abort', () => {
        proc.kill('SIGTERM');
      });

      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else if (abortController.signal.aborted) {
          resolve(); // 已取消，不视为错误
        } else {
          reject(new Error(`脚本进程退出码: ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  /** 执行 .iec 脚本 (通过代理 IPA — /ecnb/ 协议) */
  private async executeIecScript(running: RunningExecution, script: Script): Promise<void> {
    const { execution, abortController } = running;

    execution.logs.push(`[${new Date().toISOString()}] 通过代理 IPA 执行 IEC 脚本...`);

    // 从设备管理器获取设备的代理端口
    const agentPort = this.getAgentPort(execution.deviceUdid);

    // 读取脚本内容
    const scriptContent = fs.readFileSync(script.filePath, 'utf-8');

    const controller = new AbortController();
    abortController.signal.addEventListener('abort', () => controller.abort());

    // 通过 /ecnb/script/run 协议提交脚本执行
    const response = await fetch(`http://127.0.0.1:${agentPort}${AGENT_API.SCRIPT_RUN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: scriptContent,
        scriptName: script.name,
        deviceUdid: execution.deviceUdid,
        params: execution.params,
      }),
      signal: controller.signal,
    }).catch(() => null);

    if (!response?.ok) {
      throw new Error(`代理 IPA 脚本执行请求失败: ${response?.statusText ?? '连接失败'}`);
    }

    const runResult = await response.json() as { taskId?: string; status?: string };
    const taskId = runResult.taskId ?? '';

    // 轮询执行状态 — 通过 /ecnb/script/status
    const maxWait = 3600000; // 1 小时超时
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (abortController.signal.aborted) {
        throw new Error('执行已取消');
      }

      await new Promise(r => setTimeout(r, 2000));

      const statusRes = await fetch(`http://127.0.0.1:${agentPort}${AGENT_API.SCRIPT_STATUS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, deviceUdid: execution.deviceUdid }),
      }).catch(() => null);

      if (statusRes?.ok) {
        const status = await statusRes.json() as { status: string; log?: string; progress?: number };
        if (status.log) {
          execution.logs.push(`[${new Date().toISOString()}] ${status.log}`);
        }
        if (status.status === 'completed' || status.status === 'finished') {
          return;
        }
        if (status.status === 'failed' || status.status === 'error') {
          throw new Error(`代理 IPA 报告脚本执行失败`);
        }
      }
    }

    throw new Error('脚本执行超时');
  }
}
