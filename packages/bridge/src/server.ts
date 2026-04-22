// HTTP 服务 (Fastify)

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { DeviceManager } from './services/device-manager';
import { AutomationService } from './services/automation';
import { ScreenStreamerService } from './services/screen-streamer';
import { ScriptRunnerService } from './services/script-runner';
import { OcrEngineService } from './services/ocr-engine';
import { registerDeviceRoutes } from './routes/device';
import { registerScreenRoutes } from './routes/screen';
import { registerScriptRoutes } from './routes/script';
import { registerFileRoutes } from './routes/file';
import { registerOcrRoutes } from './routes/ocr';
import { registerSettingsRoutes, onSettingsChange } from './routes/settings';
import { WsHub } from './ws/hub';

export interface BridgeServerOptions {
  port: number;
  scriptDir: string;
  ocrModelPath: string;
}

export class BridgeServer {
  private fastify: ReturnType<typeof Fastify>;
  private deviceManager: DeviceManager;
  private automationService: AutomationService;
  private screenService: ScreenStreamerService;
  private scriptRunner: ScriptRunnerService;
  private ocrEngine: OcrEngineService;
  private wsHub: WsHub;
  private options: BridgeServerOptions;

  constructor(options: BridgeServerOptions) {
    this.options = options;

    this.fastify = Fastify({
      logger: {
        level: 'warn',
        transport: {
          target: 'pino-pretty',
        },
      },
      bodyLimit: 3000 * 1024 * 1024, // 3000MB
    });

    // 初始化服务
    this.deviceManager = new DeviceManager();
    this.automationService = new AutomationService(this.deviceManager);
    this.screenService = new ScreenStreamerService();
    this.screenService.setDeviceManager(this.deviceManager);
    this.scriptRunner = new ScriptRunnerService(options.scriptDir);
    this.scriptRunner.setDeviceManager(this.deviceManager);
    this.ocrEngine = new OcrEngineService({
      engine: 'paddleocr',
      modelPath: options.ocrModelPath,
      useGpu: false,
    });

    this.wsHub = new WsHub();

    this.setupPlugins();
    this.setupRoutes();
    this.setupWsHandlers();
  }

  private async setupPlugins(): Promise<void> {
    await this.fastify.register(cors, { origin: true });
    await this.fastify.register(websocket);
    await this.fastify.register(multipart, {
      limits: { fileSize: 3000 * 1024 * 1024 },
    });
  }

  private setupRoutes(): void {
    // 健康检查
    this.fastify.get('/api/health', async () => {
      return { code: 0, data: { status: 'ok', timestamp: Date.now() }, msg: '' };
    });

    // 注册路由
    registerDeviceRoutes(this.fastify, this.deviceManager, this.automationService);
    registerScreenRoutes(this.fastify, this.screenService);
    registerScriptRoutes(this.fastify, this.scriptRunner);
    registerFileRoutes(this.fastify, this.deviceManager);
    registerOcrRoutes(this.fastify, this.ocrEngine);
    registerSettingsRoutes(this.fastify);
  }

  private setupWsHandlers(): void {
    // 投屏 WebSocket
    this.fastify.get('/api/screen/:udid/ws', { websocket: true }, (socket, req) => {
      const udid = (req.params as { udid: string }).udid;
      this.screenService.handleWsConnection(udid, socket);
    });
  }

  /** 启动服务 */
  async start(): Promise<void> {
    try {
      // 初始化 OCR 引擎（不阻塞启动）
      this.ocrEngine.initialize().then(ok => {
        if (ok) {
          console.log('[Bridge] OCR engine initialized');
        } else {
          console.warn('[Bridge] OCR engine initialization skipped (models not available)');
        }
      }).catch(err => {
        console.warn('[Bridge] OCR engine init error:', (err as Error).message);
      });

      // 监听设置变更，自动更新 OCR 引擎配置
      onSettingsChange((settings, changedKeys) => {
        if (changedKeys.some(k => k === 'ocrEngine' || k === 'ocrUseGpu')) {
          console.log('[Bridge] OCR settings changed, reinitializing...');
          this.ocrEngine.updateConfig({
            engine: settings.ocrEngine,
            useGpu: settings.ocrUseGpu,
            modelPath: this.options.ocrModelPath,
          });
          this.ocrEngine.initialize().catch(err => {
            console.warn('[Bridge] OCR reinit error:', (err as Error).message);
          });
        }
      });

      // 加载脚本
      this.scriptRunner.loadScripts();

      // 启动设备扫描
      await this.deviceManager.start();

      // 启动 HTTP 服务
      const address = await this.fastify.listen({ port: this.options.port, host: '0.0.0.0' });
      console.log(`[Bridge] Server listening on ${address}`);

      // 附加 WebSocket Hub 到 HTTP 服务器
      const httpServer = this.fastify.server;
      this.wsHub.attach(httpServer);
      console.log('[Bridge] WebSocket Hub attached');

      // 注册集控管理路由
      this.setupHubRoutes();
    } catch (err) {
      console.error('[Bridge] Failed to start:', err);
      throw err;
    }
  }

  /** 停止服务 */
  async stop(): Promise<void> {
    this.deviceManager.stop();
    this.wsHub.close();
    await this.fastify.close();
    console.log('[Bridge] Server stopped');
  }

  /** 获取设备管理器 */
  getDeviceManager(): DeviceManager {
    return this.deviceManager;
  }

  /** 获取自动化服务 */
  getAutomationService(): AutomationService {
    return this.automationService;
  }

  /** 设置集控管理路由 */
  private setupHubRoutes(): void {
    // GET /api/hub/nodes - 获取已连接的从控节点列表
    this.fastify.get('/api/hub/nodes', async () => {
      return { code: 0, data: { nodes: this.wsHub.getNodes(), total: this.wsHub.getNodeCount() }, msg: '' };
    });

    // POST /api/hub/command - 向从控节点发送命令
    this.fastify.post<{ Body: { nodeId?: string; command: string; params?: Record<string, unknown> } }>(
      '/api/hub/command',
      async (req) => {
        const { nodeId, command, params } = req.body;

        if (nodeId) {
          // 发送到指定节点
          const msgId = this.wsHub.sendCommand(nodeId, command, params ?? {});
          if (!msgId) {
            return { code: -1, data: null, msg: '节点不可达' };
          }
          return { code: 0, data: { msgId, nodeId }, msg: '' };
        }

        // 广播到所有节点
        const msgIds = this.wsHub.broadcastCommand(command, params ?? {});
        return { code: 0, data: { msgIds, count: msgIds.length }, msg: '' };
      },
    );

    // POST /api/hub/sync - 请求从控节点同步设备数据
    this.fastify.post<{ Body: { nodeId: string } }>('/api/hub/sync', async (req) => {
      const { nodeId } = req.body;
      const ok = this.wsHub.requestSync(nodeId);
      return { code: ok ? 0 : -1, data: { success: ok }, msg: ok ? '' : '节点不可达' };
    });
  }
}
