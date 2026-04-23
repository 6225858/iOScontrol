//
//  TouchSimulator.swift
//  iOSControlAgent
//
//  触控模拟 — 普通App模式下使用辅助功能或 WDA 代理实现
//  注意：普通 App 无法直接使用 XCTest 触控 API
//  触控操作通过 WDA (WebDriverAgent) 代理执行，或由 Bridge 转发到 WDA
//  这里提供 HTTP 端点，实际触控由 WDA 完成
//

import Foundation
import UIKit

class TouchSimulator {

    /// 单击 — 通过 WDA 代理执行
    /// 在普通 App 模式下，直接触控不可用，需通过 WDA HTTP API
    static func tap(at point: CGPoint) {
        // 尝试通过本地 WDA 代理执行触控
        performTouchViaWDA(action: "tap", params: ["x": point.x, "y": point.y])
    }

    /// 长按
    static func longPress(at point: CGPoint, duration: TimeInterval = 1.0) {
        performTouchViaWDA(action: "longpress", params: ["x": point.x, "y": point.y, "duration": duration])
    }

    /// 滑动
    static func swipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
        performTouchViaWDA(action: "swipe", params: [
            "x1": start.x, "y1": start.y,
            "x2": end.x, "y2": end.y,
            "duration": duration
        ])
    }

    /// 双击
    static func doubleTap(at point: CGPoint) {
        performTouchViaWDA(action: "doubletap", params: ["x": point.x, "y": point.y])
    }

    // MARK: - WDA 代理触控

    /// 通过本地 WDA HTTP API 执行触控操作
    /// WDA 通常运行在 localhost:8100
    private static func performTouchViaWDA(action: String, params: [String: Any]) {
        let wdaHost = "127.0.0.1"
        let wdaPort = 8100

        var endpoint = ""
        var body: [String: Any] = [:]

        switch action {
        case "tap":
            endpoint = "/wd/hub/session/agent/touch/perform"
            body = ["actions": [["action": "tap", "options": ["x": params["x"] ?? 0, "y": params["y"] ?? 0]]]]
        case "longpress":
            endpoint = "/wd/hub/session/agent/touch/perform"
            body = ["actions": [["action": "longPress", "options": ["x": params["x"] ?? 0, "y": params["y"] ?? 0, "duration": params["duration"] ?? 1.0]]]]
        case "swipe":
            endpoint = "/wd/hub/session/agent/touch/perform"
            body = ["actions": [["action": "swipe", "options": params]]]
        case "doubletap":
            endpoint = "/wd/hub/session/agent/touch/perform"
            body = ["actions": [["action": "doubleTap", "options": ["x": params["x"] ?? 0, "y": params["y"] ?? 0]]]]
        default:
            return
        }

        guard let url = URL(string: "http://\(wdaHost):\(wdaPort)\(endpoint)"),
              let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            print("[TouchSimulator] Failed to build WDA request")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = httpBody
        request.timeoutInterval = 5.0

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[TouchSimulator] WDA request failed: \(error.localizedDescription)")
            }
        }.resume()
    }
}
