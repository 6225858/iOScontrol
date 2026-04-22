//
//  ScriptEngine.swift
//  iOSControlAgent
//
//  脚本执行引擎 — 管理脚本任务的创建、执行、状态追踪
//

import Foundation

// MARK: - 脚本任务状态

enum ScriptTaskStatus: String, Codable {
    case pending = "pending"
    case running = "running"
    case completed = "completed"
    case failed = "failed"
    case stopped = "stopped"
}

struct ScriptTask: Codable {
    let taskId: String
    let scriptName: String
    var status: ScriptTaskStatus
    var progress: Double
    var log: String?
    var error: String?
    let createdAt: Date
    var completedAt: Date?
}

// MARK: - 脚本引擎

class ScriptEngine {
    private var tasks: [String: ScriptTask] = [:]
    private let queue = DispatchQueue(label: "com.ioscontrol.agent.script", qos: .utility)

    /// 执行脚本
    func runScript(taskId: String, script: String, name: String, params: [String: AnyCodable]?) {
        let task = ScriptTask(
            taskId: taskId,
            scriptName: name,
            status: .pending,
            progress: 0,
            createdAt: Date()
        )
        tasks[taskId] = task

        // 在后台线程执行脚本
        queue.async { [weak self] in
            self?.executeScript(taskId: taskId, script: script, params: params)
        }
    }

    /// 获取脚本状态
    func getScriptStatus(taskId: String) -> [String: Any] {
        guard let task = tasks[taskId] else {
            return ["status": "not_found", "taskId": taskId]
        }
        return [
            "taskId": task.taskId,
            "scriptName": task.scriptName,
            "status": task.status.rawValue,
            "progress": task.progress,
            "log": task.log ?? "",
            "error": task.error ?? "",
        ]
    }

    /// 停止脚本
    func stopScript(taskId: String) {
        if var task = tasks[taskId] {
            task.status = .stopped
            task.completedAt = Date()
            tasks[taskId] = task
        }
    }

    // MARK: - 实际执行

    private func executeScript(taskId: String, script: String, params: [String: AnyCodable]?) {
        updateTask(taskId) { task in
            task.status = .running
            task.log = "[\(timestamp())] 开始执行脚本"
        }

        // 解析脚本类型
        let scriptType = detectScriptType(script)

        switch scriptType {
        case .iec:
            executeIECScript(taskId: taskId, script: script, params: params)
        case .javascript:
            executeJavaScript(taskId: taskId, script: script, params: params)
        case .lua:
            executeLuaScript(taskId: taskId, script: script, params: params)
        }

        // 检查是否被停止
        if let task = tasks[taskId], task.status == .stopped { return }

        // 标记完成
        updateTask(taskId) { task in
            task.status = .completed
            task.progress = 1.0
            task.completedAt = Date()
            task.log = (task.log ?? "") + "\n[\(timestamp())] 脚本执行完成"
        }
    }

    private enum ScriptType {
        case iec, javascript, lua
    }

    private func detectScriptType(_ script: String) -> ScriptType {
        // IEC 脚本特征: main() 函数, auto.waitFor 等关键词
        if script.contains("main()") || script.contains("auto.waitFor") || script.contains("auto.setMode") {
            return .iec
        }
        // Lua 脚本特征
        if script.hasPrefix("--") || script.contains("function ") && script.contains("local ") {
            return .lua
        }
        // 默认 JavaScript
        return .javascript
    }

    // MARK: - IEC 脚本执行

    private func executeIECScript(taskId: String, script: String, params: [String: AnyCodable]?) {
        appendLog(taskId, "[\(timestamp())] 执行 IEC 脚本")

        // IEC 脚本引擎 — 实现自动化 API
        // 提供: auto, click, longClick, swipe, input, findNode, findColor, ocr 等接口
        let engine = IECScriptEngine()

        // 注入参数
        if let params = params {
            for (key, value) in params {
                engine.setGlobal(key: key, value: value.value)
            }
        }

        do {
            try engine.execute(script)
            appendLog(taskId, "[\(timestamp())] IEC 脚本执行成功")
        } catch {
            updateTask(taskId) { task in
                task.status = .failed
                task.error = error.localizedDescription
                task.completedAt = Date()
            }
            appendLog(taskId, "[\(timestamp())] IEC 脚本执行失败: \(error.localizedDescription)")
        }
    }

    // MARK: - JavaScript 执行

