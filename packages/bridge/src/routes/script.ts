// 脚本执行 API 路由

import type { FastifyInstance } from 'fastify';
import type { ScriptRunnerService } from '../services/script-runner';

export function registerScriptRoutes(
  app: FastifyInstance,
  scriptRunner: ScriptRunnerService
): void {
  // GET /api/scripts - 获取脚本列表
  app.get('/api/scripts', async (_req, reply) => {
    const scripts = scriptRunner.getScripts();
    return { code: 0, data: { scripts, total: scripts.length }, msg: '' };
  });

  // POST /api/scripts/reload - 重新加载脚本目录
  app.post('/api/scripts/reload', async (_req, reply) => {
    const scripts = scriptRunner.loadScripts();
    return { code: 0, data: { scripts, total: scripts.length }, msg: '' };
  });

  // POST /api/scripts/:id/execute - 执行脚本
  app.post<{ Params: { id: string }; Body: {
    deviceUdids: string[];
    params?: Record<string, unknown>;
  } }>('/api/scripts/:id/execute', async (req, reply) => {
    const { id } = req.params;
    const { deviceUdids, params } = req.body;
    const executionIds = await scriptRunner.executeScript(id, deviceUdids, params);
    return { code: 0, data: { executionIds }, msg: '' };
  });

  // POST /api/scripts/execution/:executionId/stop - 停止脚本执行
  app.post<{ Params: { executionId: string } }>(
    '/api/scripts/execution/:executionId/stop',
    async (req, reply) => {
      const { executionId } = req.params;
      const success = await scriptRunner.stopExecution(executionId);
      return { code: success ? 0 : -1, data: { success }, msg: '' };
    }
  );

  // GET /api/scripts/executions - 获取执行记录
  app.get('/api/scripts/executions', async (_req, reply) => {
    const executions = scriptRunner.getExecutions();
    return { code: 0, data: { executions }, msg: '' };
  });

  // GET /api/scripts/execution/:executionId - 获取单个执行记录
  app.get<{ Params: { executionId: string } }>(
    '/api/scripts/execution/:executionId',
    async (req, reply) => {
      const { executionId } = req.params;
      const execution = scriptRunner.getExecution(executionId);
      if (!execution) {
        return { code: 404, data: null, msg: '执行记录未找到' };
      }
      return { code: 0, data: execution, msg: '' };
    }
  );

  // GET /api/scripts/scheduled - 获取定时任务
  app.get('/api/scripts/scheduled', async (_req, reply) => {
    const tasks = scriptRunner.getScheduledTasks();
    return { code: 0, data: tasks, msg: '' };
  });
}
