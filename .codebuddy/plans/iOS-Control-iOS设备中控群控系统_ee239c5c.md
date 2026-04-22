---
name: iOS-Control-iOS设备中控群控系统
overview: 对标 EasyClick iOSCenter，从零实现一个 iOS 免越狱中控群控桌面应用（Win+Mac），包含设备管理、投屏控制、脚本执行、文件管理、App安装、OCR识别等核心功能模块。
design:
  architecture:
    framework: react
    component: tdesign
  styleKeywords:
    - Dark Tech
    - Cyberpunk Neon UI
    - Dashboard
    - Deep Blue
    - Glassmorphism
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 20px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#00B4D8"
      - "#0077B6"
      - "#023E8A"
    background:
      - "#0A0E1A"
      - "#111827"
      - "#1F2937"
    text:
      - "#F9FAFB"
      - "#D1D5DB"
      - "#9CA3AF"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#F59E0B"
      - "#6366F1"
todos:
  - id: init-monorepo
    content: 初始化 pnpm monorepo 项目结构，配置 Electron + Vue3 + TypeScript + Vite 开发环境
    status: completed
  - id: bridge-service
    content: "实现桥接服务核心: HTTP 服务框架 + 设备发现/监控 + libimobiledevice 工具链封装"
    status: completed
    dependencies:
      - init-monorepo
  - id: device-mgmt
    content: "实现设备管理模块: 设备列表/分组/配对/开发者镜像刷入/自动化环境开启"
    status: completed
    dependencies:
      - bridge-service
  - id: screen-mirror
    content: "实现集控投屏模块: 帧捕获/传输/Canvas渲染 + 多设备同屏 + 鼠标键盘触控映射，使用 [skill:frontend-design] 生成投屏面板UI"
    status: completed
    dependencies:
      - device-mgmt
  - id: script-engine
    content: "实现脚本执行引擎: 单设备/批量执行 + 参数配置 + 定时任务 + 日志采集"
    status: completed
    dependencies:
      - device-mgmt
  - id: file-ocr-ui
    content: 实现文件管理 + OCR 识别 + 完整管理后台UI，使用 [skill:frontend-design] 生成中控界面
    status: completed
    dependencies:
      - screen-mirror
      - script-engine
  - id: cross-platform-pack
    content: "实现 Win+Mac 跨平台打包: electron-builder 配置 + 资源打包 + 安装程序生成"
    status: completed
    dependencies:
      - file-ocr-ui
---

## 产品概述

一款 iOS 免越狱中控群控桌面应用，支持通过 USB 连接管理多台 iOS 设备，实现设备监控、批量操作、实时投屏控制、脚本自动化执行、文件管理和 OCR 识别等功能，部署为 Windows 和 Mac 双平台应用。

## 核心功能

- **设备管理**: USB 自动发现/监控、设备信息获取(UDID/型号/版本)、设备分组、设备配对、iOS17+ tunnel 模式
- **开发者镜像管理**: 自动检测 iOS 版本、批量刷入 DeveloperDiskImage (iOS12.4-26.0)、自动刷入开关
- **自动化环境**: 一键开启开发者模式、安装/启动 WDA、启动代理 IPA、自动化状态检测与诊断
- **集控投屏**: 实时屏幕镜像、多设备同屏、鼠标键盘映射控制、投屏质量/帧率可调、横竖屏切换、HTTP/2 协议
- **脚本执行引擎**: 单设备/批量脚本执行、IEC 脚本格式、脚本参数配置、定时任务调度、脚本录制
- **文件与应用管理**: IPA 安装/卸载、文件传输、剪切板读写、App 数据管理
- **OCR 识别**: 集成 ONNX Runtime、支持多引擎(OcrLite/PaddleOCR)、CPU/GPU 模式
- **中控后台**: HTTP 桥接服务、JWT 认证、分布式部署(WebSocket)、API Key 验证、日志与上传管理

## 技术栈

