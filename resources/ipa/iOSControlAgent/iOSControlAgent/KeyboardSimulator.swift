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
            // 通过 keyboards.keys["delete"].tap() 的 runtime 等效调用
            let keyboardsSel = NSSelectorFromString("keyboards")
            if app.responds(to:keyboardsSel),
               let keyboards = app.perform(keyboardsSel)?.takeUnretainedValue() as? NSObject {
                let keysSel = NSSelectorFromString("keys")
                if keyboards.responds(to: keysSel) {
                    if let keys = keyboards.perform(keysSel)?.takeUnretainedValue() as? NSObject {
                        let objectForKeyedSubscriptSel = NSSelectorFromString("objectForKeyedSubscript:")
                        if let deleteKey = keys.perform(objectForKeyedSubscriptSel, with: "delete")?.takeUnretainedValue() as? NSObject {
                            let tapSel = NSSelectorFromString("tap")
                            if deleteKey.responds(to: tapSel) {
                                _ = deleteKey.perform(tapSel)
                            }
                        }
                    }
                }
            }
        }
    }

    /// 按 Return 键
    static func returnKey() {
        guard let app = getXCUIApplication() else { return }
        let keyboardsSel = NSSelectorFromString("keyboards")
        if app.responds(to: keyboardsSel),
           let keyboards = app.perform(keyboardsSel)?.takeUnretainedValue() as? NSObject {
            let keysSel = NSSelectorFromString("keys")
            if keyboards.responds(to: keysSel) {
                if let keys = keyboards.perform(keysSel)?.takeUnretainedValue() as? NSObject {
                    let objectForKeyedSubscriptSel = NSSelectorFromString("objectForKeyedSubscript:")
                    if let returnKey = keys.perform(objectForKeyedSubscriptSel, with: "Return")?.takeUnretainedValue() as? NSObject {
                        let tapSel = NSSelectorFromString("tap")
                        if returnKey.responds(to: tapSel) {
                            _ = returnKey.perform(tapSel)
                        }
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
            // XCUIDevice.Button.home = 1
            _ = device.perform(sel, with: NSNumber(value: 1))
        }
    }

    /// 音量加
    static func volumeUp() {
        guard let device = getXCUIDevice() else { return }
        let sel = NSSelectorFromString("pressButton:")
        if device.responds(to: sel) {
            // XCUIDevice.Button.volumeUp = 2
            _ = device.perform(sel, with: NSNumber(value: 2))
        }
    }

    /// 音量减
    static func volumeDown() {
        guard let device = getXCUIDevice() else { return }
        let sel = NSSelectorFromString("pressButton:")
        if device.responds(to: sel) {
            // XCUIDevice.Button.volumeDown = 3
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

    private static func getXCUIApplication() -> NSObject? {
        if let appClass = NSClassFromString("XCUIApplication") as? NSObject.Type {
            let sharedSel = NSSelectorFromString("shared")
            if appClass.responds(to: sharedSel) {
                if let result = appClass.perform(sharedSel),
                   let app = result.takeUnretainedValue() as? NSObject {
                    return app
                }
            }
            return appClass.init()
        }
        print("[KeyboardSimulator] ⚠️ XCUIApplication class not found")
        return nil
    }

    private static func getXCUIDevice() -> NSObject? {
        if let deviceClass = NSClassFromString("XCUIDevice") as? NSObject.Type {
            let sharedSel = NSSelectorFromString("shared")
            if deviceClass.responds(to: sharedSel) {
                if let result = deviceClass.perform(sharedSel),
                   let device = result.takeUnretainedValue() as? NSObject {
                    return device
                }
            }
            return deviceClass.init()
        }
        print("[KeyboardSimulator] ⚠️ XCUIDevice class not found")
        return nil
    }
}
