// 投屏控制 API 路由

import type { FastifyInstance } from 'fastify';
import type { ScreenStreamerService } from '../services/screen-streamer';

export function registerScreenRoutes(
  app: FastifyInstance,
  screenService: ScreenStreamerService
): void {
  // POST /api/screen/:udid/start - 启动投屏
  app.post<{ Params: { udid: string }; Body: { quality?: number; fps?: number } }>(
    '/api/screen/:udid/start',
    async (req, reply) => {
      const { udid } = req.params;
      const { quality, fps } = req.body;
      const result = await screenService.startScreen(udid, { quality, fps });
      return { code: 0, data: result, msg: '' };
    }
  );

  // POST /api/screen/:udid/stop - 停止投屏
  app.post<{ Params: { udid: string } }>('/api/screen/:udid/stop', async (req, reply) => {
    const { udid } = req.params;
    const success = await screenService.stopScreen(udid);
    return { code: success ? 0 : -1, data: { success }, msg: '' };
  });

  // POST /api/screen/:udid/touch - 发送触控操作
  app.post<{ Params: { udid: string }; Body: {
    action: 'tap' | 'swipe' | 'longpress';
    x: number; y: number;
    x2?: number; y2?: number;
    duration?: number;
  } }>('/api/screen/:udid/touch', async (req, reply) => {
    const { udid } = req.params;
    const { action, x, y, x2, y2, duration } = req.body;
    const success = await screenService.sendTouch(udid, action, { x, y, x2, y2, duration });
    return { code: success ? 0 : -1, data: { success }, msg: '' };
  });

  // GET /api/screen/sessions - 获取活跃投屏会话
  app.get('/api/screen/sessions', async (_req, reply) => {
    const sessions = screenService.getActiveSessions();
    return {
      code: 0,
      data: sessions.map(s => ({
        udid: s.udid,
        quality: s.quality,
        fps: s.fps,
        width: s.width,
        height: s.height,
        frameCount: s.frameCount,
        running: s.running,
      })),
      msg: '',
    };
  });
}
