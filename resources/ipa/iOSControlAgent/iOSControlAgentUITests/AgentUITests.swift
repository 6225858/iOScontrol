//
//  AgentUITests.swift
//  iOSControlAgentUITests
//
//  XCUITest 入口 — 在 XCTest 运行时中启动 HTTP 代理服务
//  go-ios runwda 会启动此测试，获得触控/键盘模拟权限
//

import XCTest

class AgentUITests: XCTestCase {

    private var httpServer: HTTPServer?

    override func setUpWithError() throws {
        continueAfterFailure = true

        // 启动被测 App
        let app = XCUIApplication()
        app.launch()

        // 在 XCTest 运行时中启动 HTTP 代理服务
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

        let keepAlive = true
        while keepAlive {
            if httpServer?.isRunning == true {
                sleep(10)
            } else {
                print("[Agent] ❌ Server stopped unexpectedly")
                break
            }
        }
    }
}
