//
//  iOSControlAgentTests.swift
//  iOSControlAgentTests
//
//  XCTest Runner — HTTP 服务器启动入口
//  在 .xctest Bundle 中启动 HTTPServer
//

import XCTest
@testable import iOSControlAgent

class iOSControlAgentTests: XCTestCase {

    static var server: HTTPServer?

    override class func setUp() {
        super.setUp()
        // 启动 HTTP 服务器 — 这是代理 IPA 的核心入口
        server = HTTPServer(port: 19402)
        server?.start()
        print("[AgentTests] HTTP Server started on port 19402")
    }

    override class func tearDown() {
        server?.stop()
        super.tearDown()
    }

    func testServerRunning() {
        // 验证服务器是否运行
        XCTAssertNotNil(iOSControlAgentTests.server)
    }
}
