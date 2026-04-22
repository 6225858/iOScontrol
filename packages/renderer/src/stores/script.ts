import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Script, ScriptExecution } from '@ios-control/shared';
import { bridgeApi } from '@/composables/useApi';

export const useScriptStore = defineStore('script', () => {
  const scripts = ref<Script[]>([]);
  const executions = ref<ScriptExecution[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeExecutions = computed(() =>
    executions.value.filter(e => e.status === 'running')
  );

  async function fetchScripts(): Promise<void> {
    loading.value = true;
    error.value = null;
    const res = await bridgeApi.getScripts();
    if (res.code === 0) {
      scripts.value = res.data.scripts;
    } else {
      error.value = res.msg;
    }
    loading.value = false;
  }

  async function fetchExecutions(): Promise<void> {
    const res = await bridgeApi.getExecutions();
    if (res.code === 0) {
      executions.value = res.data.executions;
    }
  }

  async function executeScript(scriptId: string, deviceUdids: string[], params?: Record<string, unknown>): Promise<string[]> {
    const res = await bridgeApi.executeScript(scriptId, deviceUdids, params);
    if (res.code === 0) {
      return res.data.executionIds;
    }
    return [];
  }

  async function stopExecution(executionId: string): Promise<boolean> {
    const res = await bridgeApi.stopExecution(executionId);
    return res.code === 0;
  }

  return {
    scripts,
    executions,
    loading,
    error,
    activeExecutions,
    fetchScripts,
    fetchExecutions,
    executeScript,
    stopExecution,
  };
});
