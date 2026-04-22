// 自动化环境管理 (WDA启动/代理IPA)

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import type { IOSDevice } from '@ios-control/shared';
import { AutomationStatus } from '@ios-control/shared';
import { WDA_PORT_START, WDA_PORT_END, AGENT_PORT_START, AGENT_PORT_END, ASSIST_APP_PORT } from '@ios-control/shared';
import type { DeviceManager } from './device-manager';
import { getToolPath, TOOLS, getIpaPath } from '../libimobile/utils';
import { installApp } from '../libimobile/ideviceinstaller';

/** 代理 IPA 通信协议 — 对齐 EasyClick /ecnb/ 规范 */
export const AGENT_API = {
  /** 健康检查 */
  HEALTH: '/ecnb/ping',
  /** 脚本执行 */
  SCRIPT_RUN: '/ecnb/script/run',
  /** 脚本状态 */
  SCRIPT_STATUS: '/ecnb/script/status',
  /** 脚本停止 */
  SCRIPT_STOP: '/ecnb/script/stop',
  /** 剪切板读取 */
  CLIPBOARD_READ: '/ecnb/clipboard/read',
  /** 剪切板写入 */
  CLIPBOARD_WRITE: '/ecnb/clipboard/write',
  /** 文件上传 */
  FILE_UPLOAD: '/ecnb/file/upload',
  /** 文件下载 */
  FILE_DOWNLOAD: '/ecnb/file/download',
  /** OCR 识别 (设备端) */
  OCR_RECOGNIZE: '/ecnb/ocr/recognize',
  /** 设备信息 */
  DEVICE_INFO: '/ecnb/device/info',
} as const;

/** 辅助 App 通信协议 */
export const ASSIST_API = {
  /** 扩展请求 (辅助功能/无障碍) */
  REQUEST_EX: '/devapi/requestEx',
} as const;

interface AutomationSession {
  udid: string;
  wdaPort: number;
  agentPort: number;
  assistPort: number;
  wdaProcess?: ChildProcess;
  agentProcess?: ChildProcess;
  tunnelProcess?: ChildProcess;
  status: AutomationStatus;
  startedAt: number;
}

export class AutomationService extends EventEmitter {
  private sessions: Map<string, AutomationSession> = new Map();
  private deviceManager: DeviceManager;
  private nextWdaPort = WDA_PORT_START;
  private nextAgentPort = AGENT_PORT_START;
  private nextAssistPort = ASSIST_APP_PORT;

  constructor(deviceManager: DeviceManager) {
    super();
    this.deviceManager = deviceManager;
  }

