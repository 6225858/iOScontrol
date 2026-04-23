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
        if let screenClass = NSClassFromString("XCUIScreen") {
            let mainSel = NSSelectorFromString("mainScreen")
            if screenClass.responds(to: mainSel),
               let screen = screenClass.perform(mainSel)?.takeUnretainedValue() as? NSObject {
                let screenshotSel = NSSelectorFromString("screenshot")
                if screen.responds(to: screenshotSel),
                   let screenshot = screen.perform(screenshotSel)?.takeUnretainedValue() as? NSObject {
                    // XCUIScreenshot 有 image 属性
                    let imageSel = NSSelectorFromString("image")
                    if screenshot.responds(to: imageSel),
                       let image = screenshot.perform(imageSel)?.takeUnretainedValue() as? UIImage {
                        return image
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
