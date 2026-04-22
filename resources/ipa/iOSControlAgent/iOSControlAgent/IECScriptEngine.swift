//
//  IECScriptEngine.swift
//  iOSControlAgent
//
//  IEC 脚本引擎 — 提供 EasyClick 兼容的自动化 API
//  实现 auto, click, longClick, swipe, input, findNode, findColor, ocr 等接口
//

import Foundation
import UIKit

class IECScriptEngine {

    private var globals: [String: Any] = [:]

    /// 设置全局变量
    func setGlobal(key: String, value: Any) {
        globals[key] = value
    }

    /// 执行 IEC 脚本
    func execute(_ script: String) throws {
        // IEC 脚本是基于 JavaScript 的自动化脚本
        // 通过 JavaScriptCore 注入自动化 API 后执行

        #if canImport(JavaScriptCore)
        let context = JSContext()

        // 注入所有自动化 API
        injectIECAPI(into: context)

        // 注入全局变量
        for (key, value) in globals {
            context.setObject(value, forKeyedSubkey: key as NSString)
        }

        // 错误处理
        var executionError: Error?
        context.exceptionHandler = { _, exception in
            executionError = IECScriptError.runtime(exception?.toString() ?? "unknown error")
        }

        // 执行脚本
        context.evaluateScript(script)

        if let error = executionError {
            throw error
        }
        #else
        throw IECScriptError.unsupported("JavaScriptCore not available")
        #endif
    }

    // MARK: - 注入 IEC API

    private func injectIECAPI(into context: JSContext) {
        // auto 对象 — 自动化控制
        let autoObj = JSValue(newObjectIn: context)
        autoObj?.setObject(autoWaitForBlock(), forKeyedSubkey: "waitFor" as NSString)
        autoObj?.setObject(autoSetModeBlock(), forKeyedSubstring: "setMode" as NSString)
        context.setObject(autoObj, forKeyedSubkey: "auto" as NSString)

        // click(x, y)
        context.setObject(clickBlock(), forKeyedSubkey: "click" as NSString)

        // longClick(x, y, duration)
        context.setObject(longClickBlock(), forKeyedSubkey: "longClick" as NSString)

        // swipe(x1, y1, x2, y2, duration)
        context.setObject(swipeBlock(), forKeyedSubkey: "swipe" as NSString)

        // press(x, y, duration)
        context.setObject(pressBlock(), forKeyedSubkey: "press" as NSString)

        // input(text)
        context.setObject(inputBlock(), forKeyedSubkey: "input" as NSString)

        // screenshot() → base64
        context.setObject(screenshotBlock(), forKeyedSubkey: "screenshot" as NSString)

        // sleep(ms)
        context.setObject(sleepBlock(), forKeyedSubkey: "sleep" as NSString)

        // toast(msg)
        context.setObject(toastBlock(), forKeyedSubkey: "toast" as NSString)

        // log(msg)
        context.setObject(logBlock(), forKeyedSubkey: "log" as NSString)

        // exit()
        context.setObject(exitBlock(), forKeyedSubkey: "exit" as NSString)

        // getDeviceWidth() / getDeviceHeight()
        context.setObject(getDeviceWidthBlock(), forKeyedSubkey: "getDeviceWidth" as NSString)
        context.setObject(getDeviceHeightBlock(), forKeyedSubkey: "getDeviceHeight" as NSString)

        // findNode(query) — 查找 UI 节点
        context.setObject(findNodeBlock(), forKeyedSubkey: "findNode" as NSString)

        // findColor(region, color, threshold) — 找色
        context.setObject(findColorBlock(), forKeyedSubkey: "findColor" as NSString)

        // ocr(region) — OCR 识别
        context.setObject(ocrBlock(), forKeyedSubkey: "ocr" as NSString)
    }

    // MARK: - API Block 实现

    private func autoWaitForBlock() -> @convention(block) (String) -> Void {
        return { _ in
            // auto.waitFor — 等待无障碍服务就绪
            Thread.sleep(forTimeInterval: 0.5)
        }
    }

