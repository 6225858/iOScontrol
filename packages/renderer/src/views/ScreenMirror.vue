<template>
  <div class="screen-mirror flex flex-col h-full gap-4">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between glass-light rounded-xl px-4 py-3 border border-dark-500/30">
      <div class="flex items-center gap-3">
        <span class="text-subheading text-dark-50">集控投屏</span>
        <div class="flex items-center gap-1 ml-4">
          <button v-for="layout in layouts" :key="layout.count" @click="gridLayout = layout.count"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
            :class="gridLayout === layout.count ? 'bg-primary-500/20 text-primary-400 neon-glow' : 'bg-dark-600/30 text-dark-300 hover:text-dark-100'">
            {{ layout.label }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-dark-300">{{ activeScreens }} 路投屏</span>
        <button @click="startAllScreens"
          class="px-3 py-1.5 rounded-lg bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 text-sm transition-all border border-primary-500/20">
          全部投屏
        </button>
        <button @click="stopAllScreens"
          class="px-3 py-1.5 rounded-lg bg-functional-danger/10 text-functional-danger hover:bg-functional-danger/20 text-sm transition-all border border-functional-danger/20">
          全部停止
        </button>
      </div>
    </div>

    <!-- 投屏区域 -->
    <div class="flex-1 overflow-auto" :style="gridStyle">
      <div v-if="screenDevices.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="text-5xl mb-4 opacity-20">&#128250;</div>
          <div class="text-dark-300 text-sm">请先开启设备自动化，然后点击"全部投屏"</div>
          <div class="text-dark-400 text-xs mt-2">投屏需要设备自动化环境已启动</div>
        </div>
      </div>

      <div v-for="device in screenDevices" :key="device.udid"
        class="screen-cell glass-light rounded-xl border overflow-hidden transition-all duration-300"
        :class="selectedDevice === device.udid ? 'border-primary-500/50 neon-glow' : 'border-dark-500/30'"
        @click="selectedDevice = device.udid">
        <!-- 设备信息标签 -->
        <div class="flex items-center justify-between px-3 py-2 bg-dark-800/80 border-b border-dark-500/20">
          <div class="flex items-center gap-2">
            <span class="status-dot status-dot-running"></span>
            <span class="text-xs text-dark-200">{{ device.deviceName }}</span>
          </div>
          <div class="flex items-center gap-2 text-dark-400">
            <span class="text-[10px]">{{ device.iosVersion }}</span>
            <span class="text-[10px] text-primary-400">{{ screenFps[device.udid] ?? 0 }}fps</span>
          </div>
        </div>

        <!-- Canvas 投屏画面 -->
        <div class="screen-canvas-container" :style="{ aspectRatio: '9/19.5' }"
          @mousedown="onCanvasMouseDown(device.udid, $event)"
          @mousemove="onCanvasMouseMove(device.udid, $event)"
          @mouseup="onCanvasMouseUp(device.udid, $event)"
          @contextmenu.prevent>
          <canvas :ref="el => setCanvasRef(device.udid, el as HTMLCanvasElement)"
            class="w-full h-full"></canvas>
        </div>

        <!-- 底部操作栏 -->
        <div v-if="selectedDevice === device.udid" class="flex items-center gap-1 px-2 py-1.5 bg-dark-800/80 border-t border-dark-500/20">
          <button @click.stop="captureScreen(device.udid)" class="p-1 rounded hover:bg-dark-600/50 text-dark-300 hover:text-primary-400 transition-colors" title="截图">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button @click.stop class="p-1 rounded hover:bg-dark-600/50 text-dark-300 hover:text-primary-400 transition-colors" title="录屏">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
          </button>
          <button @click.stop class="p-1 rounded hover:bg-dark-600/50 text-dark-300 hover:text-primary-400 transition-colors" title="安装App">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </button>
          <button @click.stop class="p-1 rounded hover:bg-dark-600/50 text-dark-300 hover:text-primary-400 transition-colors" title="文件传输">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </button>
          <button @click.stop="stopScreen(device.udid)" class="p-1 rounded hover:bg-functional-danger/20 text-dark-300 hover:text-functional-danger transition-colors ml-auto" title="停止">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted } from 'vue';
import { useDeviceStore } from '@/stores/device';
import { useScreen } from '@/composables/useScreen';
import { bridgeApi } from '@/composables/useApi';

const deviceStore = useDeviceStore();
const gridLayout = ref(4);
const selectedDevice = ref('');
const screenFps = reactive<Record<string, number>>({});
const canvasRefs = reactive<Record<string, HTMLCanvasElement | null>>({});
const screenInstances = reactive<Record<string, ReturnType<typeof useScreen>>>({});

