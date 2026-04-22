// 投屏流管理 (帧捕获/分发)

import { EventEmitter } from 'events';
import * as http from 'http';
import { execFile } from 'child_process';
import type { IOSDevice } from '@ios-control/shared';
import { getToolPath, TOOLS } from '../libimobile/utils';
import { captureFrameNative, isNativeAvailable, initNativeCapture } from '../native';
import type { DeviceManager } from './device-manager';

interface ScreenSession {
  udid: string;
  ws: any;
  quality: number;
  fps: number;
  width: number;
  height: number;
  running: boolean;
  lastFrameTime: number;
  frameCount: number;
  lastFrameData: Buffer | null;
  frameTimer: NodeJS.Timeout | null;
}

export class ScreenStreamerService extends EventEmitter {
  private sessions: Map<string, ScreenSession> = new Map();
  private deviceManager: DeviceManager | null = null;

  /** 注入 DeviceManager 依赖 */
  setDeviceManager(dm: DeviceManager): void {
    this.deviceManager = dm;
  }

  /** 启动投屏 */
  async startScreen(udid: string, options: { quality?: number; fps?: number }): Promise<{
    wsUrl: string;
    width: number;
    height: number;
  }> {
    if (this.sessions.has(udid)) {
      const session = this.sessions.get(udid)!;
      return { wsUrl: this.buildWsUrl(udid), width: session.width, height: session.height };
    }

    const quality = options.quality ?? 50;
    const fps = options.fps ?? 60;

    // 获取设备屏幕分辨率
    const { width, height } = await this.getDeviceScreenSize(udid);

    const session: ScreenSession = {
      udid,
      ws: null,
      quality,
      fps,
      width,
      height,
      running: false,
      lastFrameTime: 0,
      frameCount: 0,
      lastFrameData: null,
      frameTimer: null,
    };

    this.sessions.set(udid, session);

    return { wsUrl: this.buildWsUrl(udid), width, height };
  }

  /** 停止投屏 */
  async stopScreen(udid: string): Promise<boolean> {
    const session = this.sessions.get(udid);
    if (!session) return true;

    session.running = false;
    if (session.frameTimer) {
      clearInterval(session.frameTimer);
      session.frameTimer = null;
    }
    this.sessions.delete(udid);
    this.emit('screen:stopped', udid);
    return true;
  }

  /** 处理投屏 WebSocket 连接 */
  handleWsConnection(udid: string, ws: any): void {
    const session = this.sessions.get(udid);
    if (!session) {
      ws.close(4004, 'Screen session not found');
      return;
    }

    session.ws = ws;
    session.running = true;

    ws.on('close', () => {
      session.running = false;
      session.ws = null;
      if (session.frameTimer) {
        clearInterval(session.frameTimer);
        session.frameTimer = null;
      }
    });

    ws.on('message', (data: Buffer) => {
      this.handleClientMessage(udid, data);
    });

    // 开始帧捕获循环
    this.startFrameCapture(session);
  }

