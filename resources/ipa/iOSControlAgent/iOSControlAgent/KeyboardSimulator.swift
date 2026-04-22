//
//  KeyboardSimulator.swift
//  iOSControlAgent
//
//  键盘模拟 — 通过 WDA/XCTest 实现文字输入和按键操作
//

import Foundation
import UIKit

class KeyboardSimulator {

    /// 输入文本
    static func typeText(_ text: String) {
        #if canImport(XCTest)
        let app = XCUIApplication()
        app.typeText(text)
        #else
        // 非 XCTest 环境：通过 UIPasteboard + 粘贴实现
        let pasteboard = UIPasteboard.general
        pasteboard.string = text
        #endif
    }

    /// 按下删除键
    static func deleteKey(count: Int = 1) {
        #if canImport(XCTest)
        let app = XCUIApplication()
        for _ in 0..<count {
            app.keyboards.keys["delete"].tap()
        }
        #else
        print("[KeyboardSimulator] Delete key requires XCTest runtime")
        #endif
    }

    /// 按 Return 键
    static func returnKey() {
        #if canImport(XCTest)
        let app = XCUIApplication()
        app.keyboards.keys["Return"].tap()
        #else
        print("[KeyboardSimulator] Return key requires XCTest runtime")
        #endif
    }

    /// 按 Home 键 (iOS < 13) 或上滑手势 (iOS 13+)
    static func home() {
        #if canImport(XCTest)
        XCUIDevice.shared.press(XCUIDevice.Button.home)
        #else
        print("[KeyboardSimulator] Home button requires XCTest runtime")
        #endif
    }

    /// 音量加
    static func volumeUp() {
        #if canImport(XCTest)
        XCUIDevice.shared.press(XCUIDevice.Button.volumeUp)
        #else
        print("[KeyboardSimulator] Volume up requires XCTest runtime")
        #endif
    }

    /// 音量减
    static func volumeDown() {
        #if canImport(XCTest)
        XCUIDevice.shared.press(XCUIDevice.Button.volumeDown)
        #else
        print("[KeyboardSimulator] Volume down requires XCTest runtime")
        #endif
    }

    /// 锁屏
    static func lockScreen() {
        #if canImport(XCTest)
        XCUIDevice.shared.press(XCUIDevice.Button.home)
        Thread.sleep(forTimeInterval: 0.1)
        XCUIDevice.shared.press(XCUIDevice.Button.home)
        #else
        print("[KeyboardSimulator] Lock screen requires XCTest runtime")
        #endif
    }

    /// 截屏键
    static func screenshotKey() {
        _ = ScreenCapture.takeScreenshot()
    }
}

#if canImport(XCTest)
import XCTest
#endif
