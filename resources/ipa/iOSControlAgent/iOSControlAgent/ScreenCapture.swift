//
//  ScreenCapture.swift
//  iOSControlAgent
//
//  截图功能 — 通过 XCTest 框架获取屏幕截图
//

import Foundation
import UIKit

class ScreenCapture {

    /// 截取当前屏幕
    static func takeScreenshot() -> UIImage? {
        #if canImport(XCTest)
        let screenshot = XCUIScreen.main.screenshot()
        return screenshot.image
        #else
        // 非 XCTest 环境：使用 UIGraphics 渲染
        DispatchQueue.main.sync {
            guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) else { return }
            UIGraphicsBeginImageContextWithOptions(window.bounds.size, false, window.screen.scale)
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
            let image = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
            return image
        }
        return nil
        #endif
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

    /// 截取指定区域
    static func takeScreenshot(region: CGRect) -> UIImage? {
        guard let fullImage = takeScreenshot() else { return nil }

        let scale = fullImage.scale
        let scaledRegion = CGRect(
            x: region.origin.x * scale,
            y: region.origin.y * scale,
            width: region.size.width * scale,
            height: region.size.height * scale
        )

        guard let cgImage = fullImage.cgImage?.cropping(to: scaledRegion) else { return nil }
        return UIImage(cgImage: cgImage, scale: scale, orientation: fullImage.imageOrientation)
    }
}

#if canImport(XCTest)
import XCTest
#endif
