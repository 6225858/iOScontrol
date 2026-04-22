# iOSControl Agent — 自定义代理 IPA

基于 XCTest Runner 架构的 iOS 设备自动化代理应用。

## 架构

采用 EasyClick-Runner 相同的 XCTest Runner Shell 模式：

```
iOSControlAgent.app (宿主 App, ~100KB)
└── Plugins/
    └── iOSControlAgent.xctest (测试 Bundle)
        └── iosauto.framework (自动化引擎, 待替换)
        └── WebDriverAgentLib.framework (WDA 内嵌)
```

宿主 App 极小，仅负责启动 `.xctest` Bundle。所有自动化逻辑在
`.xctest` 内的 HTTP Server 中运行。

## HTTP API 协议 (/ecnb/)

代理 IPA 在设备端监听端口 (默认 19402)，提供以下 `/ecnb/` 前缀的 API：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/ecnb/ping` | GET | 健康检查 |
| `/ecnb/script/run` | POST | 执行脚本 |
| `/ecnb/script/status` | POST | 查询脚本状态 |
| `/ecnb/script/stop` | POST | 停止脚本 |
| `/ecnb/clipboard/read` | POST | 读取剪切板 |
| `/ecnb/clipboard/write` | POST | 写入剪切板 |
| `/ecnb/file/upload` | POST | 上传文件到设备 |
| `/ecnb/file/download` | POST | 从设备下载文件 |
| `/ecnb/device/info` | GET | 获取设备信息 |

## 构建

### 方式一：macOS + Xcode（推荐）

1. 将 `iOSControlAgent` 目录拷贝到 Mac
2. 打开 `iOSControlAgent.xcodeproj`
3. 选择目标设备或 Generic iOS Device
4. Product → Archive → 导出为 Development IPA
5. 将导出的 `.ipa` 放入项目的 `resources/ipa/` 目录

### 方式二：macOS + XcodeGen

```bash
brew install xcodegen
cd iOSControlAgent
xcodegen generate    # 根据 project.yml 生成 .xcodeproj
open iOSControlAgent.xcodeproj
# 然后在 Xcode 中 Archive
```

### 方式三：Windows + GitHub Actions（无需 Mac）

1. 将项目推送到 GitHub
2. 修改 `.github/workflows/build-ipa.yml` 触发条件，或手动触发 workflow
3. GitHub 会在 macOS runner 上自动构建，产出 unsigned IPA
4. 在 Actions → Artifacts 中下载 `iOSControlAgent-unsigned`

> **注意**: GitHub Actions 构建的 IPA 未签名，需要通过 AltSign/自签工具签名后才能安装到设备。

### 方式四：Windows + 云端 Mac

使用 MacStadium / AWS EC2 Mac / MacinCloud 等云 Mac 服务：
1. SSH 登录云 Mac
2. 拷贝项目源码
3. 执行 `xcodebuild` 命令行构建
4. 下载 IPA 回本地

```bash
# 在云 Mac 上执行
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
```

## 签名要求

- 需要 Apple Developer 证书
- 建议使用企业证书或 Development 证书
- Bundle ID: `com.ioscontrol.agent`
- 无签名 IPA 需通过 AltStore / SideStore / TrollStore 等方式安装

## 项目文件

```
iOSControlAgent/
├── iOSControlAgent.xcodeproj/    # Xcode 项目文件
├── project.yml                   # XcodeGen 配置 (可选)
├── iOSControlAgent/              # 宿主 App 源码
│   ├── AppDelegate.swift         # App 入口
│   ├── ViewController.swift      # 状态界面
│   ├── HTTPServer.swift          # HTTP 服务 + 路由
│   ├── Socket.swift              # TCP Socket 封装
│   ├── ScriptEngine.swift        # 脚本执行引擎
│   ├── IECScriptEngine.swift     # EasyClick 兼容层
│   ├── TouchSimulator.swift      # 触控模拟
│   ├── KeyboardSimulator.swift   # 键盘模拟
│   ├── ScreenCapture.swift       # 截图
│   ├── ClipboardManager.swift    # 剪切板
│   ├── FileTransferManager.swift # 文件传输
│   ├── DeviceInfoCollector.swift # 设备信息
│   ├── Info.plist
│   ├── iOSControlAgent-Bridging-Header.h
│   └── iOSControlAgent.entitlements
├── iOSControlAgentTests/         # XCTest Bundle (Runner)
│   ├── iOSControlAgentTests.swift
│   └── Info.plist
└── README.md
```
