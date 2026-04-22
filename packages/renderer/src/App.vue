<template>
  <div class="app-container flex h-screen">
    <!-- 左侧导航栏 -->
    <nav class="sidebar glass flex flex-col w-[220px] min-w-[220px] h-full border-r border-dark-500/50">
      <!-- Logo -->
      <div class="logo-area flex items-center gap-3 px-5 h-[52px] border-b border-dark-500/30">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <line x1="12" y1="18" x2="12" y2="18.01" stroke-linecap="round" />
          </svg>
        </div>
        <div>
          <div class="text-sm font-semibold text-dark-50">iOS-Control</div>
          <div class="text-[10px] text-dark-200">中控群控系统</div>
        </div>
      </div>

      <!-- 导航菜单 -->
      <div class="flex-1 py-3 overflow-y-auto">
        <div class="px-3 mb-1">
          <div class="text-[10px] text-dark-300 uppercase tracking-wider px-2 mb-2">主菜单</div>
        </div>
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all duration-200"
          :class="isActive(item.path) ? 'bg-primary-500/15 text-primary-500 neon-text' : 'text-dark-200 hover:bg-dark-600/50 hover:text-dark-50'"
        >
          <span class="text-lg" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
            {{ item.badge }}
          </span>
        </router-link>
      </div>

      <!-- 底部桥接状态 -->
      <div class="border-t border-dark-500/30 p-3">
        <div class="flex items-center gap-2 text-[11px] text-dark-300">
          <span class="status-dot" :class="settingsStore.bridgeRunning ? 'status-dot-online' : 'status-dot-offline'"></span>
          <span>桥接服务 {{ settingsStore.bridgeRunning ? '运行中' : '已停止' }}</span>
        </div>
      </div>
    </nav>

    <!-- 右侧主区域 -->
    <div class="flex-1 flex flex-col h-full overflow-hidden">
      <!-- 顶部标题栏 -->
      <header class="title-bar glass flex items-center justify-between h-[52px] px-4 border-b border-dark-500/30" style="-webkit-app-region: drag;">
        <div class="flex items-center gap-3" style="-webkit-app-region: no-drag;">
          <h1 class="text-heading text-dark-50">{{ currentPageTitle }}</h1>
        </div>
        <div class="flex items-center gap-2" style="-webkit-app-region: no-drag;">
          <!-- 桥接状态指示 -->
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700/50 text-[11px]">
            <span class="status-dot" :class="settingsStore.bridgeRunning ? 'status-dot-online' : 'status-dot-offline'"></span>
            <span class="text-dark-200">设备 {{ deviceStore.onlineCount }}/{{ deviceStore.deviceCount }}</span>
          </div>
          <!-- 窗口控制 -->
          <button @click="minimize" class="w-8 h-8 flex items-center justify-center rounded hover:bg-dark-600/50 text-dark-300 hover:text-dark-100 transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><rect y="7" width="16" height="2" rx="1"/></svg>
          </button>
          <button @click="maximize" class="w-8 h-8 flex items-center justify-center rounded hover:bg-dark-600/50 text-dark-300 hover:text-dark-100 transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/></svg>
          </button>
          <button @click="close" class="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/30 text-dark-300 hover:text-red-400 transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
          </button>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="flex-1 overflow-auto p-5">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDeviceStore } from '@/stores/device';
import { useSettingsStore } from '@/stores/settings';
import { useScriptStore } from '@/stores/script';

const route = useRoute();
const deviceStore = useDeviceStore();
const settingsStore = useSettingsStore();
const scriptStore = useScriptStore();

// 定期刷新设备列表和执行记录
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const menuItems = computed(() => [
  { path: '/dashboard', label: '仪表盘', icon: '&#9776;', badge: '' },
  { path: '/devices', label: '设备管理', icon: '&#128241;', badge: deviceStore.onlineCount || '' },
  { path: '/screen', label: '集控投屏', icon: '&#128250;', badge: '' },
  { path: '/scripts', label: '脚本管理', icon: '&#128196;', badge: '' },
  { path: '/files', label: '文件管理', icon: '&#128193;', badge: '' },
  { path: '/ocr', label: 'OCR 识别', icon: '&#128270;', badge: '' },
  { path: '/settings', label: '系统设置', icon: '&#9881;', badge: '' },
]);

const currentPageTitle = computed(() => {
  const item = menuItems.value.find(m => m.path === route.path);
  return item?.label ?? 'iOS-Control';
});

function isActive(path: string) {
  return route.path === path;
}

function minimize() {
  window.iosControl?.windowMinimize();
}

function maximize() {
  window.iosControl?.windowMaximize();
}

function close() {
  window.iosControl?.windowClose();
}

onMounted(async () => {
  await settingsStore.checkBridgeStatus();
  await deviceStore.fetchDevices();
  await scriptStore.fetchScripts();

  // 每 10 秒刷新设备列表
  refreshTimer = setInterval(async () => {
    await deviceStore.fetchDevices();
    await scriptStore.fetchExecutions();
  }, 10000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});
</script>
