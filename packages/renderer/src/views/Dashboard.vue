<template>
  <div class="dashboard space-y-5">
    <!-- 顶部状态卡片 -->
    <div class="grid grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label"
        class="glass-light rounded-xl p-4 border border-dark-500/30 hover:border-primary-500/30 transition-all duration-300 group cursor-default">
        <div class="flex items-center justify-between mb-3">
          <span class="text-dark-300 text-xs">{{ stat.label }}</span>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="stat.iconBg">
            <span class="text-base" v-html="stat.icon"></span>
          </div>
        </div>
        <div class="text-2xl font-bold" :class="stat.valueColor">{{ stat.value }}</div>
        <div class="text-[11px] text-dark-300 mt-1">{{ stat.desc }}</div>
      </div>
    </div>

    <!-- 设备概览 + 快捷操作 -->
    <div class="grid grid-cols-3 gap-4">
      <!-- 设备概览 -->
      <div class="col-span-2 glass-light rounded-xl p-5 border border-dark-500/30">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-subheading text-dark-50">设备概览</h2>
          <button @click="deviceStore.refresh()" class="text-[11px] text-primary-500 hover:text-primary-400 transition-colors flex items-center gap-1">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            刷新
          </button>
        </div>

        <div v-if="deviceStore.devices.length === 0" class="text-center py-12">
          <div class="text-4xl mb-3 opacity-30">&#128241;</div>
          <div class="text-dark-300 text-sm">暂无设备连接</div>
          <div class="text-dark-300/60 text-xs mt-1">请通过 USB 连接 iOS 设备</div>
        </div>

        <div v-else class="grid grid-cols-3 gap-3 max-h-[320px] overflow-y-auto">
          <div v-for="device in deviceStore.devices" :key="device.udid"
            class="device-card bg-dark-700/50 rounded-lg p-3 border border-dark-500/20 hover:border-primary-500/30 transition-all duration-200 cursor-pointer"
            @click="$router.push('/devices')">
            <div class="flex items-center gap-2 mb-2">
              <span class="status-dot" :class="device.status === 'online' ? 'status-dot-online' : 'status-dot-offline'"></span>
              <span class="text-xs text-dark-200 truncate">{{ device.deviceName }}</span>
            </div>
            <div class="text-sm font-medium text-dark-50 truncate">{{ device.productName }}</div>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-dark-600/50 text-dark-200">iOS {{ device.iosVersion }}</span>
              <span v-if="device.automationStatus === 'running'"
                class="text-[10px] px-1.5 py-0.5 rounded bg-functional-success/10 text-functional-success">自动化</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="glass-light rounded-xl p-5 border border-dark-500/30">
        <h2 class="text-subheading text-dark-50 mb-4">快捷操作</h2>
        <div class="space-y-3">
          <button v-for="action in quickActions" :key="action.label" @click="action.handler"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-600/30 border border-dark-500/20 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all duration-200 text-left group">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
              :class="action.iconBg">
              <span v-html="action.icon"></span>
            </div>
            <div>
              <div class="text-sm text-dark-50 group-hover:text-primary-400 transition-colors">{{ action.label }}</div>
              <div class="text-[11px] text-dark-300">{{ action.desc }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 最近任务 -->
    <div class="glass-light rounded-xl p-5 border border-dark-500/30">
      <h2 class="text-subheading text-dark-50 mb-4">最近任务</h2>
      <div v-if="recentTasks.length === 0" class="text-center py-8">
        <div class="text-dark-300 text-sm">暂无执行记录</div>
      </div>
      <div v-else class="space-y-2">
        <div v-for="task in recentTasks" :key="task.id"
          class="flex items-center justify-between px-4 py-3 rounded-lg bg-dark-700/30 border border-dark-500/10">
          <div class="flex items-center gap-3">
            <span class="status-dot" :class="task.status === 'completed' ? 'status-dot-online' : task.status === 'running' ? 'status-dot-running' : 'status-dot-error'"></span>
            <div>
              <div class="text-sm text-dark-100">{{ task.name }}</div>
              <div class="text-[11px] text-dark-300">{{ task.device }} · {{ task.time }}</div>
            </div>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full" :class="taskStatusClass(task.status)">{{ taskStatusLabel(task.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceStore } from '@/stores/device';
import { useScriptStore } from '@/stores/script';
import { useDevice } from '@/composables/useDevice';

const router = useRouter();
const deviceStore = useDeviceStore();
const scriptStore = useScriptStore();
const { batchStartAutomation, batchMountDevImage } = useDevice();

const stats = computed(() => [
  {
    label: '在线设备',
    value: deviceStore.onlineCount,
    desc: `共 ${deviceStore.deviceCount} 台设备`,
    icon: '&#128241;',
    iconBg: 'bg-primary-500/15 text-primary-400',
    valueColor: 'text-primary-400',
  },
  {
    label: '离线设备',
    value: deviceStore.offlineDevices.length,
    desc: '未连接或已断开',
    icon: '&#128683;',
    iconBg: 'bg-dark-500/30 text-dark-300',
    valueColor: 'text-dark-300',
  },
  {
    label: '运行自动化',
    value: deviceStore.automatedCount,
    desc: 'WDA + Agent 已启动',
    icon: '&#9889;',
    iconBg: 'bg-functional-success/15 text-functional-success',
    valueColor: 'text-functional-success',
  },
  {
    label: '异常告警',
    value: 0,
    desc: '无异常',
    icon: '&#128276;',
    iconBg: 'bg-functional-warning/15 text-functional-warning',
    valueColor: 'text-functional-warning',
  },
]);

const quickActions = [
  {
    label: '批量开启自动化',
    desc: '为所有在线设备启动 WDA',
    icon: '&#9889;',
    iconBg: 'bg-functional-success/15 text-functional-success',
    handler: () => {
      const udids = deviceStore.onlineDevices.map(d => d.udid);
      batchStartAutomation(udids);
    },
  },
  {
    label: '批量刷入镜像',
    desc: '挂载开发者磁盘镜像',
    icon: '&#128190;',
    iconBg: 'bg-primary-500/15 text-primary-400',
    handler: () => {
      const udids = deviceStore.onlineDevices.map(d => d.udid);
      batchMountDevImage(udids);
    },
  },
  {
    label: '批量安装应用',
    desc: '安装 IPA 到所有设备',
    icon: '&#128229;',
    iconBg: 'bg-functional-info/15 text-functional-info',
    handler: () => { router.push('/files'); },
  },
  {
    label: '集控投屏',
    desc: '多设备同屏操作',
    icon: '&#128250;',
    iconBg: 'bg-functional-warning/15 text-functional-warning',
    handler: () => { router.push('/screen'); },
  },
];

const recentTasks = computed(() => {
  return scriptStore.executions.slice(0, 5).map(e => ({
    id: e.id,
    name: `脚本 ${e.scriptId}`,
    device: e.deviceUdid.slice(0, 8),
    time: e.startedAt ? new Date(e.startedAt).toLocaleTimeString('zh-CN') : '-',
    status: e.status,
  }));
});

function taskStatusClass(status: string) {
  switch (status) {
    case 'completed': return 'bg-functional-success/10 text-functional-success';
    case 'running': return 'bg-primary-500/10 text-primary-400';
    case 'failed': return 'bg-functional-danger/10 text-functional-danger';
    default: return 'bg-dark-500/30 text-dark-300';
  }
}

function taskStatusLabel(status: string) {
  switch (status) {
    case 'completed': return '已完成';
    case 'running': return '运行中';
    case 'failed': return '失败';
    default: return status;
  }
}
</script>
