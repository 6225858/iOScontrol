//
//  AppDelegate.swift
//  iOSControlAgent
//
//  App 入口 — EasyClick 模式
//  通过 dlopen 加载 XCTest 框架，在普通 App 进程中运行自动化代码
//  使用 ios launch 命令直接启动，无需 runwda
//

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var httpServer: HTTPServer?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        window = UIWindow(frame: UIScreen.main.bounds)
        let viewController = ViewController()
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()

        // 加载 XCTest 框架
        loadXCTestFramework()

        // 启动 HTTP 代理服务
        startHTTPServer()

        return true
    }

    // MARK: - 加载 XCTest 框架

    private func loadXCTestFramework() {
        let xctestPaths = [
            // iOS 14+ 系统路径
            "/Developer/Library/PrivateFrameworks/XCTest.framework/XCTest",
            "/Developer/Library/Frameworks/XCTest.framework/XCTest",
            // App 内嵌的 XCTest（build-for-testing 产物）
            "\(Bundle.main.bundlePath)/Frameworks/XCTest.framework/XCTest",
            "\(Bundle.main.bundlePath)/Frameworks/libXCTestSwiftSupport.dylib",
            // PlugIns 中的 XCTest（如果有 xctest bundle）
            "\(Bundle.main.bundlePath)/PlugIns/iOSControlAgentUITests.xctest/Frameworks/XCTest.framework/XCTest",
        ]

        for path in xctestPaths {
            let handle = dlopen(path, RTLD_NOW | RTLD_GLOBAL)
            if handle != nil {
                print("[Agent] ✅ XCTest loaded from: \(path)")
                return
            }
        }

        // 尝试通过 NSBundle 加载
        if let xctestBundle = Bundle(path: "/Developer/Library/PrivateFrameworks/XCTest.framework") ??
                                Bundle(path: "/Developer/Library/Frameworks/XCTest.framework") {
            if xctestBundle.load() {
                print("[Agent] ✅ XCTest loaded via NSBundle")
                return
            }
        }

        print("[Agent] ⚠️ XCTest framework not loaded, automation APIs may not work")
        print("[Agent] ⚠️ App will still run HTTP server for non-automation endpoints")
    }

    // MARK: - 启动 HTTP 服务

    private func startHTTPServer() {
        httpServer = HTTPServer(port: 19402)
        httpServer?.start()

        if httpServer?.isRunning == true {
            print("[Agent] ✅ HTTP server started on port 19402")

            // 通知 ViewController 更新状态
            DispatchQueue.main.async {
                if let vc = self.window?.rootViewController as? ViewController {
                    vc.updateStatus(running: true)
                }
            }
        } else {
            print("[Agent] ❌ HTTP server failed to start")
        }
    }
}
