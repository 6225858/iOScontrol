//
//  AgentUITests.swift
//  iOSControlAgentUITests
//
//  UI 测试入口 — 在 XCTest 环境中启动 HTTP 代理服务
//  通过 XCUITest Runner 运行，获得完整的触控/键盘模拟权限
//

import XCTest

class AgentUITests: XCTestCase {

    private var httpServer: HTTPServer?

    override func setUpWithError() throws {
        continueAfterFailure = true

        // 启动被测 App
        let app = XCUIApplication()
        app.launch()

        // 启动 HTTP 代理服务
        httpServer = HTTPServer(port: 19402)
        httpServer?.start()

        print("[Agent] ✅ HTTP server started on port 19402")
    }

    override func tearDownWithError() throws {
        httpServer?.stop()
        httpServer = nil
    }

    /// 永久运行的测试 — 保持代理服务不退出
    /// 通过无限循环 + sleep 保持测试进程存活
    func testAgentServer() {
        print("[Agent] 🚀 Agent server running, keeping test alive...")

        // 保持测试进程存活，直到被外部终止
        // 对标项目也是类似的永续运行模式
        let keepAlive = true
        while keepAlive {
            // 检查服务是否仍在运行
            if httpServer?.isRunning == true {
                sleep(10)
            } else {
                print("[Agent] ❌ Server stopped unexpectedly")
                break
            }
        }
    }
}
