<template>
  <div class="settings max-w-3xl mx-auto space-y-5">
    <!-- 基础配置 -->
    <div class="glass-light rounded-xl border border-dark-500/30 p-5">
      <h2 class="text-subheading text-dark-50 mb-4">基础配置</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">桥接服务端口</label>
          <input type="number" v-model.number="settings.bridgePort"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">设备扫描间隔 (秒)</label>
          <input type="number" v-model.number="settings.scanInterval" min="1" max="60"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">投屏质量 (1-100)</label>
          <input type="number" v-model.number="settings.screenQuality" min="1" max="100"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">投屏帧率 (fps)</label>
          <input type="number" v-model.number="settings.screenFps" min="10" max="120"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">设备扫描模式</label>
          <select v-model="settings.scanMode"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none">
            <option value="listen">监听模式</option>
            <option value="scan">扫描模式</option>
            <option value="both">监听 + 扫描</option>
          </select>
        </div>
        <div class="flex items-end">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="autoFlush" v-model="settings.autoFlushDevImg"
              class="rounded border-dark-500 bg-dark-700 text-primary-500" />
            <label for="autoFlush" class="text-sm text-dark-200 cursor-pointer">自动刷入开发者镜像</label>
          </div>
        </div>
      </div>
    </div>

    <!-- 高级配置 -->
    <div class="glass-light rounded-xl border border-dark-500/30 p-5">
      <h2 class="text-subheading text-dark-50 mb-4">高级配置</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">BundleID 前缀</label>
          <input type="text" v-model="settings.bundleIdPrefix" placeholder="留空使用默认"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm placeholder-dark-500 focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">iOS 17+ Tunnel 模式</label>
          <select v-model="settings.ios17TunnelMode"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none">
            <option value="admin">管理员模式</option>
            <option value="user">普通用户</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="text-xs text-dark-300 mb-1.5 block">分布式中控地址</label>
          <input type="text" v-model="settings.remoteCenterUrl" placeholder="ws://127.0.0.1:8019"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm placeholder-dark-500 focus:border-primary-500/50 focus:outline-none" />
        </div>
      </div>
    </div>

    <!-- OCR 配置 -->
    <div class="glass-light rounded-xl border border-dark-500/30 p-5">
      <h2 class="text-subheading text-dark-50 mb-4">OCR 配置</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-dark-300 mb-1.5 block">OCR 引擎</label>
          <select v-model="settings.ocrEngine"
            class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none">
            <option value="paddleocr">PaddleOCR</option>
            <option value="ocrlite">OcrLite</option>
          </select>
        </div>
        <div class="flex items-end">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="ocrGpu" v-model="settings.ocrUseGpu"
              class="rounded border-dark-500 bg-dark-700 text-primary-500" />
            <label for="ocrGpu" class="text-sm text-dark-200 cursor-pointer">GPU 加速 (CUDA/CoreML)</label>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end gap-3">
      <button @click="resetSettings"
        class="px-4 py-2 rounded-lg bg-dark-600/30 text-dark-200 hover:text-dark-100 text-sm transition-colors border border-dark-500/20">
        恢复默认
      </button>
      <button @click="saveSettings"
        class="px-6 py-2 rounded-lg bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 text-sm transition-all border border-primary-500/20">
        保存设置
      </button>
    </div>

    <!-- 分布式中控节点 -->
    <div class="glass-light rounded-xl border border-dark-500/30 p-5">
      <h2 class="text-subheading text-dark-50 mb-4">分布式中控</h2>
      <div v-if="hubNodes.length === 0" class="text-center py-6">
        <div class="text-dark-400 text-sm">暂无从控节点连接</div>
        <div class="text-dark-500 text-xs mt-1">配置分布式中控地址后，从控节点可连接此主控</div>
      </div>
      <div v-else class="space-y-2">
        <div v-for="node in hubNodes" :key="node.id"
          class="flex items-center justify-between px-4 py-3 rounded-lg bg-dark-700/30 border border-dark-500/10">
          <div class="flex items-center gap-3">
            <span class="status-dot status-dot-online"></span>
            <div>
              <div class="text-sm text-dark-100">{{ node.name }}</div>
              <div class="text-[10px] text-dark-400">连接于 {{ formatDate(node.connectedAt) }}</div>
            </div>
          </div>
          <div class="text-[11px] text-dark-300">
            {{ node.onlineCount }}/{{ node.deviceCount }} 设备
          </div>
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div class="glass-light rounded-xl border border-dark-500/30 p-5">
      <h2 class="text-subheading text-dark-50 mb-3">关于</h2>
      <div class="space-y-2 text-sm text-dark-300">
        <div class="flex items-center gap-3">
          <span class="text-dark-400 w-20">版本</span>
          <span class="text-dark-200">1.0.0</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-dark-400 w-20">桥接服务</span>
          <span class="flex items-center gap-1.5">
            <span class="status-dot" :class="settingsStore.bridgeRunning ? 'status-dot-online' : 'status-dot-offline'"></span>
            <span :class="settingsStore.bridgeRunning ? 'text-functional-success' : 'text-dark-400'">
              {{ settingsStore.bridgeRunning ? '运行中' : '已停止' }}
            </span>
          </span>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="restartBridge"
            class="px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-xs transition-colors border border-primary-500/20">
            重启桥接服务
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import type { AppSettings } from '@ios-control/shared';
import { DEFAULT_BRIDGE_PORT, DEFAULT_SCREEN_QUALITY, DEFAULT_SCREEN_FPS } from '@ios-control/shared';
import { bridgeApi } from '@/composables/useApi';

const defaultSettings: AppSettings = {
  bridgePort: DEFAULT_BRIDGE_PORT,
  screenQuality: DEFAULT_SCREEN_QUALITY,
  screenFps: DEFAULT_SCREEN_FPS,
  autoFlushDevImg: true,
  bundleIdPrefix: '',
  ios17TunnelMode: 'user',
  remoteCenterUrl: '',
  ocrEngine: 'paddleocr',
  ocrUseGpu: false,
  scanMode: 'both',
  scanInterval: 5,
};

const settingsStore = useSettingsStore();
const settings = reactive<AppSettings>({ ...defaultSettings });
const hubNodes = ref<Array<{ id: string; name: string; deviceCount: number; onlineCount: number; connectedAt: number }>>([]);

onMounted(async () => {
  await settingsStore.fetchSettings();
  Object.assign(settings, settingsStore.settings);
  await refreshHubNodes();
});

async function saveSettings() {
  await settingsStore.updateSettings(settings);
}

function resetSettings() {
  Object.assign(settings, settingsStore.defaultSettings);
}

async function restartBridge() {
  await window.iosControl?.bridgeRestart();
  await settingsStore.checkBridgeStatus();
}

async function refreshHubNodes() {
  const res = await bridgeApi.getHubNodes();
  if (res.code === 0) {
    hubNodes.value = res.data.nodes;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}
</script>
