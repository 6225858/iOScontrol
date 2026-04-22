//
//  TouchSimulator.swift
//  iOSControlAgentUITests
//
//  触控模拟 — 通过 XCTest 框架实现触控操作
//  在 xctest bundle 中运行，可直接使用 XCTest API
//

import Foundation
import UIKit
import XCTest

class TouchSimulator {

    /// 单击
    static func tap(at point: CGPoint) {
        let coordinate = normalizedCoordinate(for: point)
        coordinate.tap()
    }

    /// 长按
    static func longPress(at point: CGPoint, duration: TimeInterval = 1.0) {
        let coordinate = normalizedCoordinate(for: point)
        coordinate.press(forDuration: duration)
    }

    /// 滑动
    static func swipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
        let startCoordinate = normalizedCoordinate(for: start)
        let endCoordinate = normalizedCoordinate(for: end)
        startCoordinate.press(forDuration: duration, thenDragTo: endCoordinate)
    }

    /// 双击
    static func doubleTap(at point: CGPoint) {
        let coordinate = normalizedCoordinate(for: point)
        coordinate.doubleTap()
    }

    /// 多点触控 (双指缩放)
    static func pinch(scale: CGFloat, velocity: CGFloat = 1.0) {
        let app = XCUIApplication()
        app.pinch(withScale: scale, velocity: velocity)
    }

    // MARK: - 坐标转换

    /// 将像素坐标转换为 XCUIGamepadElement 坐标
    /// 使用 XCUIApplication 的 coordinate(withNormalizedOffset:) 方法
    private static func normalizedCoordinate(for point: CGPoint) -> XCUICoordinate {
        let app = XCUIApplication()
        let normalized = CGVector(
            dx: point.x / UIScreen.main.bounds.width,
            dy: point.y / UIScreen.main.bounds.height
        )
        return app.coordinate(withNormalizedOffset: normalized)
    }
}
