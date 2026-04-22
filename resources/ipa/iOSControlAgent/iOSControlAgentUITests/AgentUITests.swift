//
//  AgentUITests.swift
//  iOSControlAgentUITests
//
//  UI 测试入口 — XCTRunner 模式下保持测试进程存活
//  主 App (XCTRunner) 已在 AppDelegate 中启动 HTTP 服务器
//  此测试仅用于保持 XCUITest 进程不退出
//

import XCTest

class AgentUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = true

        // 启动被测 App（XCTRunner 自身已启动 HTTP 服务器）
        let app = XCUIApplication()
        app.launch()

        print("[Agent] ✅ XCTRunner app launched")
    }

    /// 永久运行的测试 — 保持测试进程存活
    /// HTTP 服务器由主 App 的 AppDelegate 启动和管理
    /// 此处仅需保持 XCUITest 进程不退出
    func testAgentServer() {
        print("[Agent] 🚀 Agent server running (HTTP server managed by AppDelegate), keeping test alive...")

        let keepAlive = true
        while keepAlive {
            sleep(10)
        }
    }
}
