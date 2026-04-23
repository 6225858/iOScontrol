//
//  TouchSimulator.swift
//  iOSControlAgent
//
//  触控模拟 — 通过 XCTest 私有 API 实现触控操作
//  使用 Objective-C Runtime 动态调用，无需编译时 import XCTest
//  运行时通过 dlopen 加载 XCTest 框架后即可使用
//

import Foundation
import UIKit

class TouchSimulator {

    /// 单击
    static func tap(at point: CGPoint) {
        guard let coordinate = getCoordinate(for: point) else {
            print("[TouchSimulator] ⚠️ Cannot get coordinate for tap")
            return
        }
        let sel = NSSelectorFromString("tap")
        if coordinate.responds(to: sel) {
            _ = coordinate.perform(sel)
        }
    }

    /// 长按
    static func longPress(at point: CGPoint, duration: TimeInterval = 1.0) {
        guard let coordinate = getCoordinate(for: point) else { return }
        let sel = NSSelectorFromString("pressForDuration:")
        if coordinate.responds(to: sel) {
            _ = coordinate.perform(sel, with: NSNumber(value: duration))
        }
    }

    /// 滑动
    static func swipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
        guard let startCoord = getCoordinate(for: start),
              let endCoord = getCoordinate(for: end) else { return }
        let sel = NSSelectorFromString("pressForDuration:thenDragToCoordinate:")
        if startCoord.responds(to: sel) {
            _ = startCoord.perform(sel, with: NSNumber(value: duration), with: endCoord)
        }
    }

    /// 双击
    static func doubleTap(at point: CGPoint) {
        guard let coordinate = getCoordinate(for: point) else { return }
        let sel = NSSelectorFromString("doubleTap")
        if coordinate.responds(to: sel) {
            _ = coordinate.perform(sel)
        }
    }

    // MARK: - 坐标转换

    /// 将像素坐标转换为 XCUICoordinate 对象
    /// 通过 Runtime 调用 XCUIApplication.coordinateWithNormalizedOffset:
    private static func getCoordinate(for point: CGPoint) -> NSObject? {
        guard let app = getXCUIApplication() else { return nil }

        let normalizedX = point.x / UIScreen.main.bounds.width
        let normalizedY = point.y / UIScreen.main.bounds.height
        let vector = CGVector(dx: normalizedX, dy: normalizedY)

        let sel = NSSelectorFromString("coordinateWithNormalizedOffset:")
        guard app.responds(to: sel) else {
            print("[TouchSimulator] ⚠️ coordinateWithNormalizedOffset: not available")
            return nil
        }

        let nsValue = NSValue(cgVector: vector)
        let result = app.perform(sel, with: nsValue)
        return result?.takeUnretainedValue() as? NSObject
    }

    /// 获取 XCUIApplication 实例
    private static func getXCUIApplication() -> NSObject? {
        guard let appClass = NSClassFromString("XCUIApplication") as? NSObject.Type else {
            print("[TouchSimulator] ⚠️ XCUIApplication class not found")
            return nil
        }

        // 尝试 XCUIApplication.shared
        let sharedSel = NSSelectorFromString("shared")
        if appClass.responds(to: sharedSel) {
            let result = appClass.perform(sharedSel)
            if let unmanaged = result {
                if let app = unmanaged.takeUnretainedValue() as? NSObject {
                    return app
                }
            }
        }

        // 降级：创建新实例
        return appClass.init()
    }
}
