import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { title: '仪表盘', icon: 'dashboard' },
    },
    {
      path: '/devices',
      name: 'DeviceList',
      component: () => import('@/views/DeviceList.vue'),
      meta: { title: '设备管理', icon: 'devices' },
    },
    {
      path: '/screen',
      name: 'ScreenMirror',
      component: () => import('@/views/ScreenMirror.vue'),
      meta: { title: '集控投屏', icon: 'screen' },
    },
    {
      path: '/scripts',
      name: 'ScriptManager',
      component: () => import('@/views/ScriptManager.vue'),
      meta: { title: '脚本管理', icon: 'script' },
    },
    {
      path: '/files',
      name: 'FileManager',
      component: () => import('@/views/FileManager.vue'),
      meta: { title: '文件管理', icon: 'folder' },
    },
    {
      path: '/ocr',
      name: 'OCRPanel',
      component: () => import('@/views/OCRPanel.vue'),
      meta: { title: 'OCR 识别', icon: 'scan' },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue'),
      meta: { title: '系统设置', icon: 'setting' },
    },
  ],
});

export default router;
