//
//  KeyboardSimulator.swift
//  iOSControlAgent
//
//  键盘模拟 — 通过 XCTest 私有 API 实现文字输入和按键操作
//  使用 Objective-C Runtime 动态调用
//

import Foundation
import UIKit

class KeyboardSimulator {

    /// 输入文本
    static func typeText(_ text: String) {
        guard let app = getXCUIApplication() else { return }
        let sel = NSSelectorFromString("typeText:")
        if app.responds(to: sel) {
            _ = app.perform(sel, with: text)
        }
    }

    /// 按下删除键
    static func deleteKey(count: Int = 1) {
        guard let app = getXCUIApplication() else { return }
        for _ in 0..<count {
            if let keyboards = runtimeCall(app, sel: "keyboards") {
                if let keys = runtimeCall(keyboards, sel: "keys") {
                    if let deleteKey = runtimeCall(keys, sel: "objectForKeyedSubscript:", arg: "delete" as NSString) {
                        let tapSel = NSSelectorFromString("tap")
                        if deleteKey.responds(to: tapSel) {
                            _ = deleteKey.perform(tapSel)
                        }
                    }
                }
            }
        }
    }

    /// 按 Return 键
    static func returnKey() {
        guard let app = getXCUIApplication() else { return }
        if let keyboards = runtimeCall(app, sel: "keyboards") {
            if let keys = runtimeCall(keyboards, sel: "keys") {
                if let returnKey = runtimeCall(keys, sel: "objectForKeyedSubscript:", arg: "Return" as NSString) {
                    let tapSel = NSSelectorFromString("tap")
                    if returnKey.responds(to: tapSel) {
                        _ = returnKey.perform(tapSel)
                    }
                }
            }
        }
    }

    /// 按 Home 键 (iOS < 13) 或上滑手势 (iOS 13+)
    static func home() {
        guard let device = getXCUIDevice() else { return }
        let sel = NSSelectorFromString("pressButton:")
        if device.responds(to: sel) {
            _ = device.perform(sel, with: NSNumber(value: 1))
        }
    }

    /// 音量加
    static func volumeUp() {
        guard let device = getXCUIDevice() else { return }
        let sel = NSSelectorFromString("pressButton:")
        if device.responds(to: sel) {
            _ = device.perform(sel, with: NSNumber(value: 2))
        }
    }

    /// 音量减
    static func volumeDown() {
        guard let device = getXCUIDevice() else { return }
        let sel = NSSelectorFromString("pressButton:")
        if device.responds(to: sel) {
            _ = device.perform(sel, with: NSNumber(value: 3))
        }
    }

    /// 锁屏
    static func lockScreen() {
        home()
        Thread.sleep(forTimeInterval: 0.1)
        home()
    }

    // MARK: - Runtime 辅助

    /// 对实例执行无参数 selector 并返回 NSObject?
    private static func runtimeCall(_ target: NSObject, sel: String) -> NSObject? {
        let selector = NSSelectorFromString(sel)
        guard target.responds(to: selector) else { return nil }
        let result = target.perform(selector)
        if let unmanaged = result {
            return unmanaged.takeUnretainedValue() as? NSObject
        }
        return nil
    }

    /// 对实例执行单参数 selector 并返回 NSObject?
    private static func runtimeCall(_ target: NSObject, sel: String, arg: NSObject) -> NSObject? {
        let selector = NSSelectorFromString(sel)
        guard target.responds(to: selector) else { return nil }
        let result = target.perform(selector, with: arg)
        if let unmanaged = result {
            return unmanaged.takeUnretainedValue() as? NSObject
        }
        return nil
    }

    private static func getXCUIApplication() -> NSObject? {
        guard let appClass = NSClassFromString("XCUIApplication") as? NSObject.Type else {
            print("[KeyboardSimulator] ⚠️ XCUIApplication class not found")
            return nil
        }
        let sharedSel = NSSelectorFromString("shared")
        if appClass.responds(to: sharedSel) {
            let result = appClass.perform(sharedSel)
            if let unmanaged = result {
                if let app = unmanaged.takeUnretainedValue() as? NSObject {
                    return app
                }
            }
        }
        return appClass.init()
    }

    private static func getXCUIDevice() -> NSObject? {
        guard let deviceClass = NSClassFromString("XCUIDevice") as? NSObject.Type else {
            print("[KeyboardSimulator] ⚠️ XCUIDevice class not found")
            return nil
        }
        let sharedSel = NSSelectorFromString("shared")
        if deviceClass.responds(to: sharedSel) {
            let result = deviceClass.perform(sharedSel)
            if let unmanaged = result {
                if let device = unmanaged.takeUnretainedValue() as? NSObject {
                    return device
                }
            }
        }
        return deviceClass.init()
    }
}
