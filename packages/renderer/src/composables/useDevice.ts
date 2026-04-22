// 设备操作组合式函数

import { useDeviceStore } from '@/stores/device';

export function useDevice() {
  const store = useDeviceStore();

  async function pairDevice(udid: string) {
    return store.pairDevice(udid);
  }

  async function startAutomation(udid: string) {
    return store.startAutomation(udid);
  }

  async function stopAutomation(udid: string) {
    return store.stopAutomation(udid);
  }

  async function mountDevImage(udid: string) {
    return store.mountDevImage(udid);
  }

  async function batchStartAutomation(udids: string[]) {
    const results = await Promise.allSettled(
      udids.map(udid => store.startAutomation(udid))
    );
    return results.map(r => r.status === 'fulfilled' ? r.value : false);
  }

  async function batchMountDevImage(udids: string[]) {
    const results = await Promise.allSettled(
      udids.map(udid => store.mountDevImage(udid))
    );
    return results.map(r => r.status === 'fulfilled' ? r.value : false);
  }

  return {
    pairDevice,
    startAutomation,
    stopAutomation,
    mountDevImage,
    batchStartAutomation,
    batchMountDevImage,
  };
}
