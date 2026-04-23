# iOSControl Agent — iOS 设备自动化代理 IPA

iOS 15+ 普通 App 模式运行的 iOS 设备自动化代理，在设备上运行 HTTP 服务（/ecnb/ 协议），为 Windows 桌面客户端提供设备控制能力。

## 架构

采用**普通 App 模式**（不依赖 XCTest）：

```
iOSControlAgent.app (~1-2MB)
├── AppDelegate.swift       — App 入口，无条件启动 HTTPServer
├── HTTPServer.swift         — /ecnb/ 协议 HTTP 服务
├── Socket.swift             — POSIX Socket 封装
├── ScreenCapture.swift      — 截图（UIGraphicsImageRenderer）
├── ScriptEngine.swift       — 脚本执行引擎（JavaScriptCore）
├── IECScriptEngine.swift    — EasyClick 兼容层
├── TouchSimulator.swift     — 触控模拟（通过 WDA 代理）
├── KeyboardSimulator.swift  — 键盘模拟（通过 WDA 代理）
├── ClipboardManager.swift   — 剪切板读写
├── FileTransferManager.swift — 文件传输
├── DeviceInfoCollector.swift — 设备信息收集
└── ViewController.swift     — 状态显示界面
```

### 为什么不用 XCTest 模式

- `runwda`（标准 go-ios）在 iOS 16 上会卡住（testmanagerd 无响应）
- `dlopen XCTest` 在非 XCUITest 进程中被 iOS 安全策略阻止
- Ulink/iOScenter 的 iOS 15+ Agent 均以**普通 App** 运行
- 普通 App 模式体积更小（~1MB vs ~3MB），启动更快

### iOS 版本支持

| iOS 版本 | 启动方式 | 说明 |
|----------|----------|------|
| iOS 15-16 | `ios launch` | 普通 App 模式，USB 端口转发 |
| iOS 17.0-17.3 | `ios launch` + CoreDevice tunnel | 需要 tunnel |
| iOS 17.4+ | `ios launch` + tunnel | 管理员/用户模式 |
| iOS 12-14 | 不支持（需 xctest 模式） | 后续迭代 |

## HTTP API 协议 (/ecnb/)

代理 IPA 在设备端监听端口 19402，提供以下 API：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/ecnb/ping` | GET | 健康检查 |
| `/ecnb/screenshot` | GET | 截取屏幕（JPEG base64） |
| `/ecnb/script/run` | POST | 执行脚本 |
| `/ecnb/script/status` | POST | 查询脚本状态 |
| `/ecnb/script/stop` | POST | 停止脚本 |
| `/ecnb/clipboard/read` | POST | 读取剪切板 |
| `/ecnb/clipboard/write` | POST | 写入剪切板 |
| `/ecnb/file/upload` | POST | 上传文件到设备 |
| `/ecnb/file/download` | POST | 从设备下载文件 |
| `/ecnb/device/info` | GET | 获取设备信息 |
| `/ecnb/touch/tap` | POST | 点击（通过 WDA） |
| `/ecnb/touch/longpress` | POST | 长按（通过 WDA） |
| `/ecnb/touch/swipe` | POST | 滑动（通过 WDA） |
| `/ecnb/keyboard/type` | POST | 输入文本（通过 WDA） |
| `/ecnb/keyboard/home` | POST | Home 键（通过 WDA） |

## 构建方式

### 方式一：macOS + XcodeGen（推荐）

```bash
brew install xcodegen
cd iOSControlAgent
xcodegen generate    # 根据 project.yml 生成 .xcodeproj
open iOSControlAgent.xcodeproj
# 然后在 Xcode 中 Archive → 导出 IPA
```

### 方式二：macOS + xcodebuild 命令行

```bash
# 生成项目
xcodegen generate

# 构建
xcodebuild -project iOSControlAgent.xcodeproj \
  -scheme iOSControlAgent \
  -sdk iphoneos \
  -configuration Release \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO \
  ENABLE_BITCODE=NO \
  build

# 打包 IPA
mkdir -p Payload
cp -r build/Build/Products/Release-iphoneos/iOSControlAgent.app Payload/
zip -r iOSControlAgent.ipa Payload/
rm -rf Payload
```

### 方式三：GitHub Actions（无需 Mac）

1. 推送项目到 GitHub
2. 手动触发 workflow 或推送 tag
3. 在 Actions → Artifacts 中下载 IPA

## 安装和启动

```bash
# 安装 IPA（需要签名或 TrollStore）
ios install iOSControlAgent.ipa

# 启动 App
ios launch com.ioscontrol.agent.xctrunner

# 端口转发（USB 连接时）
ios forward 19402 19402

# 测试
curl http://localhost:19402/ecnb/ping
```

## 签名要求

- 需要 Apple Developer 证书
- Bundle ID: `com.ioscontrol.agent.xctrunner`
- 无签名 IPA 需通过 AltStore / SideStore / TrollStore 安装

## 注意事项

- HTTPServer 绑定 `0.0.0.0`（不是 `127.0.0.1`），USB 转发才能访问
- App 需保持前台运行，后台截图返回空白
- 触控/键盘操作通过 WDA 代理执行，需要同时运行 WDA
- `ios launch` 在 iOS 16 上通过 usbmuxd 直接通信，不需要 tunnel