  /** 发送触控操作到设备 (通过 WDA) */
  async sendTouch(udid: string, action: string, params: Record<string, number>): Promise<boolean> {
    const device = this.getDevice(udid);
    if (!device || !device.wdaPort) return false;

    try {
      // 先创建 WDA session
      const sessionId = await this.ensureWDASession(device.wdaPort);
      if (!sessionId) return false;

      const url = `http://127.0.0.1:${device.wdaPort}/session/${sessionId}/actions`;
      const body = this.buildWdaTouchPayload(action, params);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null);

      return response?.ok ?? false;
    } catch {
      return false;
    }
  }

  /** 获取会话信息 */
  getSession(udid: string): ScreenSession | undefined {
    return this.sessions.get(udid);
  }

  /** 获取所有活跃会话 */
  getActiveSessions(): ScreenSession[] {
    return Array.from(this.sessions.values()).filter(s => s.running);
  }

  private buildWsUrl(udid: string): string {
    return `/api/screen/${udid}/ws`;
  }

  /** 开始帧捕获循环 */
  private startFrameCapture(session: ScreenSession): void {
    const interval = Math.max(16, Math.floor(1000 / session.fps)); // 至少 16ms 间隔

    // 使用 setInterval 替代递归 setTimeout，更稳定
    session.frameTimer = setInterval(async () => {
      if (!session.running || !session.ws) return;
      if (session.ws.readyState !== 1) return; // WebSocket.OPEN = 1

      try {
        const frame = await this.captureFrame(session.udid, session.quality);
        if (frame) {
          // 帧差异检测：如果帧数据与上一帧相同，跳过发送
          if (session.lastFrameData && frame.equals(session.lastFrameData)) {
            return;
          }
          session.lastFrameData = frame;

          session.ws.send(frame);
          session.frameCount++;
          session.lastFrameTime = Date.now();
        }
      } catch (err) {
        console.error(`[ScreenStreamer] Frame capture error for ${session.udid}:`, err);
      }
    }, interval);
  }

  /** 确保 WDA Session 存在 */
  private wdaSessions: Map<number, string> = new Map();

  private async ensureWDASession(wdaPort: number): Promise<string | null> {
    if (this.wdaSessions.has(wdaPort)) {
      return this.wdaSessions.get(wdaPort)!;
    }

    try {
      const res = await fetch(`http://127.0.0.1:${wdaPort}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilities: {} }),
      });
      const data = await res.json() as { value: { sessionId: string } };
      if (data.value?.sessionId) {
        this.wdaSessions.set(wdaPort, data.value.sessionId);
        return data.value.sessionId;
      }
    } catch {
      // fallback: 尝试使用无 session 的 API
    }
    return null;
  }

  /** 捕获一帧 */
  private async captureFrame(udid: string, quality: number): Promise<Buffer | null> {
    // 方案0: 通过 C++ Native Addon 直接 USB 帧捕获 (最低延迟)
    if (isNativeAvailable()) {
      try {
        const frame = await captureFrameNative(udid);
        if (frame && frame.length > 0) {
          return frame;
        }
      } catch {
        // Native 捕获失败，降级到 WDA
      }
    }

    // 方案1: 通过 WDA screenshot API 获取截图
    const device = this.getDevice(udid);
    if (device?.wdaPort) {
      try {
        const response = await fetch(`http://127.0.0.1:${device.wdaPort}/screenshot`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json() as { value: string };
          if (data.value) {
            return Buffer.from(data.value, 'base64');
          }
        }
      } catch {
        // WDA 截图失败，尝试方案2
      }
    }

    // 方案2: 通过 idevicescreenshot 命令行工具
    try {
      const toolPath = getToolPath(TOOLS.IDEVICE_SCREENSHOT);
      const tmpPath = `/tmp/ioscontrol_screen_${udid}_${Date.now()}.png`;

      await new Promise<void>((resolve, reject) => {
        execFile(toolPath, ['-u', udid, tmpPath], { timeout: 5000 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      const fs = await import('fs');
      if (fs.existsSync(tmpPath)) {
        const data = fs.readFileSync(tmpPath);
        fs.unlinkSync(tmpPath); // 清理临时文件
        return data;
      }
    } catch {
      // 命令行截图也失败
    }

    return null;
  }

  /** 获取设备屏幕尺寸 */
  private async getDeviceScreenSize(udid: string): Promise<{ width: number; height: number }> {
    const device = this.getDevice(udid);
    if (device?.wdaPort) {
      try {
        const response = await fetch(`http://127.0.0.1:${device.wdaPort}/window/size`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json() as { value: { width: number; height: number } };
          if (data.value) {
            return data.value;
          }
        }
      } catch {
        // 忽略错误，使用默认值
      }
    }

    // 默认 iPhone 分辨率
    return { width: 1170, height: 2532 };
  }

  /** 处理客户端消息 (触控/键盘事件) */
  private handleClientMessage(udid: string, data: Buffer): void {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'touch') {
        this.sendTouch(udid, msg.action, msg.params);
      } else if (msg.type === 'key') {
        this.sendKeyEvent(udid, msg.key);
      }
    } catch {
      // 忽略解析错误
    }
  }

  /** 发送键盘事件 */
  private async sendKeyEvent(udid: string, key: string): Promise<void> {
    const device = this.getDevice(udid);
    if (!device?.wdaPort) return;

    const sessionId = await this.ensureWDASession(device.wdaPort);
    if (!sessionId) return;

    await fetch(`http://127.0.0.1:${device.wdaPort}/session/${sessionId}/wda/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: [key] }),
    }).catch(() => null);
  }

  /** 构建 WDA 触控操作 payload */
  private buildWdaTouchPayload(action: string, params: Record<string, number>): Record<string, unknown> {
    switch (action) {
      case 'tap':
        return {
          actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: params.x, y: params.y },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: 50 },
              { type: 'pointerUp', button: 0 },
            ],
          }],
        };
      case 'swipe':
        return {
          actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: params.x, y: params.y },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerMove', duration: params.duration ?? 300, x: params.x2, y: params.y2 },
              { type: 'pointerUp', button: 0 },
            ],
          }],
        };
      case 'longpress':
        return {
          actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: params.x, y: params.y },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: params.duration ?? 1000 },
              { type: 'pointerUp', button: 0 },
            ],
          }],
        };
      default:
        return {};
    }
  }

  private getDevice(udid: string): IOSDevice | null {
    return this.deviceManager?.getDevice(udid) ?? null;
  }

  /** 清理所有会话 */
  async cleanup(): Promise<void> {
    for (const [udid, session] of this.sessions) {
      session.running = false;
      if (session.frameTimer) {
        clearInterval(session.frameTimer);
      }
      if (session.ws) {
        session.ws.close();
      }
    }
    this.sessions.clear();
    this.wdaSessions.clear();
  }
}
