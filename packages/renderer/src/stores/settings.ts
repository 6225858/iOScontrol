import { defineStore } from 'pinia';
import { ref } from 'vue';
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

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...defaultSettings });
  const bridgeRunning = ref(false);

  async function fetchSettings(): Promise<void> {
    const res = await bridgeApi.getSettings();
    if (res.code === 0) {
      Object.assign(settings.value, res.data);
    }
  }

  async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
    Object.assign(settings.value, partial);
    await bridgeApi.updateSettings(partial);
  }

  async function resetSettings(): Promise<void> {
    Object.assign(settings.value, defaultSettings);
    await bridgeApi.updateSettings(defaultSettings);
  }

  async function checkBridgeStatus(): Promise<void> {
    if (window.iosControl) {
      const result = await window.iosControl.bridgeStatus();
      bridgeRunning.value = result.running;
    }
  }

  return {
    settings,
    bridgeRunning,
    defaultSettings,
    fetchSettings,
    updateSettings,
    resetSettings,
    checkBridgeStatus,
  };
});
