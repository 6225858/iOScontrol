// 设备管理 API 路由

import type { FastifyInstance } from 'fastify';
import type { DeviceManager } from '../services/device-manager';
import type { AutomationService } from '../services/automation';

export function registerDeviceRoutes(
  app: FastifyInstance,
  deviceManager: DeviceManager,
  automationService: AutomationService
): void {
  // GET /api/devices - 获取设备列表
  app.get('/api/devices', async (_req, reply) => {
    const devices = deviceManager.getDevices();
    const groups = deviceManager.getGroups();
    return { code: 0, data: { devices, groups, total: devices.length }, msg: '' };
  });

  // GET /api/devices/:udid - 获取设备详情
  app.get<{ Params: { udid: string } }>('/api/devices/:udid', async (req, reply) => {
    const { udid } = req.params;
    const device = deviceManager.getDevice(udid);
    if (!device) {
      return { code: 404, data: null, msg: '设备未找到' };
    }
    return { code: 0, data: device, msg: '' };
  });

  // POST /api/devices/:udid/pair - 设备配对
  app.post<{ Params: { udid: string } }>('/api/devices/:udid/pair', async (req, reply) => {
    const { udid } = req.params;
    const result = await deviceManager.pairDevice(udid);
    return { code: result.success ? 0 : -1, data: result, msg: result.message };
  });

  // POST /api/devices/:udid/automation - 开启自动化
  app.post<{ Params: { udid: string }; Body: { wdaPort?: number; agentPort?: number } }>(
    '/api/devices/:udid/automation',
    async (req, reply) => {
      const { udid } = req.params;
      const result = await automationService.startAutomation(udid);
      return { code: result.success ? 0 : -1, data: result, msg: result.message };
    }
  );

  // DELETE /api/devices/:udid/automation - 停止自动化
  app.delete<{ Params: { udid: string } }>('/api/devices/:udid/automation', async (req, reply) => {
    const { udid } = req.params;
    const result = await automationService.stopAutomation(udid);
    return { code: result.success ? 0 : -1, data: result, msg: result.message };
  });

  // POST /api/devices/:udid/test-automation - 测试自动化
  app.post<{ Params: { udid: string } }>('/api/devices/:udid/test-automation', async (req, reply) => {
    const { udid } = req.params;
    const result = await automationService.testAutomation(udid);
    return { code: result.success ? 0 : -1, data: result, msg: result.message };
  });

  // POST /api/devices/:udid/mount-image - 刷入开发者镜像
  app.post<{ Params: { udid: string } }>('/api/devices/:udid/mount-image', async (req, reply) => {
    const { udid } = req.params;
    const result = await deviceManager.mountDevImage(udid);
    return { code: result.success ? 0 : -1, data: result, msg: result.message };
  });

  // POST /api/devices/batch/mount-image - 批量刷入镜像
  app.post<{ Body: { udids?: string[] } }>('/api/devices/batch/mount-image', async (req, reply) => {
    const { udids } = req.body;
    const results = await deviceManager.batchMountDevImage(udids);
    return { code: 0, data: results, msg: '' };
  });

  // PUT /api/devices/:udid/group - 设置设备分组
  app.put<{ Params: { udid: string }; Body: { groupId: string } }>(
    '/api/devices/:udid/group',
    async (req, reply) => {
      const { udid } = req.params;
      const { groupId } = req.body;
      deviceManager.setDeviceGroup(udid, groupId);
      return { code: 0, data: { success: true }, msg: '' };
    }
  );

  // POST /api/devices/scan - 手动触发设备扫描
  app.post('/api/devices/scan', async (_req, reply) => {
    const devices = await deviceManager.scan();
    return { code: 0, data: { devices, total: devices.length }, msg: '' };
  });

  // GET /api/devices/groups - 获取分组列表
  app.get('/api/devices/groups', async (_req, reply) => {
    const groups = deviceManager.getGroups();
    return { code: 0, data: groups, msg: '' };
  });
}
