//
//  ScreenCapture.swift
//  iOSControlAgent
//
//  截图功能 — 优先使用 WDA 截图 API，降级到 UIGraphicsImageRenderer
//  WDA 截图可以捕获整个屏幕（包括其他 App），UIGraphics 只能截自身
//

import Foundation
import UIKit

class ScreenCapture {

    /// WDA 截图 — 通过 WebDriverAgent HTTP API 获取屏幕截图
    /// WDA 返回 PNG base64
    private static func takeScreenshotViaWDA() -> UIImage? {
        let wdaPort = 8100
        guard let url = URL(string: "http://127.0.0.1:\(wdaPort)/wd/hub/screenshot") else { return nil }

        let semaphore = DispatchSemaphore(value: 0)
        var resultImage: UIImage?

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 5.0

        URLSession.shared.dataTask(with: request) { data, response, error in
            defer { semaphore.signal() }

            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let value = json["value"] as? String,
                  let imageData = Data(base64Encoded: value) else {
                return
            }
            resultImage = UIImage(data: imageData)
        }.resume()

        _ = semaphore.wait(timeout: .now() + 6.0)
        return resultImage
    }

    /// 本地截图 — 使用 UIGraphicsImageRenderer（只能截自身 App 窗口）
    private static func takeScreenshotLocal() -> UIImage? {
        guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) else {
            return nil
        }

        let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
        return renderer.image { context in
            window.layer.render(in: context.cgContext)
        }
    }

    /// 截取当前屏幕 — 优先 WDA，降级到本地
    static func takeScreenshot() -> UIImage? {
        // 1. 优先使用 WDA 截图（可截整个屏幕，包括其他 App）
        if let image = takeScreenshotViaWDA() {
            return image
        }
        // 2. 降级到本地截图（只能截自身 App）
        return takeScreenshotLocal()
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
