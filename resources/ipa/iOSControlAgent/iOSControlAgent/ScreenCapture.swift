//
//  ScreenCapture.swift
//  iOSControlAgent
//
//  截图功能 — 使用 UIGraphicsImageRenderer 截图（不依赖 XCTest）
//  注意：App 在后台时截图会返回空白，需保持前台运行
//

import Foundation
import UIKit

class ScreenCapture {

    /// 截取当前屏幕 — 使用 UIGraphicsImageRenderer（普通 App 可用）
    static func takeScreenshot() -> UIImage? {
        guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) else {
            return nil
        }

        let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
        return renderer.image { context in
            window.layer.render(in: context.cgContext)
        }
    }

    /// 截取屏幕并返回 PNG base64
    static func takeScreenshotBase64() -> String? {
        guard let image = takeScreenshot(),
              let data = image.pngData() else {
            return nil
        }
        return data.base64EncodedString()
    }

    /// 截取屏幕并返回 JPEG base64 (带压缩质量，适合投屏帧传输)
    static func takeScreenshotJPEG(quality: CGFloat = 0.5) -> String? {
        guard let image = takeScreenshot(),
              let data = image.jpegData(compressionQuality: quality) else {
            return nil
        }
        return data.base64EncodedString()
    }

    /// 截取屏幕并返回 JPEG Data（用于二进制帧传输）
    static func takeScreenshotJPEGData(quality: CGFloat = 0.5) -> Data? {
        guard let image = takeScreenshot() else { return nil }
        return image.jpegData(compressionQuality: quality)
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
