//
//  TouchSimulator.swift
//  iOSControlAgent
//
//  触控模拟 — 通过 WDA/XCTest 框架实现触控操作
//

import Foundation
import XCTest

class TouchSimulator {

    /// 单击
    static func tap(at point: CGPoint) {
        let event = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
        // 使用屏幕坐标
        let screenPoint = event.coordinate(withNormalizedOffset: CGVector(
            dx: point.x / UIScreen.main.bounds.width,
            dy: point.y / UIScreen.main.bounds.height
        ))
        screenPoint.tap()
    }

    /// 长按
    static func longPress(at point: CGPoint, duration: TimeInterval = 1.0) {
        let event = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
        let screenPoint = event.coordinate(withNormalizedOffset: CGVector(
            dx: point.x / UIScreen.main.bounds.width,
            dy: point.y / UIScreen.main.bounds.height
        ))
        screenPoint.press(forDuration: duration)
    }

    /// 滑动
    static func swipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
        let event = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
        let screenBounds = UIScreen.main.bounds

        let startPoint = event.coordinate(withNormalizedOffset: CGVector(
            dx: start.x / screenBounds.width,
            dy: start.y / screenBounds.height
        ))
        let endPoint = event.coordinate(withNormalizedOffset: CGVector(
            dx: end.x / screenBounds.width,
            dy: end.y / screenBounds.height
        ))
        startPoint.press(forDuration: duration, thenDragTo: endPoint)
    }

    /// 双击
    static func doubleTap(at point: CGPoint) {
        let event = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
        let screenPoint = event.coordinate(withNormalizedOffset: CGVector(
            dx: point.x / UIScreen.main.bounds.width,
            dy: point.y / UIScreen.main.bounds.height
        ))
        screenPoint.doubleTap()
    }

    /// 多点触控 (双指缩放)
    static func pinch(scale: CGFloat, velocity: CGFloat = 1.0) {
        // 通过 XCUIElement 的 pinch 实现
        let app = XCUIApplication()
        app.pinch(withScale: scale, velocity: velocity)
    }
}
