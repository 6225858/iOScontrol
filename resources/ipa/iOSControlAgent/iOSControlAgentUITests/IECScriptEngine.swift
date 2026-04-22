//
//  IECScriptEngine.swift
//  iOSControlAgentUITests
//
//  IEC 脚本引擎 — 提供 EasyClick 兼容的自动化 API
//

import Foundation
import UIKit
import JavaScriptCore

class IECScriptEngine {

    private var globals: [String: Any] = [:]

    /// 设置全局变量
    func setGlobal(key: String, value: Any) {
        globals[key] = value
    }

    /// 执行 IEC 脚本
    func execute(_ script: String) throws {
        let context = JSContext()

        injectIECAPI(into: context)

        for (key, value) in globals {
            context?.setObject(value, forKeyedSubscript: key as NSString)
        }

        var executionError: Error?
        context?.exceptionHandler = { (_: JSContext?, exception: JSValue?) in
            executionError = IECScriptError.runtime(exception?.toString() ?? "unknown error")
        }

        context?.evaluateScript(script)

        if let error = executionError {
            throw error
        }
    }

    // MARK: - 注入 IEC API

    private func injectIECAPI(into context: JSContext?) {
        guard let context = context else { return }

        // auto 对象
        let autoObj = JSValue(newObjectIn: context)
        autoObj?.setObject(autoWaitForBlock(), forKeyedSubscript: "waitFor" as NSString)
        autoObj?.setObject(autoSetModeBlock(), forKeyedSubscript: "setMode" as NSString)
        context.setObject(autoObj, forKeyedSubscript: "auto" as NSString)

        // click(x, y)
        context.setObject(clickBlock(), forKeyedSubscript: "click" as NSString)
        // longClick(x, y, duration)
        context.setObject(longClickBlock(), forKeyedSubscript: "longClick" as NSString)
        // swipe(x1, y1, x2, y2, duration)
        context.setObject(swipeBlock(), forKeyedSubscript: "swipe" as NSString)
        // press(x, y, duration)
        context.setObject(pressBlock(), forKeyedSubscript: "press" as NSString)
        // input(text)
        context.setObject(inputBlock(), forKeyedSubscript: "input" as NSString)
        // screenshot() → base64
        context.setObject(screenshotBlock(), forKeyedSubscript: "screenshot" as NSString)
        // sleep(ms)
        context.setObject(sleepBlock(), forKeyedSubscript: "sleep" as NSString)
        // toast(msg)
        context.setObject(toastBlock(), forKeyedSubscript: "toast" as NSString)
        // log(msg)
        context.setObject(logBlock(), forKeyedSubscript: "log" as NSString)
        // exit()
        context.setObject(exitBlock(), forKeyedSubscript: "exit" as NSString)
        // getDeviceWidth() / getDeviceHeight()
        context.setObject(getDeviceWidthBlock(), forKeyedSubscript: "getDeviceWidth" as NSString)
        context.setObject(getDeviceHeightBlock(), forKeyedSubscript: "getDeviceHeight" as NSString)
        // findNode(query)
        context.setObject(findNodeBlock(), forKeyedSubscript: "findNode" as NSString)
        // findColor(region, color, threshold)
        context.setObject(findColorBlock(), forKeyedSubscript: "findColor" as NSString)
        // ocr(region)
        context.setObject(ocrBlock(), forKeyedSubscript: "ocr" as NSString)
    }

    // MARK: - API Block 实现

    private func autoWaitForBlock() -> @convention(block) (String) -> Void {
        return { _ in Thread.sleep(forTimeInterval: 0.5) }
    }

    private func autoSetModeBlock() -> @convention(block) (String) -> Void {
        return { _ in }
    }

    private func clickBlock() -> @convention(block) (Int, Int) -> Void {
        return { x, y in TouchSimulator.tap(at: CGPoint(x: x, y: y)) }
    }

    private func longClickBlock() -> @convention(block) (Int, Int, Int) -> Void {
        return { x, y, duration in
            TouchSimulator.longPress(at: CGPoint(x: x, y: y), duration: TimeInterval(duration) / 1000)
        }
    }

    private func swipeBlock() -> @convention(block) (Int, Int, Int, Int, Int) -> Void {
        return { x1, y1, x2, y2, duration in
            TouchSimulator.swipe(from: CGPoint(x: x1, y: y1), to: CGPoint(x: x2, y: y2), duration: TimeInterval(duration) / 1000)
        }
    }

    private func pressBlock() -> @convention(block) (Int, Int, Int) -> Void {
        return { x, y, duration in
            TouchSimulator.longPress(at: CGPoint(x: x, y: y), duration: TimeInterval(duration) / 1000)
        }
    }

    private func inputBlock() -> @convention(block) (String) -> Void {
        return { text in KeyboardSimulator.typeText(text) }
    }

    private func screenshotBlock() -> @convention(block) () -> String? {
        return { ScreenCapture.takeScreenshotBase64() }
    }

    private func sleepBlock() -> @convention(block) (Int) -> Void {
        return { ms in Thread.sleep(forTimeInterval: TimeInterval(ms) / 1000) }
    }

    private func toastBlock() -> @convention(block) (String) -> Void {
        return { msg in
            DispatchQueue.main.async {
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
        return { msg in print("[IEC] \(msg)") }
    }

    private func exitBlock() -> @convention(block) () -> Void {
        return { print("[IEC] Script exit() called") }
    }

    private func getDeviceWidthBlock() -> @convention(block) () -> Int {
        return { Int(UIScreen.main.bounds.width) }
    }

    private func getDeviceHeightBlock() -> @convention(block) () -> Int {
        return { Int(UIScreen.main.bounds.height) }
    }

    private func findNodeBlock() -> @convention(block) (String) -> [String: Any]? {
        return { _ in nil }
    }

    private func findColorBlock() -> @convention(block) ([String: Any], Int, Int) -> [String: Any]? {
        return { _, _, _ in nil }
    }

    private func ocrBlock() -> @convention(block) ([String: Any]?) -> [String: Any]? {
        return { _ in nil }
    }
}

// MARK: - 错误类型

enum IECScriptError: Error {
    case runtime(String)
    case unsupported(String)
    case parseError(String)
}