- **桌面框架**: Electron 33+ (跨平台 Win+Mac，与原项目投屏组件一致)
- **前端框架**: Vue 3 + TypeScript + Vite
- **UI 组件库**: TDesign Vue Next (企业级设计系统，适合中控管理类应用)
- **状态管理**: Pinia
- **桥接服务**: Node.js (Electron 主进程内嵌，独立子进程运行)
- **设备通信**: libimobiledevice (预编译二进制 + Node.js 封装)
- **投屏引擎**: 自研 screen-streamer (基于 iOS USB 截图协议，C++ addon + SharedArrayBuffer 零拷贝 + OffscreenCanvas 高性能渲染，单设备60fps/多设备30fps+)
- **OCR 引擎**: ONNX Runtime Node.js 绑定 (onnxruntime-node)
- **自动化驱动**: WebDriverAgent (通过 HTTP API 调用 WDA 服务)
- **打包构建**: electron-builder (Win: NSIS installer, Mac: DMG)
- **本地数据库**: better-sqlite3 (设备信息、脚本配置、任务记录持久化)

## 实现方案

### 总体策略

采用 Electron 多进程架构：主进程管理窗口和生命周期，桥接服务作为独立子进程运行 HTTP API，渲染进程负责 UI 展示。设备通信通过预编译的 libimobiledevice 工具链实现，投屏通过 C++ Native Addon 实现高性能帧捕获并通过 WebSocket 推送到渲染进程。

### 关键技术决策

1. **桥接服务内嵌 vs 独立**: 选择内嵌子进程方式，用户无需额外安装，启动时自动拉起桥接服务进程。好处是部署简单、用户体验好；代价是进程管理复杂度增加，通过进程守卫和自动重启机制解决。

2. **投屏实现**: 自研 C++ Addon 调用 iOS USB 截图协议实现帧捕获，单设备模式下通过 SharedArrayBuffer 零拷贝传输帧数据到渲染进程，实现 60fps 低延迟投屏；多设备模式下通过 WebSocket 传输压缩帧(JPEG/WebP)，目标 30fps+。渲染侧使用 requestAnimationFrame + OffscreenCanvas 高性能渲染，避免主线程阻塞。投屏引擎内置帧差异检测，静态画面暂停传输以节省 CPU/带宽。

3. **设备通信工具链**: 将 libimobiledevice 的命令行工具(idevice_id, ideviceinstaller, idevicepair 等)预编译为 Win/Mac 二进制，随应用打包分发。通过 Node.js child_process 封装调用，避免复杂的 native binding 兼容性问题。

4. **OCR 集成**: 使用 onnxruntime-node 加载 PaddleOCR ONNX 模型，在 Node.js 侧运行推理，结果通过 IPC 返回渲染进程。支持 CPU 和 GPU(CUDA/CoreML) 模式。

### 性能与可靠性

- 投屏帧率: 目标 30-60fps，单设备投屏最低 60fps，多设备投屏 30fps+，通过帧差异检测减少传输数据量，静态画面暂停传输
- 设备扫描: 监听模式(usbmuxd 事件) + 定时扫描双保险，5秒检测间隔
- 桥接服务: 进程守卫，异常自动重启，最大重启次数限制防止死循环
- 内存管理: 投屏帧缓冲区固定大小环形队列，避免内存泄漏

### 目录结构

