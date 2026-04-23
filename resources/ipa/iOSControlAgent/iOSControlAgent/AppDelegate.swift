//
//  AppDelegate.swift
//  iOSControlAgent
//
//  App 入口 — iOS 15+ 普通 App 模式
//  HTTPServer 在 applicationDidFinishLaunching 中无条件启动
//  不依赖 XCTest，通过 ios launch 启动
//

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var httpServer: HTTPServer?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        window = UIWindow(frame: UIScreen.main.bounds)
        let viewController = ViewController()
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()

        // 无条件启动 HTTP Server — 不依赖 XCTest
        httpServer = HTTPServer(port: 19402)
        httpServer?.start()

        print("[Agent] HTTP server started on port 19402")

        // 请求前台权限保持 App 存活
        application.isIdleTimerDisabled = true

        // 注册后台保活
        registerBackgroundTask()

        return true
    }

    // MARK: - 后台保活

    private func registerBackgroundTask() {
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "AgentKeepAlive") {
            // 后台时间即将过期
            self.endBackgroundTask()
        }
    }

    private func endBackgroundTask() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }

    // MARK: - UISceneSession (iOS 13+)

    @available(iOS 13.0, *)
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    // MARK: - App 生命周期

    func applicationWillEnterForeground(_ application: UIApplication) {
        // 重新注册后台任务
        registerBackgroundTask()
        print("[Agent] App entering foreground, server running: \(httpServer?.isRunning ?? false)")
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        print("[Agent] App entering background, server running: \(httpServer?.isRunning ?? false)")
    }
}
