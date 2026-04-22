//
//  AppDelegate.swift
//  iOSControlAgent
//
//  宿主 App 入口 — XCUITest Runner 的 host app
//  实际自动化逻辑在 iOSControlAgentUITests 中运行
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
