//
//  AppDelegate.swift
//  iOSControlAgent
//
//  宿主 App 入口 — 纯 UI 壳，不导入 XCTest
//  HTTP 服务器和自动化功能由 XCUITest bundle 中的 AgentUITests 启动
//  通过 go-ios runwda 命令以 XCUITest 模式运行
//

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        window = UIWindow(frame: UIScreen.main.bounds)

        let viewController = ViewController()
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()

        return true
    }
}
