# iOS 代理 IPA

将代理 IPA 文件放置在此目录。

## 可选方案

### 1. 使用 EasyClick-Runner.ipa (已有)
预置的 EasyClick 代理 IPA，即插即用，使用 `/ecnb/` 协议。

### 2. 使用自定义 iOSControlAgent (推荐)
在 `iOSControlAgent/` 目录下有完整的 Xcode 项目源码：
- 基于 XCTest Runner 架构
- 原生 Swift 实现，不依赖第三方 framework
- 提供完整的 `/ecnb/` HTTP API 协议
- 支持 IEC 脚本执行、触控模拟、剪切板、文件传输

**构建步骤：**
1. 用 Xcode 打开 `iOSControlAgent/iOSControlAgent.xcodeproj`
2. 按照项目目录中的 README.md 创建项目并添加源文件
3. Archive → 导出 Development IPA
4. 将导出的 `.ipa` 复制到此目录

## 端口说明

| 服务 | 端口 | 协议 |
|------|------|------|
| 代理 IPA | 19402 | /ecnb/ |
| 辅助 App | 18924 | /devapi/ |
| WDA | 8100-8200 | WebDriverAgent |
