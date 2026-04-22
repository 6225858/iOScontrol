//
//  AppDelegate.swift
//  iOSControlAgent
//
//  XCTest Runner App 入口 — 直接启动 HTTP 代理服务
//  通过 go-ios/tidevice 以 XCUITest 模式启动
//

import UIKit
import XCTest

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

        // 启动 HTTP 代理服务
        httpServer = HTTPServer(port: 19402)
        httpServer?.start()

        return true
    }
}
