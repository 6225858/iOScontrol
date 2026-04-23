//
//  AppDelegate.swift
//  iOSControlAgent
//
//  App 入口 — 纯 UI 壳
//  自动化代码运行在 XCUITest 进程中，由 runwda 启动
//  AppDelegate 只负责显示状态界面
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
