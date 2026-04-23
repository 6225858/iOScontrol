//
//  ScreenCapture.swift
//  iOSControlAgent
//
//  截图功能 — 通过 XCTest 私有 API 获取屏幕截图
//  使用 Objective-C Runtime 动态调用 XCUIScreen.main.screenshot()
//

import Foundation
import UIKit

class ScreenCapture {

    /// 截取当前屏幕
    static func takeScreenshot() -> UIImage? {
        // 方式1: 通过 XCUIScreen.main.screenshot() 获取
        if let screen = getXCUIMainScreen() {
            let screenshotSel = NSSelectorFromString("screenshot")
            if screen.responds(to: screenshotSel) {
                if let screenshot = performSelector(screen, sel: screenshotSel) {
                    let imageSel = NSSelectorFromString("image")
                    if screenshot.responds(to: imageSel) {
                        if let image = performSelector(screenshot, sel: imageSel) as? UIImage {
                            return image
                        }
                    }
                }
            }
        }

        // 方式2: 降级到 UIGraphics 截图（不依赖 XCTest）
        return fallbackScreenshot()
    }

    /// 截取屏幕并返回 PNG base64
    static func takeScreenshotBase64() -> String? {
        guard let image = takeScreenshot(),
              let data = image.pngData() else {
            return nil
        }
        return data.base64EncodedString()
    }

    /// 截取屏幕并返回 JPEG base64 (带压缩质量)
    static func takeScreenshotJPEG(quality: CGFloat = 0.5) -> String? {
        guard let image = takeScreenshot(),
              let data = image.jpegData(compressionQuality: quality) else {
            return nil
        }
        return data.base64EncodedString()
    }

    // MARK: - Runtime 辅助

    /// 获取 XCUIScreen.mainScreen
    private static func getXCUIMainScreen() -> NSObject? {
        guard let screenClass = NSClassFromString("XCUIScreen") as? NSObject.Type else {
            return nil
        }
        let mainSel = NSSelectorFromString("mainScreen")
        guard screenClass.responds(to: mainSel) else { return nil }

        // class method: XCUIScreen.mainScreen()
        let result = screenClass.perform(mainSel)
        return result?.takeUnretainedValue() as? NSObject
    }

    /// 安全执行 performSelector 并返回 NSObject?
    private static func performSelector(_ target: NSObject, sel: Selector) -> NSObject? {
        let result = target.perform(sel)
        return result?.takeUnretainedValue() as? NSObject
    }

    // MARK: - 降级截图

    /// 使用 UIGraphics 截图（不依赖 XCTest，但只能截取 App 自身窗口）
    private static func fallbackScreenshot() -> UIImage? {
        DispatchQueue.main.sync {
            UIGraphicsBeginImageContextWithOptions(UIScreen.main.bounds.size, false, UIScreen.main.scale)
            defer { UIGraphicsEndImageContext() }
            if let context = UIGraphicsGetCurrentContext() {
                UIApplication.shared.windows.filter { $0.isKeyWindow }.first?.layer.render(in: context)
            }
            return UIGraphicsGetImageFromCurrentImageContext()
        }
    }
}