    private func executeJavaScript(taskId: String, script: String, params: [String: AnyCodable]?) {
        appendLog(taskId, "[\(timestamp())] 执行 JavaScript 脚本")

        // 使用 JavaScriptCore 执行
        let jsContext = JSContext()

        // 注入自动化 API
        injectAutomationAPI(into: jsContext, taskId: taskId)

        // 注入参数
        if let params = params {
            for (key, value) in params {
                jsContext?.setObject(value.value, forKeyedSubkey: key as NSString)
            }
        }

        jsContext?.exceptionHandler = { _, exception in
            self.appendLog(taskId, "[\(self.timestamp())] JS Error: \(exception?.toString() ?? "unknown")")
        }

        jsContext?.evaluateScript(script)

        appendLog(taskId, "[\(timestamp())] JavaScript 脚本执行完成")
    }

    // MARK: - Lua 执行 (预留)

    private func executeLuaScript(taskId: String, script: String, params: [String: AnyCodable]?) {
        appendLog(taskId, "[\(timestamp())] Lua 脚本暂不支持")
        updateTask(taskId) { task in
            task.status = .failed
            task.error = "Lua engine not implemented"
            task.completedAt = Date()
        }
    }

    // MARK: - 注入自动化 API

    private func injectAutomationAPI(into context: JSContext?, taskId: String) {
        guard let context = context else { return }

        // auto 对象
        let autoBlock: @convention(block) () -> Void = {
            // 自动化控制
        }
        context.setObject(autoBlock, forKeyedSubkey: "auto" as NSString)

        // click(x, y) — 触控点击
        let clickBlock: @convention(block) (Int, Int) -> Void = { x, y in
            TouchSimulator.tap(at: CGPoint(x: x, y: y))
            self.appendLog(taskId, "[\(self.timestamp())] click(\(x), \(y))")
        }
        context.setObject(clickBlock, forKeyedSubkey: "click" as NSString)

        // longClick(x, y, duration)
        let longClickBlock: @convention(block) (Int, Int, Int) -> Void = { x, y, duration in
            TouchSimulator.longPress(at: CGPoint(x: x, y: y), duration: TimeInterval(duration) / 1000)
            self.appendLog(taskId, "[\(self.timestamp())] longClick(\(x), \(y), \(duration))")
        }
        context.setObject(longClickBlock, forKeyedSubkey: "longClick" as NSString)

        // swipe(x1, y1, x2, y2, duration)
        let swipeBlock: @convention(block) (Int, Int, Int, Int, Int) -> Void = { x1, y1, x2, y2, duration in
            TouchSimulator.swipe(from: CGPoint(x: x1, y: y1), to: CGPoint(x: x2, y: y2), duration: TimeInterval(duration) / 1000)
            self.appendLog(taskId, "[\(self.timestamp())] swipe(\(x1),\(y1) -> \(x2),\(y2))")
        }
        context.setObject(swipeBlock, forKeyedSubkey: "swipe" as NSString)

        // input(text)
        let inputBlock: @convention(block) (String) -> Void = { text in
            KeyboardSimulator.typeText(text)
            self.appendLog(taskId, "[\(self.timestamp())] input(\(text.prefix(20))...)")
        }
        context.setObject(inputBlock, forKeyedSubkey: "input" as NSString)

        // screenshot() — 截图返回 base64
        let screenshotBlock: @convention(block) () -> String? = {
            if let image = ScreenCapture.takeScreenshot(),
               let data = image.pngData() {
                return data.base64EncodedString()
            }
            return nil
        }
        context.setObject(screenshotBlock, forKeyedSubkey: "screenshot" as NSString)

        // sleep(ms)
        let sleepBlock: @convention(block) (Int) -> Void = { ms in
            Thread.sleep(forTimeInterval: TimeInterval(ms) / 1000)
        }
        context.setObject(sleepBlock, forKeyedSubkey: "sleep" as NSString)

        // log(msg)
        let logBlock: @convention(block) (String) -> Void = { msg in
            self.appendLog(taskId, "[\(self.timestamp())] [script] \(msg)")
        }
        context.setObject(logBlock, forKeyedSubkey: "log" as NSString)
    }

    // MARK: - 辅助

    private func updateTask(_ taskId: String, update: (inout ScriptTask) -> Void) {
        queue.sync {
            if var task = tasks[taskId] {
                update(&task)
                tasks[taskId] = task
            }
        }
    }

    private func appendLog(_ taskId: String, _ message: String) {
        updateTask(taskId) { task in
            task.log = (task.log ?? "") + "\n" + message
        }
    }

    private func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: Date())
    }
}

// MARK: - JavaScriptCore (条件导入)

#if canImport(JavaScriptCore)
import JavaScriptCore
#else
// 提供 JSContext 存根，用于编译
class JSContext {
    var exceptionHandler: ((JSContext?, JSValue?) -> Void)?

    func evaluateScript(_ script: String) -> JSValue? { return nil }
    func setObject(_ object: Any?, forKeyedSubscript key: NSString) {}
}

class JSValue {
    func toString() -> String? { return nil }
}
#endif
