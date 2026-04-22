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
        let app = XCUIApplication()
        app.pinch(withScale: scale, velocity: velocity)
    }

    // MARK: - 触控实现

    private enum TouchType {
        case tap, longPress, doubleTap
    }

    private static func performTouch(at point: CGPoint, type: TouchType, duration: TimeInterval = 1.0) {
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
    }

    private static func performSwipe(from start: CGPoint, to end: CGPoint, duration: TimeInterval = 0.3) {
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
    }
}
