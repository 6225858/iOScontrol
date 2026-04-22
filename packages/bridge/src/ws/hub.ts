// WebSocket 集中控制中心通信
// 支持分布式中控部署，主控节点通过 WebSocket 与从控节点通信

import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as crypto from 'crypto';

interface CenterNode {
  id: string;
  ws: WebSocket;
  name: string;
  connectedAt: number;
  lastHeartbeat: number;
  deviceCount: number;
  onlineCount: number;
}

interface HubMessage {
  type: 'register' | 'heartbeat' | 'device_update' | 'command' | 'command_result' | 'sync_request' | 'sync_response';
  from: string;
  to?: string;
  payload: any;
  timestamp: number;
  id: string;
}

export class WsHub extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private nodes: Map<string, CenterNode> = new Map();
  private apiKey: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey ?? crypto.randomBytes(32).toString('hex');
    console.log(`[WsHub] API Key: ${this.apiKey}`);
  }

  /** 附加到现有 HTTP 服务器 */
  attach(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws/hub' });

    this.wss.on('connection', (ws, req) => {
      const apiKey = req.headers['x-api-key'] as string;
      if (this.apiKey && apiKey !== this.apiKey) {
        console.warn('[WsHub] Connection rejected: invalid API key');
        ws.close(4001, 'Invalid API key');
        return;
      }

      console.log('[WsHub] New connection from:', req.socket.remoteAddress);
      this.handleConnection(ws);
    });

    // 心跳检测
    this.heartbeatInterval = setInterval(() => {
      for (const [id, node] of this.nodes) {
        if (Date.now() - node.lastHeartbeat > 30000) {
          console.warn(`[WsHub] Node ${id} heartbeat timeout, disconnecting`);
          node.ws.close(4002, 'Heartbeat timeout');
          this.nodes.delete(id);
          this.emit('node:disconnected', id);
        } else {
          // 发送心跳请求
          this.sendToNode(id, {
            type: 'heartbeat',
            from: 'hub',
            payload: { action: 'ping' },
            timestamp: Date.now(),
            id: crypto.randomUUID(),
          });
        }
      }
    }, 10000);

    console.log('[WsHub] WebSocket hub attached to HTTP server');
  }

  /** 处理新连接 */
  private handleConnection(ws: WebSocket): void {
    let nodeId = '';

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as HubMessage;
        this.handleMessage(ws, msg);
        if (!nodeId && msg.type === 'register') {
          nodeId = msg.from;
        }
      } catch (err) {
        console.error('[WsHub] Message parse error:', err);
      }
    });

    ws.on('close', () => {
      if (nodeId) {
        this.nodes.delete(nodeId);
        this.emit('node:disconnected', nodeId);
        console.log(`[WsHub] Node ${nodeId} disconnected`);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WsHub] Node ${nodeId} error:`, err);
    });
  }

  /** 处理消息 */
  private handleMessage(ws: WebSocket, msg: HubMessage): void {
    switch (msg.type) {
      case 'register':
        this.handleRegister(ws, msg);
        break;
      case 'heartbeat':
        this.handleHeartbeat(msg);
        break;
      case 'device_update':
        this.emit('device:update', msg.from, msg.payload);
        this.broadcast(msg, msg.from); // 转发设备更新到其他节点
        break;
      case 'command_result':
        this.emit('command:result', msg.from, msg.payload);
        // 将结果转发给命令发起者
        if (msg.to) {
          this.sendToNode(msg.to, msg);
        }
        break;
      default:
        console.warn(`[WsHub] Unknown message type: ${msg.type}`);
    }
  }

  /** 处理节点注册 */
  private handleRegister(ws: WebSocket, msg: HubMessage): void {
    const nodeId = msg.from;
    const existing = this.nodes.get(nodeId);
    if (existing) {
      existing.ws.close(4003, 'Replaced by new connection');
    }

    const node: CenterNode = {
      id: nodeId,
      ws,
      name: msg.payload?.name ?? nodeId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      deviceCount: msg.payload?.deviceCount ?? 0,
      onlineCount: msg.payload?.onlineCount ?? 0,
    };

    this.nodes.set(nodeId, node);
    this.emit('node:connected', nodeId, node);
    console.log(`[WsHub] Node registered: ${nodeId} (${node.name})`);

    // 返回注册确认
    this.sendToNode(nodeId, {
      type: 'register',
      from: 'hub',
      payload: { success: true, nodeCount: this.nodes.size },
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    });
  }

  /** 处理心跳 */
  private handleHeartbeat(msg: HubMessage): void {
    const node = this.nodes.get(msg.from);
    if (node) {
      node.lastHeartbeat = Date.now();
      if (msg.payload?.deviceCount !== undefined) {
        node.deviceCount = msg.payload.deviceCount;
        node.onlineCount = msg.payload.onlineCount ?? 0;
      }
    }
  }

  /** 向指定节点发送消息 */
  sendToNode(nodeId: string, msg: HubMessage): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      node.ws.send(JSON.stringify(msg));
      return true;
    } catch (err) {
      console.error(`[WsHub] Send to ${nodeId} error:`, err);
      return false;
    }
  }

  /** 广播消息到所有节点（排除发送者） */
  broadcast(msg: HubMessage, excludeFrom?: string): void {
    const data = JSON.stringify(msg);
    for (const [id, node] of this.nodes) {
      if (id === excludeFrom) continue;
      if (node.ws.readyState === WebSocket.OPEN) {
        try {
          node.ws.send(data);
        } catch (err) {
          console.error(`[WsHub] Broadcast to ${id} error:`, err);
        }
      }
    }
  }

  /** 向指定节点发送命令 */
  sendCommand(nodeId: string, command: string, params: Record<string, unknown>): string {
    const msgId = crypto.randomUUID();
    const msg: HubMessage = {
      type: 'command',
      from: 'hub',
      to: nodeId,
      payload: { command, params },
      timestamp: Date.now(),
      id: msgId,
    };

    if (this.sendToNode(nodeId, msg)) {
      return msgId;
    }
    return '';
  }

  /** 广播命令到所有节点 */
  broadcastCommand(command: string, params: Record<string, unknown>): string[] {
    const msgIds: string[] = [];
    for (const [id] of this.nodes) {
      const msgId = this.sendCommand(id, command, params);
      if (msgId) msgIds.push(msgId);
    }
    return msgIds;
  }

  /** 获取所有节点列表 */
  getNodes(): Array<{ id: string; name: string; deviceCount: number; onlineCount: number; connectedAt: number }> {
    return Array.from(this.nodes.values()).map(n => ({
      id: n.id,
      name: n.name,
      deviceCount: n.deviceCount,
      onlineCount: n.onlineCount,
      connectedAt: n.connectedAt,
    }));
  }

  /** 获取节点数量 */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /** 请求节点同步设备数据 */
  requestSync(nodeId: string): boolean {
    return this.sendToNode(nodeId, {
      type: 'sync_request',
      from: 'hub',
      payload: {},
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    });
  }

  /** 关闭 Hub */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const [, node] of this.nodes) {
      node.ws.close(1000, 'Hub shutting down');
    }
    this.nodes.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('[WsHub] Closed');
  }
}
