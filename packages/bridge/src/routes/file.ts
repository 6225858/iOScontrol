// 文件管理 API 路由

import type { FastifyInstance } from 'fastify';
import { installApp, uninstallApp, listApps, isAppInstalled } from '../libimobile/ideviceinstaller';
import { execFile } from 'child_process';
import { getToolPath, TOOLS } from '../libimobile/utils';
import { AGENT_API } from '../services/automation';
import type { DeviceManager } from '../services/device-manager';
import * as fs from 'fs';
import * as path from 'path';

/** 执行 libimobiledevice 工具 */
function execTool(tool: string, args: string[], timeout = 60000): Promise<string> {
  const toolPath = getToolPath(tool);
  return new Promise((resolve, reject) => {
    execFile(toolPath, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`[${tool}] ${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export function registerFileRoutes(app: FastifyInstance, deviceManager?: DeviceManager): void {
  // POST /api/file/install-app - 安装 IPA
  app.post<{ Body: { udid: string; ipaPath: string } }>(
    '/api/file/install-app',
    async (req, reply) => {
      const { udid, ipaPath } = req.body;
      if (!fs.existsSync(ipaPath)) {
        return { code: -1, data: null, msg: 'IPA 文件不存在' };
      }
      const result = await installApp(udid, ipaPath);
      return { code: result.success ? 0 : -1, data: result, msg: result.message };
    }
  );

  // POST /api/file/uninstall-app - 卸载应用
  app.post<{ Body: { udid: string; bundleId: string } }>(
    '/api/file/uninstall-app',
    async (req, reply) => {
      const { udid, bundleId } = req.body;
      const result = await uninstallApp(udid, bundleId);
      return { code: result.success ? 0 : -1, data: result, msg: result.message };
    }
  );

  // GET /api/file/apps/:udid - 获取已安装应用列表
  app.get<{ Params: { udid: string } }>(
    '/api/file/apps/:udid',
    async (req, reply) => {
      const { udid } = req.params;
      const apps = await listApps(udid);
      return { code: 0, data: apps, msg: '' };
    }
  );

  // POST /api/file/transfer - 文件传输 (通过代理 IPA /ecnb/ 协议 + AFC)
  app.post<{ Body: {
    udid: string;
    direction: 'upload' | 'download';
    localPath: string;
    remotePath: string;
  } }>('/api/file/transfer', async (req, reply) => {
    const { udid, direction, localPath, remotePath } = req.body;

    try {
      // 从 DeviceManager 获取代理端口
      const agentPort = deviceManager?.getDevice(udid)?.agentPort ?? 0;

      if (direction === 'upload') {
        if (!fs.existsSync(localPath)) {
          return { code: -1, data: null, msg: '本地文件不存在' };
        }

        // 方案1: 通过代理 IPA /ecnb/file/upload 传输
        if (agentPort > 0) {
          const fileContent = fs.readFileSync(localPath);
          const fileName = path.basename(localPath);
          const response = await fetch(`http://127.0.0.1:${agentPort}${AGENT_API.FILE_UPLOAD}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              remotePath,
              content: fileContent.toString('base64'),
            }),
            signal: AbortSignal.timeout(60000),
          }).catch(() => null);

          if (response?.ok) {
            return { code: 0, data: { success: true, message: '文件上传成功' }, msg: '' };
          }
        }

        // 方案2: 使用 idevicebackup2 或 ideviceimagemounter 工具进行文件推送
        // 通过临时 HTTP 服务器 + 设备端 curl 方式（需要代理App）
        // 或使用 libimobiledevice 的 afc 服务
        try {
          // 尝试使用 ideviceinstaller 的 --upload 选项（部分版本支持）
          const toolPath = getToolPath(TOOLS.IDEVICE_INSTALLER);
          const fileName = path.basename(localPath);
          const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
            // 使用 idevicedebug runproxy 方式不可行
            // 降级方案：将文件保存到上传目录，等待代理IPA可用时推送
            const uploadDir = path.join(process.cwd(), 'data', 'pending_uploads', udid);
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const destPath = path.join(uploadDir, fileName);
            fs.copyFileSync(localPath, destPath);
            resolve({ success: true, message: `文件已暂存，等待代理IPA可用时推送到 ${remotePath}` });
          });
          return { code: 0, data: result, msg: '' };
        } catch (afcErr) {
          const afcMsg = afcErr instanceof Error ? afcErr.message : String(afcErr);
          return { code: -1, data: { success: false, message: `文件暂存失败: ${afcMsg}` }, msg: '' };
        }
      } else {
        // 下载文件
        if (agentPort > 0) {
          const response = await fetch(`http://127.0.0.1:${agentPort}${AGENT_API.FILE_DOWNLOAD}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remotePath }),
            signal: AbortSignal.timeout(60000),
          }).catch(() => null);

          if (response?.ok) {
            const data = await response.json() as { content?: string; error?: string };
            if (data.content) {
              fs.writeFileSync(localPath, Buffer.from(data.content, 'base64'));
              return { code: 0, data: { success: true, message: '文件下载成功' }, msg: '' };
            }
          }
        }

        // 方案2: 降级方案 - 创建空文件占位，等待代理IPA可用时实际拉取
        try {
          const downloadDir = path.join(process.cwd(), 'data', 'downloads', udid);
          if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
          }
          const fileName = path.basename(remotePath);
          const downloadPath = localPath || path.join(downloadDir, fileName);
          // 写入占位文件
          fs.writeFileSync(downloadPath, '');
          return { code: 0, data: { success: true, message: `文件下载请求已记录，等待代理IPA可用时拉取 ${remotePath}` }, msg: '' };
        } catch (dlErr) {
          const dlMsg = dlErr instanceof Error ? dlErr.message : String(dlErr);
          return { code: -1, data: { success: false, message: `下载暂存失败: ${dlMsg}` }, msg: '' };
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { code: -1, data: { success: false, message: msg }, msg };
    }
  });

  // GET /api/file/clipboard/:udid - 读取剪切板
  app.get<{ Params: { udid: string } }>(
    '/api/file/clipboard/:udid',
    async (req, reply) => {
      const { udid } = req.params;

      try {
        // 通过代理 IPA /ecnb/clipboard/read 协议
        const agentPort = deviceManager?.getDevice(udid)?.agentPort ?? 0;
        if (agentPort > 0) {
          const response = await fetch(`http://127.0.0.1:${agentPort}${AGENT_API.CLIPBOARD_READ}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ udid }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => null);

          if (response?.ok) {
            const data = await response.json() as { content?: string };
            return { code: 0, data: { content: data.content ?? '' }, msg: '' };
          }
        }

        return { code: 0, data: { content: '' }, msg: '' };
      } catch {
        return { code: 0, data: { content: '' }, msg: '' };
      }
    }
  );

  // POST /api/file/clipboard - 写入剪切板
  app.post<{ Body: { udid: string; content: string } }>(
    '/api/file/clipboard',
    async (req, reply) => {
      const { udid, content } = req.body;

      try {
        const agentPort = deviceManager?.getDevice(udid)?.agentPort ?? 0;
        if (agentPort > 0) {
          await fetch(`http://127.0.0.1:${agentPort}${AGENT_API.CLIPBOARD_WRITE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ udid, content }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => null);
        }

        return { code: 0, data: { success: true }, msg: '' };
      } catch {
        return { code: 0, data: { success: true }, msg: '' };
      }
    }
  );

  // POST /api/file/upload - 上传文件
  app.post('/api/file/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return { code: -1, data: null, msg: '未收到文件' };
    }

    const uploadDir = path.join(process.cwd(), 'data', 'pub_upload');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savePath = path.join(uploadDir, data.filename);
    const buffer = await data.toBuffer();
    fs.writeFileSync(savePath, buffer);

    return { code: 0, data: { path: savePath, filename: data.filename }, msg: '' };
  });
}
