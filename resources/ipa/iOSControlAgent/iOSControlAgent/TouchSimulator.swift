//
//  TouchSimulator.swift
//  iOSControlAgent
//
//  触控模拟 — 通过 WDA/XCTest 框架实现触控操作
//

import Foundation
import UIKit

class TouchSimulator {

    /// 单击
    static func tap(at point: CGPoint) {
        performTouch(at: point, type: .tap)
    }

    /// 长按
    static func longPress(at point: CGPoint, duration: TimeInterval = 1.0) {
        performTouch(at: point, type: .longPress, duration: duration)
    }

    /// 滑动
    static func swipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
        performSwipe(from: start, to: end, duration: duration)
    }

    /// 双击
    static func doubleTap(at point: CGPoint) {
        performTouch(at: point, type: .doubleTap)
    }

    /// 多点触控 (双指缩放)
    static func pinch(scale: CGFloat, velocity: CGFloat = 1.0) {
        // 通过 performSelector 调用 XCTest 方法（仅在 xctest bundle 中有效）
        #if canImport(XCTest)
        let app = XCUIApplication()
        app.pinch(withScale: scale, velocity: velocity)
        #endif
    }

    // MARK: - 通过 XCUITouchCoordinatePerformAction 实现触控

    private enum TouchType {
        case tap, longPress, doubleTap
    }

    private static func performTouch(at point: CGPoint, type: TouchType, duration: TimeInterval = 1.0) {
        #if canImport(XCTest)
        let normalized = CGVector(
            dx: point.x / UIScreen.main.bounds.width,
            dy: point.y / UIScreen.main.bounds.height
        )
        let coordinate = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
            .coordinate(withNormalizedOffset: normalized)

        switch type {
        case .tap:
            coordinate.tap()
        case .longPress:
            coordinate.press(forDuration: duration)
        case .doubleTap:
            coordinate.doubleTap()
        }
        #else
        // 非 XCTest 环境：通过 UIEvent 远程触控（越狱环境可用）
        // 降级方案：使用辅助功能 API
        print("[TouchSimulator] Touch simulation requires XCTest runtime")
        #endif
    }

    private static func performSwipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
        #if canImport(XCTest)
        let screenBounds = UIScreen.main.bounds
        let startCoordinate = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
            .coordinate(withNormalizedOffset: CGVector(
                dx: start.x / screenBounds.width,
                dy: start.y / screenBounds.height
            ))
        let endCoordinate = XCUIDevice.shared.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
            .coordinate(withNormalizedOffset: CGVector(
                dx: end.x / screenBounds.width,
                dy: end.y / screenBounds.height
            ))
        startCoordinate.press(forDuration: duration, thenDragTo: endCoordinate)
        #else
        print("[TouchSimulator] Swipe simulation requires XCTest runtime")
        #endif
    }
}

#if canImport(XCTest)
import XCTest
#endif
