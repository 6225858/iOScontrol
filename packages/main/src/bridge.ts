// 桥接服务子进程管理

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { DEFAULT_BRIDGE_PORT, BRIDGE_MAX_RESTART, BRIDGE_RESTART_COOLDOWN } from '@ios-control/shared';

export class BridgeProcess {
  private process: ChildProcess | null = null;
  private restartCount = 0;
  private lastRestartTime = 0;
  private port: number;
  private running = false;

  constructor(port = DEFAULT_BRIDGE_PORT) {
    this.port = port;
  }

  /** 启动桥接服务 */
  start(): void {
    if (this.running && this.process) return;

    const bridgeScript = this.getBridgeScriptPath();
    const env = {
      ...process.env,
      BRIDGE_PORT: String(this.port),
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      RESOURCES_PATH: this.getResourcesPath(),
    };

    this.process = spawn(process.execPath, [bridgeScript], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      console.log(`[Bridge] ${data.toString().trim()}`);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[Bridge] ${data.toString().trim()}`);
    });

    this.process.on('exit', (code) => {
      console.log(`[Bridge] Process exited with code ${code}`);
      this.running = false;
      this.process = null;

      // 自动重启
      if (code !== 0 && this.shouldRestart()) {
        this.scheduleRestart();
      }
    });

    this.process.on('error', (err) => {
      console.error(`[Bridge] Process error:`, err);
      this.running = false;
    });

    this.running = true;
    console.log(`[Bridge] Started on port ${this.port}`);
  }

  /** 停止桥接服务 */
  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.running = false;
  }

  /** 重启桥接服务 */
  restart(): void {
    this.stop();
    this.restartCount = 0;
    this.start();
  }

  /** 是否运行中 */
  isRunning(): boolean {
    return this.running;
  }

  private shouldRestart(): boolean {
    const now = Date.now();
    const timeSinceLastRestart = now - this.lastRestartTime;

    // 冷却期内不重启
    if (timeSinceLastRestart < BRIDGE_RESTART_COOLDOWN) {
      return false;
    }

    return this.restartCount < BRIDGE_MAX_RESTART;
  }

  private scheduleRestart(): void {
    this.restartCount++;
    this.lastRestartTime = Date.now();
    console.log(`[Bridge] Restarting in ${BRIDGE_RESTART_COOLDOWN / 1000}s (attempt ${this.restartCount}/${BRIDGE_MAX_RESTART})`);

    setTimeout(() => {
      if (!this.running) {
        this.start();
      }
    }, BRIDGE_RESTART_COOLDOWN);
  }

  private getBridgeScriptPath(): string {
    // 开发环境
    if (process.env.NODE_ENV === 'development') {
      return path.resolve(process.cwd(), 'packages', 'bridge', 'src', 'index.ts');
    }
    // 生产环境
    return path.join(this.getResourcesPath(), 'bridge', 'index.js');
  }

  private getResourcesPath(): string {
    if (process.resourcesPath) {
      return process.resourcesPath;
    }
    return path.resolve(process.cwd(), 'resources');
  }
}
