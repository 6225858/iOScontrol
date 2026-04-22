//
//  ClipboardManager.swift
//  iOSControlAgentUITests
//
//  剪切板管理 — 读写系统剪切板
//

import Foundation
import UIKit

class ClipboardManager {

    /// 读取剪切板内容
    func read() -> String {
        let pasteboard = UIPasteboard.general
        return pasteboard.string ?? ""
    }

    /// 写入剪切板
    func write(_ content: String) {
        let pasteboard = UIPasteboard.general
        pasteboard.string = content
    }

    /// 读取剪切板图片 (base64)
    func readImage() -> String? {
        let pasteboard = UIPasteboard.general
        guard let image = pasteboard.image,
              let data = image.pngData() else {
            return nil
        }
        return data.base64EncodedString()
    }

    /// 写入图片到剪切板
    func writeImage(base64: String) {
        guard let data = Data(base64Encoded: base64),
              let image = UIImage(data: data) else {
            return
        }
        UIPasteboard.general.image = image
    }

    /// 清空剪切板
    func clear() {
        UIPasteboard.general.items = []
    }
}