    private func autoSetModeBlock() -> @convention(block) (String) -> Void {
        return { _ in
            // auto.setMode — 设置模式 (暂无实现)
        }
    }

    private func clickBlock() -> @convention(block) (Int, Int) -> Void {
        return { x, y in
            TouchSimulator.tap(at: CGPoint(x: x, y: y))
        }
    }

    private func longClickBlock() -> @convention(block) (Int, Int, Int) -> Void {
        return { x, y, duration in
            TouchSimulator.longPress(at: CGPoint(x: x, y: y), duration: TimeInterval(duration) / 1000)
        }
    }

    private func swipeBlock() -> @convention(block) (Int, Int, Int, Int, Int) -> Void {
        return { x1, y1, x2, y2, duration in
            TouchSimulator.swipe(
                from: CGPoint(x: x1, y: y1),
                to: CGPoint(x: x2, y: y2),
                duration: TimeInterval(duration) / 1000
            )
        }
    }

    private func pressBlock() -> @convention(block) (Int, Int, Int) -> Void {
        return { x, y, duration in
            TouchSimulator.longPress(at: CGPoint(x: x, y: y), duration: TimeInterval(duration) / 1000)
        }
    }

    private func inputBlock() -> @convention(block) (String) -> Void {
        return { text in
            KeyboardSimulator.typeText(text)
        }
    }

    private func screenshotBlock() -> @convention(block) () -> String? {
        return {
            ScreenCapture.takeScreenshotBase64()
        }
    }

    private func sleepBlock() -> @convention(block) (Int) -> Void {
        return { ms in
            Thread.sleep(forTimeInterval: TimeInterval(ms) / 1000)
        }
    }

    private func toastBlock() -> @convention(block) (String) -> Void {
        return { msg in
            DispatchQueue.main.async {
                // 显示 Toast 提示
                let window = UIApplication.shared.windows.first
                let label = UILabel()
                label.text = msg
                label.textAlignment = .center
                label.backgroundColor = UIColor.black.withAlphaComponent(0.7)
                label.textColor = .white
                label.font = UIFont.systemFont(ofSize: 14)
                label.layer.cornerRadius = 8
                label.clipsToBounds = true
                label.sizeToFit()
                label.frame = CGRect(
                    x: (window?.bounds.width ?? 375) / 2 - label.bounds.width / 2 - 16,
                    y: (window?.bounds.height ?? 812) / 2,
                    width: label.bounds.width + 32,
                    height: label.bounds.height + 16
                )
                window?.addSubview(label)
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    label.removeFromSuperview()
                }
            }
        }
    }

    private func logBlock() -> @convention(block) (String) -> Void {
        return { msg in
            print("[IEC] \(msg)")
        }
    }

    private func exitBlock() -> @convention(block) () -> Void {
        return {
            // 标记脚本退出
            print("[IEC] Script exit() called")
        }
    }

    private func getDeviceWidthBlock() -> @convention(block) () -> Int {
        return {
            Int(UIScreen.main.bounds.width)
        }
    }

    private func getDeviceHeightBlock() -> @convention(block) () -> Int {
        return {
            Int(UIScreen.main.bounds.height)
        }
    }

    private func findNodeBlock() -> @convention(block) (String) -> [String: Any]? {
        return { query in
            // 通过 WDA/XCUIElement 查找节点
            // 简化实现 — 返回 nil
            print("[IEC] findNode(\(query)) — not yet implemented")
            return nil
        }
    }

    private func findColorBlock() -> @convention(block) ([String: Any], Int, Int) -> [String: Any]? {
        return { _, _, _ in
            // 找色功能 — 需要截图后进行像素匹配
            print("[IEC] findColor() — not yet implemented")
            return nil
        }
    }

    private func ocrBlock() -> @convention(block) ([String: Any]?) -> [String: Any]? {
        return { _ in
            // OCR 识别 — 需要集成 Vision 框架
            print("[IEC] ocr() — not yet implemented")
            return nil
        }
    }
}

// MARK: - 错误类型

enum IECScriptError: Error {
    case runtime(String)
    case unsupported(String)
    case parseError(String)
}
