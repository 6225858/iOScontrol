//
//  KeyboardSimulator.swift
//  iOSControlAgent
//
//  键盘模拟 — 普通App模式下通过 WDA 代理或辅助功能实现
//

import Foundation
import UIKit

class KeyboardSimulator {

    /// 输入文本 — 通过 WDA 代理执行
    static func typeText(_ text: String) {
        guard let url = URL(string: "http://127.0.0.1:8100/wd/hub/session/element"),
              let body = try? JSONSerialization.data(withJSONObject: ["using": "partial", "value": ""]) else {
            return
        }

        // 使用 WDA 的 input 方法
        let inputUrl = URL(string: "http://127.0.0.1:8100/wd/hub/session/agent/keys")!
        var request = URLRequest(url: inputUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["value": Array(text.map { String($0) })])
        request.timeoutInterval = 5.0

        URLSession.shared.dataTask(with: request) { _, _, error in
            if let error = error {
                print("[KeyboardSimulator] WDA type text failed: \(error.localizedDescription)")
            }
        }.resume()
    }

    /// 按下删除键
    static func deleteKey(count: Int = 1) {
        for _ in 0..<count {
            TouchSimulator.tap(at: CGPoint(x: 0, y: 0)) // placeholder
        }
    }

    /// 按 Home 键 — 通过 WDA 执行
    static func home() {
        guard let url = URL(string: "http://127.0.0.1:8100/wd/hub/session/agent/wda/homescreen") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 5.0

        URLSession.shared.dataTask(with: request) { _, _, error in
            if let error = error {
                print("[KeyboardSimulator] WDA home failed: \(error.localizedDescription)")
            }
        }.resume()
    }

    /// 音量加 — 需要辅助功能权限，普通 App 无法直接调用
    static func volumeUp() {
        print("[KeyboardSimulator] volumeUp not available in app mode")
    }

    /// 音量减 — 需要辅助功能权限
    static func volumeDown() {
        print("[KeyboardSimulator] volumeDown not available in app mode")
    }
}
