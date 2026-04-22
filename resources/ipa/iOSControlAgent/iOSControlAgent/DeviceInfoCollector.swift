//
//  DeviceInfoCollector.swift
//  iOSControlAgent
//
//  设备信息收集 — 收集设备硬件/系统/网络信息
//

import Foundation
import UIKit

class DeviceInfoCollector {

    /// 收集设备信息
    static func collect() -> [String: Any] {
        return [
            "udid": getUDID(),
            "deviceName": UIDevice.current.name,
            "systemName": UIDevice.current.systemName,
            "systemVersion": UIDevice.current.systemVersion,
            "model": UIDevice.current.model,
            "localizedModel": UIDevice.current.localizedModel,
            "identifierForVendor": UIDevice.current.identifierForVendor?.uuidString ?? "",
            "screenBounds": [
                "width": Int(UIScreen.main.bounds.width),
                "height": Int(UIScreen.main.bounds.height),
            ],
            "screenScale": UIScreen.main.scale,
            "batteryLevel": Int(UIDevice.current.batteryLevel * 100),
            "batteryState": batteryStateString(UIDevice.current.batteryState),
            "totalDiskSpace": diskSpace(.total),
            "freeDiskSpace": diskSpace(.free),
            "memory": ProcessInfo.processInfo.physicalMemory,
            "processorCount": ProcessInfo.processInfo.processorCount,
            "timezone": TimeZone.current.identifier,
            "language": Locale.current.language.languageCode?.identifier ?? "",
            "isJailbroken": isJailbroken(),
            "agentVersion": "1.0.0",
            "agentPort": 19402,
        ]
    }

    // MARK: - UDID

    private static func getUDID() -> String {
        // 在 App 沙箱内无法直接获取 UDID
        // 使用 identifierForVendor 或 Keychain 持久化标识
        return UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
    }

    // MARK: - 电池状态

    private static func batteryStateString(_ state: UIDevice.BatteryState) -> String {
        switch state {
        case .unknown: return "unknown"
        case .unplugged: return "unplugged"
        case .charging: return "charging"
        case .full: return "full"
        @unknown default: return "unknown"
        }
    }

    // MARK: - 磁盘空间

    private enum DiskSpaceType { case total, free }

    private static func diskSpace(_ type: DiskSpaceType) -> Int64 {
        do {
            let attrs = try FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
            switch type {
            case .total: return attrs[.systemSize] as? Int64 ?? 0
            case .free: return attrs[.systemFreeSize] as? Int64 ?? 0
            }
        } catch {
            return 0
        }
    }

    // MARK: - 越狱检测

    private static func isJailbroken() -> Bool {
        let jailbreakPaths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt",
        ]
        return jailbreakPaths.contains { FileManager.default.fileExists(atPath: $0) }
    }
}
