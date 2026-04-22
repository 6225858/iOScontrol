<template>
  <div class="file-manager flex h-full gap-4">
    <!-- 左侧操作面板 -->
    <div class="w-[300px] glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50 mb-3">应用管理</div>
        <div class="space-y-3">
          <div>
            <div class="text-xs text-dark-300 mb-1.5">目标设备</div>
            <select v-model="selectedDevice"
              class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none">
              <option value="">请选择设备</option>
              <option v-for="device in deviceStore.onlineDevices" :key="device.udid" :value="device.udid">
                {{ device.deviceName }} ({{ device.iosVersion }})
              </option>
            </select>
          </div>
          <div>
            <div class="text-xs text-dark-300 mb-1.5">IPA 文件</div>
            <div class="flex gap-2">
              <input type="text" v-model="ipaPath" placeholder="IPA 文件路径"
                class="flex-1 px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-xs placeholder-dark-500 focus:border-primary-500/50 focus:outline-none" />
              <button @click="selectIpaFile"
                class="px-3 py-2 rounded-lg bg-dark-600/30 border border-dark-500/20 text-dark-200 hover:text-primary-400 text-xs transition-colors">
                浏览
              </button>
            </div>
          </div>
          <button @click="installApp"
            :disabled="!selectedDevice || !ipaPath"
            class="w-full px-3 py-2.5 rounded-lg bg-functional-success/10 text-functional-success hover:bg-functional-success/20 text-sm transition-all border border-functional-success/20 disabled:opacity-40 disabled:cursor-not-allowed">
            安装应用
          </button>
        </div>
      </div>

      <!-- 剪切板 -->
      <div class="p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50 mb-3">剪切板</div>
        <textarea v-model="clipboardContent" placeholder="输入文本写入设备剪切板..."
          class="w-full h-20 px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-xs placeholder-dark-500 focus:border-primary-500/50 focus:outline-none resize-none"></textarea>
        <div class="flex gap-2 mt-2">
          <button @click="readClipboard"
            class="flex-1 px-3 py-1.5 rounded-lg bg-dark-600/30 text-dark-200 hover:text-primary-400 text-xs transition-colors border border-dark-500/20">
            读取
          </button>
          <button @click="writeClipboard"
            class="flex-1 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-xs transition-colors border border-primary-500/20">
            写入
          </button>
        </div>
      </div>

      <!-- 文件上传 -->
      <div class="p-4 flex-1">
        <div class="text-subheading text-dark-50 mb-3">文件传输</div>
        <div class="border-2 border-dashed border-dark-500/30 rounded-xl p-6 text-center hover:border-primary-500/30 transition-colors cursor-pointer"
          @click="uploadFile" @dragover.prevent @drop.prevent="handleDrop">
          <svg class="w-8 h-8 mx-auto mb-2 text-dark-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <div class="text-xs text-dark-400">点击或拖拽上传文件</div>
        </div>
      </div>
    </div>

    <!-- 右侧已安装应用列表 -->
    <div class="flex-1 glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50">已安装应用</div>
        <button @click="refreshApps" :disabled="!selectedDevice"
          class="px-3 py-1.5 rounded-lg bg-dark-600/30 text-dark-200 hover:text-primary-400 text-sm transition-colors border border-dark-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          刷新
        </button>
      </div>

      <div class="flex-1 overflow-auto">
        <div v-if="!selectedDevice" class="h-full flex items-center justify-center">
          <div class="text-dark-400 text-sm">请先选择设备</div>
        </div>
        <div v-else-if="installedApps.length === 0" class="h-full flex items-center justify-center">
          <div class="text-dark-400 text-sm">点击刷新获取应用列表</div>
        </div>
        <table v-else class="w-full">
          <thead class="sticky top-0 bg-dark-700/80 backdrop-blur-sm z-10">
            <tr class="text-left text-[11px] text-dark-300 uppercase tracking-wider">
              <th class="px-4 py-3 font-medium">应用名称</th>
              <th class="px-4 py-3 font-medium">Bundle ID</th>
              <th class="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="app in installedApps" :key="app.bundleId"
              class="border-t border-dark-500/10 hover:bg-dark-600/20 transition-colors">
              <td class="px-4 py-3 text-sm text-dark-100">{{ app.name }}</td>
              <td class="px-4 py-3 text-xs text-dark-300 font-mono">{{ app.bundleId }}</td>
              <td class="px-4 py-3">
                <button @click="uninstallApp(app.bundleId)"
                  class="px-2 py-1 rounded text-[11px] bg-functional-danger/10 text-functional-danger hover:bg-functional-danger/20 transition-colors">
                  卸载
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDeviceStore } from '@/stores/device';
import { bridgeApi } from '@/composables/useApi';

const deviceStore = useDeviceStore();
const selectedDevice = ref('');
const ipaPath = ref('');
const clipboardContent = ref('');
const installedApps = ref<Array<{ bundleId: string; name: string }>>([]);

async function installApp() {
  if (!selectedDevice.value || !ipaPath.value) return;
  const res = await bridgeApi.installApp(selectedDevice.value, ipaPath.value);
  if (res.code === 0) {
    await refreshApps();
  }
}

async function uninstallApp(bundleId: string) {
  if (!selectedDevice.value) return;
  const res = await bridgeApi.uninstallApp(selectedDevice.value, bundleId);
  if (res.code === 0) {
    await refreshApps();
  }
}

async function refreshApps() {
  if (!selectedDevice.value) return;
  const res = await bridgeApi.getApps(selectedDevice.value);
  if (res.code === 0) {
    installedApps.value = res.data;
  }
}

async function readClipboard() {
  if (!selectedDevice.value) return;
  const res = await (window.iosControl?.fetch ?? fetch)(`/api/file/clipboard/${selectedDevice.value}`);
  const data = await res.json();
  if (data.code === 0) {
    clipboardContent.value = data.data.content;
  }
}

async function writeClipboard() {
  if (!selectedDevice.value || !clipboardContent.value) return;
  const doFetch = window.iosControl?.fetch ?? fetch;
  const res = await doFetch('/api/file/clipboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ udid: selectedDevice.value, content: clipboardContent.value }),
  });
  const data = await res.json();
  if (data.code === 0) {
    clipboardContent.value = '';
  }
}

function selectIpaFile() {
  if (window.iosControl?.openFileDialog) {
    // 使用 Electron 文件选择对话框
    window.iosControl.openFileDialog({
      title: '选择 IPA 文件',
      filters: [{ name: 'IPA 文件', extensions: ['ipa'] }],
    }).then(paths => {
      if (paths.length > 0) ipaPath.value = paths[0];
    });
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ipa';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) ipaPath.value = file.name;
    };
    input.click();
  }
}

async function uploadFile() {
  if (!selectedDevice.value) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const doFetch = window.iosControl?.fetch ?? fetch;
    const formData = new FormData();
    formData.append('file', file);
    await doFetch('/api/file/upload', {
      method: 'POST',
      body: formData,
    });
  };
  input.click();
}

async function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (!file || !selectedDevice.value) return;
  const doFetch = window.iosControl?.fetch ?? fetch;
  const formData = new FormData();
  formData.append('file', file);
  await doFetch('/api/file/upload', {
    method: 'POST',
    body: formData,
  });
}
</script>