```
d:/projects/iOScontrol/
├── packages/
│   ├── main/                          # Electron 主进程
│   │   ├── src/
│   │   │   ├── index.ts               # [NEW] 主进程入口，窗口管理、生命周期
│   │   │   ├── bridge.ts              # [NEW] 桥接服务子进程管理，启动/停止/守护
│   │   │   ├── ipc-handlers.ts        # [NEW] IPC 消息处理注册
│   │   │   ├── tray.ts                # [NEW] 系统托盘管理
│   │   │   └── updater.ts             # [NEW] 自动更新
│   │   └── electron-builder.yml       # [NEW] 打包配置
│   ├── renderer/                      # Vue3 渲染进程
│   │   ├── src/
│   │   │   ├── App.vue                # [NEW] 根组件
│   │   │   ├── main.ts                # [NEW] 渲染进程入口
│   │   │   ├── router/                # [NEW] 路由配置
│   │   │   ├── stores/                # [NEW] Pinia 状态管理
│   │   │   │   ├── device.ts          # [NEW] 设备状态(列表/分组/在线状态)
│   │   │   │   ├── script.ts          # [NEW] 脚本状态(列表/参数/执行状态)
│   │   │   │   └── settings.ts        # [NEW] 全局配置状态
│   │   │   ├── views/                 # [NEW] 页面组件
│   │   │   │   ├── Dashboard.vue      # [NEW] 首页仪表盘(设备概览/状态)
│   │   │   │   ├── DeviceList.vue     # [NEW] 设备列表页(树形/分组)
│   │   │   │   ├── ScreenMirror.vue   # [NEW] 集控投屏页(多设备同屏)
│   │   │   │   ├── ScriptManager.vue  # [NEW] 脚本管理页
│   │   │   │   ├── FileManager.vue    # [NEW] 文件管理页
│   │   │   │   ├── OCRPanel.vue       # [NEW] OCR 识别面板
│   │   │   │   └── Settings.vue       # [NEW] 系统设置页
│   │   │   ├── components/            # [NEW] 可复用组件
│   │   │   │   ├── DeviceCard.vue     # [NEW] 设备卡片(状态/操作)
│   │   │   │   ├── ScreenPlayer.vue   # [NEW] 单设备投屏播放器(Canvas渲染)
│   │   │   │   ├── ScriptEditor.vue   # [NEW] 脚本参数编辑器
│   │   │   │   ├── DeviceTree.vue     # [NEW] 设备分组树
│   │   │   │   └── LogPanel.vue       # [NEW] 日志面板
│   │   │   └── composables/           # [NEW] 组合式函数
│   │   │       ├── useDevice.ts       # [NEW] 设备操作(开启自动化/配对/截图)
│   │   │       ├── useScreen.ts       # [NEW] 投屏控制(连接/帧处理/触控映射)
│   │   │       ├── useScript.ts       # [NEW] 脚本执行(单设备/批量/定时)
│   │   │       └── useOCR.ts          # [NEW] OCR 识别
│   │   └── vite.config.ts             # [NEW] Vite 配置
│   ├── bridge/                        # 桥接服务(独立 Node.js 进程)
│   │   ├── src/
│   │   │   ├── index.ts               # [NEW] 桥接服务入口
│   │   │   ├── server.ts              # [NEW] HTTP 服务(Koa/Fastify)
│   │   │   ├── routes/
│   │   │   │   ├── device.ts          # [NEW] 设备管理 API
│   │   │   │   ├── screen.ts          # [NEW] 投屏控制 API
│   │   │   │   ├── script.ts          # [NEW] 脚本执行 API
│   │   │   │   ├── file.ts            # [NEW] 文件管理 API
│   │   │   │   └── ocr.ts             # [NEW] OCR 识别 API
│   │   │   ├── services/
│   │   │   │   ├── device-manager.ts  # [NEW] 设备发现/监控/配对核心逻辑
│   │   │   │   ├── devimage.ts        # [NEW] 开发者镜像管理(版本匹配/刷入)
│   │   │   │   ├── automation.ts      # [NEW] 自动化环境(WDA启动/代理IPA)
│   │   │   │   ├── screen-streamer.ts # [NEW] 投屏流管理(帧捕获/分发)
│   │   │   │   ├── script-runner.ts   # [NEW] 脚本执行引擎
│   │   │   │   └── ocr-engine.ts      # [NEW] OCR 推理引擎
│   │   │   ├── libimobile/            # [NEW] libimobiledevice 封装
│   │   │   │   ├── index.ts           # [NEW] 统一导出
│   │   │   │   ├── idevice.ts         # [NEW] 设备列表/信息
│   │   │   │   ├── idevicepair.ts     # [NEW] 设备配对
│   │   │   │   ├── ideviceinstaller.ts# [NEW] 应用安装卸载
│   │   │   │   ├── ideviceimagemounter.ts # [NEW] 镜像挂载
│   │   │   │   └── utils.ts           # [NEW] 命令行工具路径解析
│   │   │   └── ws/
│   │   │       └── hub.ts             # [NEW] WebSocket 集中控制中心通信
│   │   └── tsconfig.json
│   └── shared/                        # 共享类型与工具
│       ├── types/
│       │   ├── device.ts              # [NEW] 设备相关类型定义
│       │   ├── script.ts              # [NEW] 脚本相关类型定义
│       │   └── api.ts                 # [NEW] API 请求/响应类型
│       └── constants.ts               # [NEW] 共享常量
├── resources/                         # 静态资源
│   ├── bin/                           # [NEW] 预编译二进制工具
│   │   ├── win/                       # Windows libimobiledevice 工具链
│   │   └── mac/                       # macOS libimobiledevice 工具链
│   ├── DeveloperDiskImage/            # [NEW] iOS 开发者镜像(12.4-26.0)
│   ├── ipa/                           # [NEW] 代理 IPA(EasyClick-Runner)
│   └── ocr-models/                    # [NEW] OCR ONNX 模型文件
├── scripts/                           # [NEW] 构建/打包脚本
│   ├── download-binaries.ts           # [NEW] 下载平台二进制工具
│   └── pack.ts                        # [NEW] 打包脚本
├── package.json                       # [NEW] Monorepo 根配置
├── pnpm-workspace.yaml                # [NEW] pnpm 工作区配置
└── tsconfig.base.json                 # [NEW] 共享 TypeScript 配置
</doc>

## 设计风格

采用深色科技风格(Dark Tech)，以深蓝灰为基调，配合青色/蓝色高亮色，打造专业中控管理氛围。整体布局为左侧导航+顶部工具栏+主内容区的经典中控布局，设备列表区域支持树形分组展示，投屏区域采用网格化多屏排列。

## 页面规划

### 页面1: 仪表盘首页

- 顶部状态栏: 在线设备数/离线数/运行脚本数/异常告警
- 设备概览区: 设备卡片网格，显示设备截图缩略图+型号+状态标签
- 快捷操作区: 一键开启自动化/批量刷入镜像/批量安装App
- 最近任务区: 最近执行的脚本和定时任务列表

### 页面2: 设备管理

- 左侧: 设备分组树(拖拽分组+搜索过滤)
- 中央: 设备列表表格(UDID/型号/iOS版本/自动化状态/在线状态)
- 右键菜单: 开启自动化/配对/刷入镜像/安装App/重启/执行脚本
- 底部: 设备操作日志实时输出

### 页面3: 集控投屏

- 顶部: 投屏布局切换(1/4/9/16宫格)+全屏按钮
- 中央: 设备投屏画面网格，每个画面叠加设备信息标签
- 单画面交互: 点击选中为主控，鼠标操作映射到设备(点击/滑动/输入)
- 侧边栏: 选中设备的快捷操作面板(截屏/录屏/安装App/文件传输/剪切板)

### 页面4: 脚本管理

- 左侧: 脚本目录树+分组
- 中央: 脚本列表(名称/状态/最后执行时间/执行次数)
- 右侧: 脚本参数编辑面板+执行设备选择
- 底部: 脚本执行日志+定时任务配置

### 页面5: 系统设置

- 基础配置: 桥接服务端口/投屏质量帧率/自动刷入镜像开关
- 高级配置: BundleID前缀/iOS17+ tunnel模式/分布式中控地址
- OCR配置: 引擎选择/模型路径/GPU模式
- 关于: 版本信息/日志目录/数据目录

## SubAgent

- **code-explorer**: 在项目搭建过程中，使用 code-explorer 搜索对标项目中的配置文件、二进制工具路径和资源文件结构，确保关键资源(如 libimobiledevice 工具链、开发者镜像、OCR 模型)的正确引用和打包

## Skill

- **frontend-design**: 使用 frontend-design 技能生成高质量的中控管理界面，包括设备卡片、投屏面板、脚本编辑器等核心 UI 组件，确保专业科技风格的视觉呈现