//
//  KeyboardSimulator.swift
//  iOSControlAgentUITests
//
//  键盘模拟 — 通过 XCTest 实现文字输入和按键操作
//

import Foundation
import UIKit
import XCTest

class KeyboardSimulator {

    /// 输入文本
    static func typeText(_ text: String) {
        let app = XCUIApplication()
        app.typeText(text)
    }

    /// 按下删除键
    static func deleteKey(count: Int = 1) {
        let app = XCUIApplication()
        for _ in 0..<count {
            app.keyboards.keys["delete"].tap()
        }
    }

    /// 按 Return 键
    static func returnKey() {
        let app = XCUIApplication()
        app.keyboards.keys["Return"].tap()
    }

    /// 按 Home 键 (iOS < 13) 或上滑手势 (iOS 13+)
    static func home() {
        XCUIDevice.shared.press(XCUIDevice.Button.home)
    }

    /// 音量加
    static func volumeUp() {
        XCUIDevice.shared.press(XCUIDevice.Button.volumeUp)
    }

    /// 音量减
    static func volumeDown() {
        XCUIDevice.shared.press(XCUIDevice.Button.volumeDown)
    }

    /// 锁屏
    static func lockScreen() {
        XCUIDevice.shared.press(XCUIDevice.Button.home)
        Thread.sleep(forTimeInterval: 0.1)
        XCUIDevice.shared.press(XCUIDevice.Button.home)
    }

    /// 截屏键
    static func screenshotKey() {
        _ = ScreenCapture.takeScreenshot()
    }
}
