// 脚本执行组合式函数

import { ref } from 'vue';
import { bridgeApi } from './useApi';
import type { Script, ScriptExecution, ScheduledTask } from '@ios-control/shared';

export function useScript() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /** 执行脚本 */
  async function executeScript(
    scriptId: string,
    deviceUdids: string[],
    params?: Record<string, unknown>,
  ): Promise<string[]> {
    loading.value = true;
    error.value = null;
    const res = await bridgeApi.executeScript(scriptId, deviceUdids, params);
    loading.value = false;

    if (res.code === 0) {
      return res.data.executionIds;
    }
    error.value = res.msg;
    return [];
  }

  /** 停止脚本执行 */
  async function stopExecution(executionId: string): Promise<boolean> {
    const res = await bridgeApi.stopExecution(executionId);
    if (res.code !== 0) {
      error.value = res.msg;
      return false;
    }
    return true;
  }

  /** 重新加载脚本目录 */
  async function reloadScripts(): Promise<boolean> {
    const res = await bridgeApi.reloadScripts();
    if (res.code !== 0) {
      error.value = res.msg;
      return false;
    }
    return true;
  }

  /** 获取执行记录 */
  async function getExecution(executionId: string): Promise<ScriptExecution | null> {
    const res = await bridgeApi.getExecution(executionId);
    if (res.code === 0) {
      return res.data;
    }
    error.value = res.msg;
    return null;
  }

  return {
    loading,
    error,
    executeScript,
    stopExecution,
    reloadScripts,
    getExecution,
  };
}
