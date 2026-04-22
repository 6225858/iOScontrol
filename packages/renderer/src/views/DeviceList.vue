<template>
  <div class="device-list flex h-full gap-4">
    <!-- 左侧分组树 -->
    <div class="w-[240px] glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50 mb-3">设备分组</div>
        <input type="text" v-model="searchQuery" placeholder="搜索设备..."
          class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm placeholder-dark-400 focus:border-primary-500/50 focus:outline-none transition-colors" />
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div v-for="group in deviceStore.groups" :key="group.id"
          class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200"
          :class="selectedGroup === group.id ? 'bg-primary-500/15 text-primary-400' : 'text-dark-200 hover:bg-dark-600/30'"
          @click="selectedGroup = group.id">
          <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: group.color }"></span>
          <span class="text-sm">{{ group.name }}</span>
          <span class="ml-auto text-[11px] text-dark-400">{{ group.deviceCount }}</span>
        </div>
      </div>
    </div>

    <!-- 中央设备表格 -->
    <div class="flex-1 flex flex-col glass-light rounded-xl border border-dark-500/30">
      <!-- 工具栏 -->
      <div class="flex items-center justify-between p-4 border-b border-dark-500/20">
        <div class="flex items-center gap-2">
          <button @click="deviceStore.refresh()"
            class="px-3 py-1.5 rounded-lg bg-dark-600/30 border border-dark-500/20 text-dark-200 hover:text-primary-400 hover:border-primary-500/30 text-sm transition-all flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            刷新
          </button>
          <button @click="batchAutomation"
            class="px-3 py-1.5 rounded-lg bg-functional-success/10 border border-functional-success/20 text-functional-success hover:bg-functional-success/20 text-sm transition-all">
            批量开启自动化
          </button>
          <button @click="batchMountImage"
            class="px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 text-sm transition-all">
            批量刷入镜像
          </button>
        </div>
        <div class="text-xs text-dark-400">{{ filteredDevices.length }} 台设备</div>
      </div>

      <!-- 设备表格 -->
      <div class="flex-1 overflow-auto">
        <table class="w-full">
          <thead class="sticky top-0 bg-dark-700/80 backdrop-blur-sm z-10">
            <tr class="text-left text-[11px] text-dark-300 uppercase tracking-wider">
              <th class="px-4 py-3 font-medium">状态</th>
              <th class="px-4 py-3 font-medium">设备名称</th>
              <th class="px-4 py-3 font-medium">UDID</th>
              <th class="px-4 py-3 font-medium">型号</th>
              <th class="px-4 py-3 font-medium">iOS版本</th>
              <th class="px-4 py-3 font-medium">自动化</th>
              <th class="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in filteredDevices" :key="device.udid"
              class="border-t border-dark-500/10 hover:bg-dark-600/20 transition-colors"
              @contextmenu.prevent="showContextMenu($event, device)">
              <td class="px-4 py-3">
                <span class="status-dot" :class="device.status === 'online' ? 'status-dot-online' : 'status-dot-offline'"></span>
              </td>
              <td class="px-4 py-3 text-sm text-dark-100">{{ device.deviceName }}</td>
              <td class="px-4 py-3 text-xs text-dark-300 font-mono">{{ device.udid.slice(0, 16) }}...</td>
              <td class="px-4 py-3 text-sm text-dark-200">{{ device.productName }}</td>
              <td class="px-4 py-3 text-xs text-dark-300">{{ device.iosVersion }}</td>
              <td class="px-4 py-3">
                <span v-if="device.automationStatus === 'running'" class="text-[11px] px-2 py-0.5 rounded-full bg-functional-success/10 text-functional-success">运行中</span>
                <span v-else-if="device.automationStatus === 'starting'" class="text-[11px] px-2 py-0.5 rounded-full bg-functional-warning/10 text-functional-warning">启动中</span>
                <span v-else-if="device.automationStatus === 'error'" class="text-[11px] px-2 py-0.5 rounded-full bg-functional-danger/10 text-functional-danger">异常</span>
                <span v-else class="text-[11px] px-2 py-0.5 rounded-full bg-dark-500/20 text-dark-400">未启动</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1">
                  <button @click="deviceStore.startAutomation(device.udid)"
                    v-if="device.automationStatus !== 'running'"
                    class="px-2 py-1 rounded text-[11px] bg-functional-success/10 text-functional-success hover:bg-functional-success/20 transition-colors">
                    开启自动化
                  </button>
                  <button @click="deviceStore.stopAutomation(device.udid)"
                    v-else
                    class="px-2 py-1 rounded text-[11px] bg-functional-danger/10 text-functional-danger hover:bg-functional-danger/20 transition-colors">
                    停止
                  </button>
                  <button @click="deviceStore.mountDevImage(device.udid)"
                    class="px-2 py-1 rounded text-[11px] bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors">
                    刷镜像
                  </button>
                  <button @click="deviceStore.pairDevice(device.udid)"
                    class="px-2 py-1 rounded text-[11px] bg-dark-600/30 text-dark-300 hover:text-dark-100 transition-colors">
                    配对
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredDevices.length === 0">
              <td colspan="7" class="text-center py-12 text-dark-400 text-sm">
                暂无设备，请通过 USB 连接 iOS 设备
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeviceStore } from '@/stores/device';
import { useDevice } from '@/composables/useDevice';
import type { IOSDevice } from '@ios-control/shared';

const deviceStore = useDeviceStore();
const { batchStartAutomation, batchMountDevImage } = useDevice();
const selectedGroup = ref('all');
const searchQuery = ref('');
const contextMenuVisible = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const contextMenuDevice = ref<IOSDevice | null>(null);

const filteredDevices = computed(() => {
  let list = deviceStore.devices;
  if (selectedGroup.value === 'all') list = list;
  else if (selectedGroup.value === 'online') list = deviceStore.onlineDevices;
  else if (selectedGroup.value === 'offline') list = deviceStore.offlineDevices;
  else list = list.filter(d => d.groupId === selectedGroup.value);

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(d =>
      d.deviceName.toLowerCase().includes(q) ||
      d.productName.toLowerCase().includes(q) ||
      d.udid.toLowerCase().includes(q) ||
      d.iosVersion.includes(q)
    );
  }

  return list;
});

function batchAutomation() {
  const udids = deviceStore.onlineDevices.map(d => d.udid);
  batchStartAutomation(udids);
}

function batchMountImage() {
  const udids = deviceStore.onlineDevices.map(d => d.udid);
  batchMountDevImage(udids);
}

function showContextMenu(event: MouseEvent, device: IOSDevice) {
  contextMenuDevice.value = device;
  contextMenuPos.value = { x: event.clientX, y: event.clientY };
  contextMenuVisible.value = true;

  const closeMenu = () => {
    contextMenuVisible.value = false;
    document.removeEventListener('click', closeMenu);
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}
</script>