  /** 开启自动化环境 */
  async startAutomation(udid: string): Promise<{ success: boolean; wdaPort: number; agentPort: number; assistPort: number; message: string }> {
    if (this.sessions.has(udid)) {
      const session = this.sessions.get(udid)!;
      return { success: true, wdaPort: session.wdaPort, agentPort: session.agentPort, assistPort: session.assistPort, message: '自动化已在运行' };
    }

    const device = this.deviceManager.getDevice(udid);
    if (!device) {
      return { success: false, wdaPort: 0, agentPort: 0, assistPort: 0, message: '设备未找到' };
    }

    this.deviceManager.setAutomationStatus(udid, AutomationStatus.Starting);

    try {
      // 1. 刷入开发者镜像（如果未挂载）
      const mountResult = await this.deviceManager.mountDevImage(udid);
      if (!mountResult.success && !mountResult.message.includes('已挂载')) {
        console.warn(`[Automation] Mount image warning for ${udid}: ${mountResult.message}`);
      }

      // 2. iOS 17.4+ 需要 tunnel 模式
      const iosMajor = parseInt(device.iosVersion.split('.')[0], 10);
      if (iosMajor >= 17) {
        await this.startTunnelIfNeeded(udid, device);
      }

      // 3. 分配端口
      const wdaPort = this.allocateWdaPort();
      const agentPort = this.allocateAgentPort();
      const assistPort = this.allocateAssistPort();

      // 4. 安装并启动 WDA (WebDriverAgent)
      const wdaStarted = await this.startWDA(udid, wdaPort);
      if (!wdaStarted) {
        this.sessions.delete(udid); // 清理占位 session
        this.deviceManager.setAutomationStatus(udid, AutomationStatus.Error);
        return { success: false, wdaPort: 0, agentPort: 0, assistPort: 0, message: 'WDA 启动失败' };
      }

      // 5. 安装并启动代理 IPA
      const agentStarted = await this.startAgent(udid, agentPort, device);
      if (!agentStarted) {
        this.sessions.delete(udid); // 清理占位 session
        this.deviceManager.setAutomationStatus(udid, AutomationStatus.Error);
        return { success: false, wdaPort: 0, agentPort: 0, assistPort: 0, message: '代理 IPA 启动失败' };
      }

      const session: AutomationSession = {
        udid,
        wdaPort,
        agentPort,
        assistPort,
        status: AutomationStatus.Running,
        startedAt: Date.now(),
      };
      this.sessions.set(udid, session);
      this.deviceManager.setAutomationStatus(udid, AutomationStatus.Running);

      // 更新设备端口信息
      device.wdaPort = wdaPort;
      device.agentPort = agentPort;

      return { success: true, wdaPort, agentPort, assistPort, message: '自动化环境启动成功' };
    } catch (err) {
      this.deviceManager.setAutomationStatus(udid, AutomationStatus.Error);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, wdaPort: 0, agentPort: 0, assistPort: 0, message: msg };
    }
  }

  /** 停止自动化环境 */
  async stopAutomation(udid: string): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(udid);
    if (!session) {
      return { success: true, message: '自动化未在运行' };
    }

    try {
      // 停止 WDA 进程
      await this.stopWDA(udid, session);
      // 停止 Agent 进程
      await this.stopAgent(udid, session);

      this.sessions.delete(udid);
      this.deviceManager.setAutomationStatus(udid, AutomationStatus.None);

      const device = this.deviceManager.getDevice(udid);
      if (device) {
        device.wdaPort = 0;
        device.agentPort = 0;
      }

      return { success: true, message: '自动化环境已停止' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /** 测试自动化环境 */
  async testAutomation(udid: string): Promise<{ success: boolean; message: string; details: string }> {
    const session = this.sessions.get(udid);
    if (!session) {
      return { success: false, message: '自动化未启动', details: '' };
    }

    try {
      const wdaOk = await this.checkWDAHealth(session.wdaPort);
      if (!wdaOk) {
        return { success: false, message: 'WDA 服务无响应', details: `WDA port: ${session.wdaPort}` };
      }

      const agentOk = await this.checkAgentHealth(session.agentPort);
      if (!agentOk) {
        return { success: false, message: '代理 IPA 无响应', details: `Agent port: ${session.agentPort}` };
      }

      return { success: true, message: '自动化环境正常', details: `WDA: ${session.wdaPort}, Agent: ${session.agentPort}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: '检测失败', details: msg };
    }
  }

  /** 获取会话信息 */
  getSession(udid: string): AutomationSession | undefined {
    return this.sessions.get(udid);
  }

  /** 获取所有活跃会话 */
  getActiveSessions(): AutomationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === AutomationStatus.Running);
  }

  private allocateWdaPort(): number {
    const usedPorts = new Set(Array.from(this.sessions.values()).map(s => s.wdaPort));
    while (usedPorts.has(this.nextWdaPort)) {
      this.nextWdaPort++;
    }
    const port = this.nextWdaPort;
    this.nextWdaPort = this.nextWdaPort >= WDA_PORT_END ? WDA_PORT_START : this.nextWdaPort + 1;
    return port;
  }

  private allocateAgentPort(): number {
    const usedPorts = new Set(Array.from(this.sessions.values()).map(s => s.agentPort));
    while (usedPorts.has(this.nextAgentPort)) {
      this.nextAgentPort++;
    }
    const port = this.nextAgentPort;
    this.nextAgentPort = this.nextAgentPort >= AGENT_PORT_END ? AGENT_PORT_START : this.nextAgentPort + 1;
    return port;
  }

  /** 启动 WDA (WebDriverAgent) */
  private async startWDA(udid: string, port: number): Promise<boolean> {
    console.log(`[Automation] Starting WDA for ${udid} on port ${port}`);

    try {
      // 使用 idevicedebug 启动 WDA Runner
      const wdaBundleId = process.env.WDA_BUNDLE_ID ?? 'com.WebDriverAgentRunner';
      const toolPath = getToolPath('idevicedebug');

      if (fs.existsSync(toolPath)) {
        // 启动 WDA 进程
        const env = { ...process.env, WDA_PORT: String(port) };
        const proc = spawn(toolPath, [
          '-u', udid, 'run', wdaBundleId
        ], { env, stdio: 'pipe' });

        const session = this.sessions.get(udid);
        if (session) session.wdaProcess = proc;

        proc.stdout?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.log(`[WDA:${udid}] ${msg}`);
        });

        proc.stderr?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.error(`[WDA:${udid}] ${msg}`);
        });

        proc.on('exit', (code) => {
          console.log(`[WDA:${udid}] Process exited with code ${code}`);
          const s = this.sessions.get(udid);
          if (s) s.wdaProcess = undefined;
        });
      } else {
        console.warn(`[Automation] idevicedebug not found, WDA must be started manually`);
      }

      // 等待 WDA 服务就绪
      const maxRetries = 15;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const ok = await this.checkWDAHealth(port);
        if (ok) {
          console.log(`[Automation] WDA for ${udid} is ready on port ${port}`);
          return true;
        }
        console.log(`[Automation] Waiting for WDA... (${i + 1}/${maxRetries})`);
      }

      return false;
    } catch (err) {
      console.error(`[Automation] WDA start error:`, err);
      return false;
    }
  }

  /** 停止 WDA */
  private async stopWDA(udid: string, session: AutomationSession): Promise<void> {
    console.log(`[Automation] Stopping WDA for ${udid}`);
    if (session.wdaProcess && !session.wdaProcess.killed) {
      session.wdaProcess.kill('SIGTERM');
      // 给进程 5 秒时间优雅退出
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          session.wdaProcess?.kill('SIGKILL');
          resolve();
        }, 5000);
        session.wdaProcess?.on('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /** 安装并启动代理 IPA */
  private async startAgent(udid: string, port: number, device: IOSDevice): Promise<boolean> {
    console.log(`[Automation] Starting Agent for ${udid} on port ${port}`);

    try {
      // 查找代理 IPA 文件
      const ipaDir = getIpaPath();
      if (!fs.existsSync(ipaDir)) {
        console.warn(`[Automation] IPA directory not found: ${ipaDir}`);
        return false;
      }

      const ipaFiles = fs.readdirSync(ipaDir).filter(f => f.endsWith('.ipa'));
      if (ipaFiles.length === 0) {
        console.warn(`[Automation] No IPA files found in ${ipaDir}`);
        return false;
      }

      const ipaPath = path.join(ipaDir, ipaFiles[0]);

      // 安装 IPA
      const installResult = await installApp(udid, ipaPath);
      if (!installResult.success) {
        console.warn(`[Automation] IPA install failed: ${installResult.message}`);
        // 安装失败可能是已安装，继续尝试启动
      }

      // 通过 idevicedebug 启动代理 App
      const agentBundleId = process.env.AGENT_BUNDLE_ID ?? 'com.ioscontrol.agent';
      const toolPath = getToolPath('idevicedebug');

      // 预创建 session 占位，以便子进程可以写入
      let session = this.sessions.get(udid);
      if (!session) {
        session = {
          udid,
          wdaPort: 0,
          agentPort: port,
          assistPort: ASSIST_APP_PORT,
          status: AutomationStatus.Starting,
          startedAt: Date.now(),
        };
        this.sessions.set(udid, session);
      }

      if (fs.existsSync(toolPath)) {
        // iOS 15+ 以普通 App 方式启动，iOS < 15 通过 debug 启动
        const iosMajor = parseInt(device.iosVersion.split('.')[0], 10);
        const proc = spawn(toolPath, [
          '-u', udid, 'run', agentBundleId
        ], { stdio: 'pipe' });

        const session = this.sessions.get(udid);
        if (session) session.agentProcess = proc;

        proc.stdout?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.log(`[Agent:${udid}] ${msg}`);
        });

        proc.stderr?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.error(`[Agent:${udid}] ${msg}`);
        });

        proc.on('exit', (code) => {
          console.log(`[Agent:${udid}] Process exited with code ${code}`);
          const s = this.sessions.get(udid);
          if (s) s.agentProcess = undefined;
        });
      }

      // 检测代理是否就绪 — 使用 /ecnb/ping 协议
      const maxRetries = 10;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const ok = await this.checkAgentHealth(port);
        if (ok) {
          console.log(`[Automation] Agent for ${udid} is ready on port ${port}`);
          return true;
        }
        console.log(`[Automation] Waiting for Agent... (${i + 1}/${maxRetries})`);
      }

      // 所有健康检查失败，返回 false
      console.error(`[Automation] Agent health check failed after ${maxRetries} retries for ${udid}`);
      return false;
    } catch (err) {
      console.error(`[Automation] Agent start error:`, err);
      return false;
    }
  }

  /** 停止代理 IPA */
  private async stopAgent(udid: string, session: AutomationSession): Promise<void> {
    console.log(`[Automation] Stopping Agent for ${udid}`);
    if (session.agentProcess && !session.agentProcess.killed) {
      session.agentProcess.kill('SIGTERM');
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          session.agentProcess?.kill('SIGKILL');
          resolve();
        }, 5000);
        session.agentProcess?.on('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /** 检测 WDA 服务健康状态 */
  checkWDAHealth(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const req = http.get(`http://127.0.0.1:${port}/status`, { timeout: 3000 }, res => {
        resolve(res.statusCode === 200);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  /** 检测代理 IPA 服务健康状态 — 使用 /ecnb/ping 协议 */
  checkAgentHealth(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const req = http.get(`http://127.0.0.1:${port}${AGENT_API.HEALTH}`, { timeout: 3000 }, res => {
        resolve(res.statusCode === 200);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  /** 通过代理 IPA 发送请求 (/ecnb/ 协议) */
  async agentRequest(port: number, endpoint: string, body?: Record<string, unknown>): Promise<{ ok: boolean; data?: any }> {
    try {
      const url = `http://127.0.0.1:${port}${endpoint}`;
      const opts: RequestInit = {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      };
      const res = await fetch(url, opts);
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return { ok: true, data };
    } catch {
      return { ok: false };
    }
  }

  /** 通过辅助 App 发送请求 (/devapi/requestEx) */
  async assistRequest(port: number, body: Record<string, unknown>): Promise<{ ok: boolean; data?: any }> {
    try {
      const url = `http://127.0.0.1:${port}${ASSIST_API.REQUEST_EX}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return { ok: true, data };
    } catch {
      return { ok: false };
    }
  }

  /** 启动 iOS 17+ tunnel 模式 (CoreDevice) */
  private async startTunnelIfNeeded(udid: string, device: IOSDevice): Promise<void> {
    const iosMajor = parseInt(device.iosVersion.split('.')[0], 10);
    if (iosMajor < 17) return;

    const tunnelTool = getToolPath('idevicedebug');
    // iOS 17.4+ 需要 tunnel 服务 (通过 CoreDevice 协议)
    // 实际上需要 Apple 的 devicetool 或 pymobiledevice3 的隧道
    console.log(`[Automation] iOS ${device.iosVersion} detected, tunnel mode may be required`);

    // 检查是否已有 tunnel 进程在运行
    const existingSession = this.sessions.get(udid);
    if (existingSession?.tunnelProcess) return;

    // 尝试使用 idevicedebug 的 tunnel 模式 (需要 libimobiledevice 1.3+)
    if (fs.existsSync(tunnelTool)) {
      try {
        const proc = spawn(tunnelTool, [
          '-u', udid, 'tunnel', 'start'
        ], { stdio: 'pipe' });

        proc.stdout?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.log(`[Tunnel:${udid}] ${msg}`);
        });

        proc.stderr?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.error(`[Tunnel:${udid}] ${msg}`);
        });

        proc.on('exit', (code) => {
          console.log(`[Tunnel:${udid}] Process exited with code ${code}`);
          const s = this.sessions.get(udid);
          if (s) s.tunnelProcess = undefined;
        });

        const session = this.sessions.get(udid);
        if (session) session.tunnelProcess = proc;

        // 等待 tunnel 就绪
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.warn(`[Automation] Tunnel start failed (may not be needed):`, err);
      }
    }
  }

  private allocateAssistPort(): number {
    // 辅助 App 端口暂时固定
    return ASSIST_APP_PORT;
  }

  /** 清理所有会话 */
  async cleanup(): Promise<void> {
    for (const [udid, session] of this.sessions) {
      await this.stopWDA(udid, session);
      await this.stopAgent(udid, session);
      if (session.tunnelProcess && !session.tunnelProcess.killed) {
        session.tunnelProcess.kill('SIGTERM');
      }
    }
    this.sessions.clear();
  }
}
