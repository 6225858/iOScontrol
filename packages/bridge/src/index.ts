// 桥接服务入口

import { BridgeServer } from './server';
import { DEFAULT_BRIDGE_PORT } from '@ios-control/shared';
import * as path from 'path';

const port = parseInt(process.env.BRIDGE_PORT ?? String(DEFAULT_BRIDGE_PORT), 10);
const scriptDir = process.env.SCRIPT_DIR ?? path.join(process.cwd(), 'dataConfig', 'script');
const ocrModelPath = process.env.OCR_MODEL_PATH ?? path.join(process.cwd(), 'resources', 'ocr-models');

const server = new BridgeServer({ port, scriptDir, ocrModelPath });

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('[Bridge] Received SIGINT, shutting down...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Bridge] Received SIGTERM, shutting down...');
  await server.stop();
  process.exit(0);
});

// 启动
server.start().catch(err => {
  console.error('[Bridge] Fatal error:', err);
  process.exit(1);
});

export { BridgeServer } from './server';
export { DeviceManager } from './services/device-manager';
export { AutomationService } from './services/automation';
export { ScreenStreamerService } from './services/screen-streamer';
export { ScriptRunnerService } from './services/script-runner';
export { OcrEngineService } from './services/ocr-engine';
export { WsHub } from './ws/hub';
