<template>
  <div class="script-manager flex h-full gap-4">
    <!-- 左侧脚本目录 -->
    <div class="w-[240px] glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50 mb-3">脚本目录</div>
        <button @click="reloadScripts"
          class="w-full px-3 py-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-sm transition-all border border-primary-500/20 flex items-center justify-center gap-1.5">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          重新加载
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div v-for="script in scriptStore.scripts" :key="script.id"
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200"
          :class="selectedScript === script.id ? 'bg-primary-500/15 text-primary-400' : 'text-dark-200 hover:bg-dark-600/30'"
          @click="selectedScript = script.id">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" />
          </svg>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ script.name }}</div>
            <div class="text-[10px] text-dark-400">执行 {{ script.executionCount }} 次</div>
          </div>
        </div>
        <div v-if="scriptStore.scripts.length === 0" class="text-center py-8">
          <div class="text-dark-400 text-xs">暂无脚本</div>
        </div>
      </div>
    </div>

    <!-- 中央脚本列表 -->
    <div class="flex-1 flex flex-col glass-light rounded-xl border border-dark-500/30">
      <div class="flex items-center justify-between p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50">脚本列表</div>
        <div class="flex items-center gap-2">
          <button @click="executeSelected"
            :disabled="!selectedScript || selectedDevices.length === 0"
            class="px-3 py-1.5 rounded-lg bg-functional-success/10 text-functional-success hover:bg-functional-success/20 text-sm transition-all border border-functional-success/20 disabled:opacity-40 disabled:cursor-not-allowed">
            执行脚本
          </button>
          <button @click="stopAllExecutions"
            class="px-3 py-1.5 rounded-lg bg-functional-danger/10 text-functional-danger hover:bg-functional-danger/20 text-sm transition-all border border-functional-danger/20">
            停止全部
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <table class="w-full">
          <thead class="sticky top-0 bg-dark-700/80 backdrop-blur-sm z-10">
            <tr class="text-left text-[11px] text-dark-300 uppercase tracking-wider">
              <th class="px-4 py-3 font-medium">脚本名称</th>
              <th class="px-4 py-3 font-medium">文件路径</th>
              <th class="px-4 py-3 font-medium">执行次数</th>
              <th class="px-4 py-3 font-medium">最后执行</th>
              <th class="px-4 py-3 font-medium">状态</th>
              <th class="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="script in scriptStore.scripts" :key="script.id"
              class="border-t border-dark-500/10 hover:bg-dark-600/20 transition-colors cursor-pointer"
              :class="selectedScript === script.id ? 'bg-primary-500/5' : ''"
              @click="selectedScript = script.id">
              <td class="px-4 py-3 text-sm text-dark-100">{{ script.name }}</td>
              <td class="px-4 py-3 text-xs text-dark-300 font-mono truncate max-w-[200px]">{{ script.filePath }}</td>
              <td class="px-4 py-3 text-sm text-dark-200">{{ script.executionCount }}</td>
              <td class="px-4 py-3 text-xs text-dark-300">{{ script.lastExecutedAt ? formatDate(script.lastExecutedAt) : '-' }}</td>
              <td class="px-4 py-3">
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-dark-500/20 text-dark-400">空闲</span>
              </td>
              <td class="px-4 py-3">
                <button @click.stop="executeScript(script.id)"
                  class="px-2 py-1 rounded text-[11px] bg-functional-success/10 text-functional-success hover:bg-functional-success/20 transition-colors">
                  执行
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 执行日志 -->
      <div class="h-[160px] border-t border-dark-500/20 bg-dark-900/50 rounded-b-xl overflow-auto p-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] text-dark-300">执行日志</span>
          <button class="text-[10px] text-dark-400 hover:text-dark-200 transition-colors">清空</button>
        </div>
        <div class="font-mono text-[11px] space-y-0.5 text-dark-300">
          <div v-for="log in executionLogs" :key="log.id" :class="log.type === 'error' ? 'text-functional-danger' : ''">
            <span class="text-dark-500">[{{ log.time }}]</span> {{ log.message }}
          </div>
          <div v-if="executionLogs.length === 0" class="text-dark-500">等待执行...</div>
        </div>
      </div>
    </div>

    <!-- 右侧参数面板 -->
    <div class="w-[260px] glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50">执行配置</div>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- 目标设备 -->
        <div>
          <div class="text-xs text-dark-300 mb-2">目标设备</div>
          <div v-for="device in deviceStore.onlineDevices" :key="device.udid" class="flex items-center gap-2 py-1.5">
            <input type="checkbox" :id="device.udid" :value="device.udid" v-model="selectedDevices"
              class="rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500/30" />
            <label :for="device.udid" class="text-xs text-dark-200 cursor-pointer">{{ device.deviceName }}</label>
          </div>
          <div v-if="deviceStore.onlineDevices.length === 0" class="text-dark-500 text-xs">无在线设备</div>
        </div>

        <!-- 定时任务 -->
        <div>
          <div class="text-xs text-dark-300 mb-2">定时执行</div>
          <div class="flex gap-2">
            <input type="text" placeholder="Cron 表达式"
              class="flex-1 px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-xs placeholder-dark-500 focus:border-primary-500/50 focus:outline-none" />
            <button class="px-2 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-xs hover:bg-primary-500/20 transition-colors">
              设置
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useScriptStore } from '@/stores/script';
import { useDeviceStore } from '@/stores/device';
import { bridgeApi } from '@/composables/useApi';

const scriptStore = useScriptStore();
const deviceStore = useDeviceStore();
const selectedScript = ref('');
const selectedDevices = ref<string[]>([]);
const executionLogs = ref<Array<{ id: number; time: string; message: string; type?: string }>>([]);
let logId = 0;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

async function reloadScripts() {
  await bridgeApi.reloadScripts();
  await scriptStore.fetchScripts();
}

async function executeScript(scriptId: string) {
  const udids = selectedDevices.value.length > 0
    ? selectedDevices.value
    : deviceStore.onlineDevices.map(d => d.udid);

  addLog(`开始执行脚本 ${scriptId}，目标设备: ${udids.length} 台`);

  const res = await bridgeApi.executeScript(scriptId, udids);
  if (res.code === 0) {
    addLog(`脚本执行已提交，执行ID: ${res.data.executionIds.join(', ')}`);
  } else {
    addLog(`脚本执行失败: ${res.msg}`, 'error');
  }
}

async function executeSelected() {
  if (selectedScript.value) {
    await executeScript(selectedScript.value);
  }
}

async function stopAllExecutions() {
  addLog('停止所有脚本执行...');
  const executions = scriptStore.activeExecutions;
  for (const exe of executions) {
    await scriptStore.stopExecution(exe.id);
  }
  addLog(`已停止 ${executions.length} 个脚本执行`);
}

function addLog(message: string, type?: string) {
  executionLogs.value.push({
    id: logId++,
    time: new Date().toLocaleTimeString('zh-CN'),
    message,
    type,
  });
}
</script>