const layouts = [
  { count: 1, label: '1' },
  { count: 4, label: '4' },
  { count: 9, label: '9' },
  { count: 16, label: '16' },
];

const screenDevices = computed(() =>
  deviceStore.onlineDevices.filter(d => d.automationStatus === 'running').slice(0, gridLayout.value)
);

const activeScreens = computed(() => screenDevices.value.length);

const gridStyle = computed(() => {
  const cols = Math.ceil(Math.sqrt(gridLayout.value));
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '16px',
    alignContent: 'start',
  };
});

function setCanvasRef(udid: string, el: HTMLCanvasElement | null) {
  canvasRefs[udid] = el;
  // 自动调整 canvas 分辨率
  if (el) {
    const container = el.parentElement;
    if (container) {
      const resizeObserver = new ResizeObserver(() => {
        el.width = container.clientWidth * window.devicePixelRatio;
        el.height = container.clientHeight * window.devicePixelRatio;
      });
      resizeObserver.observe(container);
    }
  }
  // 绑定 canvas 到对应的 useScreen 实例
  if (screenInstances[udid]) {
    screenInstances[udid].canvas = el;
  }
}

async function startAllScreens() {
  for (const device of screenDevices.value) {
    const instance = useScreen();
    instance.canvas = canvasRefs[device.udid] ?? null;
    screenInstances[device.udid] = instance;

    const result = await instance.startScreen(device.udid, { quality: 50, fps: 60 });
    if (result) {
      // 定时更新 FPS 显示
      const fpsTimer = setInterval(() => {
        screenFps[device.udid] = instance.fps.value;
      }, 1000);
      screenFps[`${device.udid}_timer`] = fpsTimer as any;
    }
  }
}

async function stopAllScreens() {
  for (const device of screenDevices.value) {
    await stopScreen(device.udid);
  }
}

async function stopScreen(udid: string) {
  const instance = screenInstances[udid];
  if (instance) {
    await instance.stopScreen(udid);
    delete screenInstances[udid];
  } else {
    await bridgeApi.stopScreen(udid);
  }
  // 清理 FPS 定时器
  const fpsTimer = screenFps[`${udid}_timer`];
  if (fpsTimer) {
    clearInterval(fpsTimer as any);
    delete screenFps[`${udid}_timer`];
  }
}

function captureScreen(udid: string) {
  const canvas = canvasRefs[udid];
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `screenshot_${udid}_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============ 触控操作 ============

const touchState = reactive<Record<string, { down: boolean; x: number; y: number; startTime: number }>>({});

/** 将 canvas 鼠标坐标转为设备屏幕坐标 */
function canvasToDeviceCoords(udid: string, event: MouseEvent): { x: number; y: number } {
  const canvas = canvasRefs[udid];
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // 设备实际分辨率
  const device = deviceStore.devices.find(d => d.udid === udid);
  const devW = 1170; // 默认 iPhone 宽度
  const devH = 2532; // 默认 iPhone 高度

  const x = Math.round((event.clientX - rect.left) * scaleX * (devW / canvas.width));
  const y = Math.round((event.clientY - rect.top) * scaleY * (devH / canvas.height));

  return { x: Math.max(0, Math.min(devW, x)), y: Math.max(0, Math.min(devH, y)) };
}

function onCanvasMouseDown(udid: string, event: MouseEvent) {
  if (event.button !== 0) return; // 仅左键
  const { x, y } = canvasToDeviceCoords(udid, event);
  touchState[udid] = { down: true, x, y, startTime: Date.now() };

  // 如果是右键则忽略，左键立即发送 tap
  if (event.shiftKey) {
    // Shift+点击 = 长按
    // 等松开时判断时长
  } else {
    bridgeApi.sendTouch(udid, 'tap', { x, y });
  }
}

function onCanvasMouseMove(udid: string, event: MouseEvent) {
  // 目前不处理移动中的操作，松开时判断是否为滑动
}

function onCanvasMouseUp(udid: string, event: MouseEvent) {
  const state = touchState[udid];
  if (!state?.down) return;
  state.down = false;

  const { x, y } = canvasToDeviceCoords(udid, event);
  const duration = Date.now() - state.startTime;

  // 如果拖拽距离大于 20px，视为滑动
  const dx = x - state.x;
  const dy = y - state.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 20) {
    bridgeApi.sendTouch(udid, 'swipe', {
      x: state.x, y: state.y,
      x2: x, y2: y,
      duration: Math.min(duration, 1000),
    });
  } else if (duration > 500) {
    // 长按（非滑动且按住超过 500ms）
    bridgeApi.sendTouch(udid, 'longpress', {
      x: state.x, y: state.y,
      duration,
    });
  }
  // 普通点击已在 mousedown 时发送
}
</script>
