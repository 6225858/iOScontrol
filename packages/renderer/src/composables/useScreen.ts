// 投屏控制组合式函数

import { ref, onUnmounted } from 'vue';
import { bridgeApi } from './useApi';

export function useScreen() {
  const connected = ref(false);
  const loading = ref(false);
  const fps = ref(0);
  const ws = ref<WebSocket | null>(null);
  const canvas = ref<HTMLCanvasElement | null>(null);
  const frameCount = ref(0);
  const lastFpsTime = ref(Date.now());

  /** 启动投屏 */
  async function startScreen(udid: string, options?: { quality?: number; fps?: number }) {
    loading.value = true;
    const res = await bridgeApi.startScreen(udid, options);
    loading.value = false;

    if (res.code === 0) {
      connected.value = true;
      connectWs(udid);
      return res.data;
    }
    return null;
  }

  /** 停止投屏 */
  async function stopScreen(udid: string) {
    disconnectWs();
    await bridgeApi.stopScreen(udid);
    connected.value = false;
  }

  /** 连接 WebSocket 接收帧数据 */
  function connectWs(udid: string) {
    // 动态获取桥接服务端口
    const port = (window as any).__bridgePort ?? 8020;
    const wsUrl = `ws://127.0.0.1:${port}/api/screen/${udid}/ws`;
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      console.log('[Screen] WebSocket connected');
    };

    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        renderFrame(event.data);
      }
    };

    socket.onclose = () => {
      console.log('[Screen] WebSocket closed');
      connected.value = false;
    };

    socket.onerror = (err) => {
      console.error('[Screen] WebSocket error:', err);
    };

    ws.value = socket;
  }

  /** 断开 WebSocket */
  function disconnectWs() {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  }

  /** 渲染帧到 Canvas */
  function renderFrame(data: ArrayBuffer) {
    if (!canvas.value) return;

    const ctx = canvas.value.getContext('2d');
    if (!ctx) return;

    const blob = new Blob([data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.value!.width, canvas.value!.height);
      URL.revokeObjectURL(url);

      // 计算 FPS
      frameCount.value++;
      const now = Date.now();
      if (now - lastFpsTime.value >= 1000) {
        fps.value = frameCount.value;
        frameCount.value = 0;
        lastFpsTime.value = now;
      }
    };

    img.src = url;
  }

  /** 发送触控操作 */
  async function sendTouch(udid: string, action: 'tap' | 'swipe' | 'longpress', params: Record<string, number>) {
    return bridgeApi.sendTouch(udid, action, params);
  }

  /** 发送点击 */
  async function tap(udid: string, x: number, y: number) {
    return sendTouch(udid, 'tap', { x, y });
  }

  /** 发送滑动 */
  async function swipe(udid: string, x: number, y: number, x2: number, y2: number, duration = 300) {
    return sendTouch(udid, 'swipe', { x, y, x2, y2, duration });
  }

  /** 发送长按 */
  async function longpress(udid: string, x: number, y: number, duration = 1000) {
    return sendTouch(udid, 'longpress', { x, y, duration });
  }

  onUnmounted(() => {
    disconnectWs();
  });

  return {
    connected,
    loading,
    fps,
    canvas,
    startScreen,
    stopScreen,
    tap,
    swipe,
    longpress,
  };
}
