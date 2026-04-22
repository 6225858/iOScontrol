//
//  HTTPServer.swift
//  iOSControlAgentUITests
//
//  自定义代理 IPA 的 HTTP 服务端 — /ecnb/ 协议
//

import Foundation

// MARK: - 请求/响应类型

struct AgentRequest: Codable {
    let deviceUdid: String?
    let script: String?
    let scriptName: String?
    let taskId: String?
    let params: [String: AnyCodable]?
    let content: String?
    let fileName: String?
    let remotePath: String?
}

struct AgentResponse: Codable {
    let code: Int
    let msg: String
    let data: AnyCodable?

    static func ok(_ data: Any? = nil) -> AgentResponse {
        return AgentResponse(code: 0, msg: "ok", data: AnyCodable(data))
    }

    static func fail(_ msg: String, code: Int = -1) -> AgentResponse {
        return AgentResponse(code: code, msg: msg, data: nil)
    }
}

// MARK: - AnyCodable

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any?) {
        self.value = value ?? NSNull()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case is NSNull: try container.encodeNil()
        case let bool as Bool: try container.encode(bool)
        case let int as Int: try container.encode(int)
        case let double as Double: try container.encode(double)
        case let string as String: try container.encode(string)
        case let array as [Any]: try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]: try container.encode(dict.mapValues { AnyCodable($0) })
        default: try container.encodeNil()
        }
    }
}

// MARK: - HTTP 服务器

class HTTPServer {
    private var serverSocket: Socket?
    public var isRunning = false
    private let port: UInt16
    private let scriptEngine: ScriptEngine
    private let clipboardManager: ClipboardManager
    private let fileManager: FileTransferManager

    init(port: UInt16 = 19402) {
        self.port = port
        self.scriptEngine = ScriptEngine()
        self.clipboardManager = ClipboardManager()
        self.fileManager = FileTransferManager()
    }

    // MARK: - 启动/停止

    func start() {
        guard !isRunning else { return }

        do {
            serverSocket = try Socket.create()
            try serverSocket?.listen(on: port)
            isRunning = true
            print("[Agent] HTTP server listening on port \(port)")

            DispatchQueue.global(qos: .utility).async { [weak self] in
                self?.acceptConnections()
            }
        } catch {
            print("[Agent] Failed to start HTTP server: \(error)")
        }
    }

    func stop() {
        isRunning = false
        serverSocket?.close()
        serverSocket = nil
        print("[Agent] HTTP server stopped")
    }

    // MARK: - 接受连接

    private func acceptConnections() {
        while isRunning, let socket = serverSocket {
            do {
                let clientSocket = try socket.acceptClientConnection()
                DispatchQueue.global(qos: .utility).async { [weak self] in
                    self?.handleClient(clientSocket)
                }
            } catch {
                if isRunning {
                    print("[Agent] Accept error: \(error)")
                }
            }
        }
    }

    // MARK: - 处理客户端请求

    private func handleClient(_ socket: Socket) {
        defer { socket.close() }

        do {
            let requestData = try socket.read(maxLength: 65536)
            guard let requestStr = String(data: requestData, encoding: .utf8) else { return }

            let (method, path, headers, body) = parseHTTPRequest(requestStr)
            let response = route(method: method, path: path, headers: headers, body: body)
            let httpResponse = buildHTTPResponse(response)
            try socket.write(from: httpResponse)

        } catch {
            print("[Agent] Client handling error: \(error)")
        }
    }

    // MARK: - 路由

    private func route(method: String, path: String, headers: [String: String], body: Data?) -> AgentResponse {
        switch path {
        case "/ecnb/ping":
            return AgentResponse.ok([
                "status": "running",
                "version": "1.0.0",
                "port": Int(port),
                "uptime": Int(Date().timeIntervalSince1970),
            ])

        case "/ecnb/script/run":
            return handleScriptRun(body: body)

        case "/ecnb/script/status":
            return handleScriptStatus(body: body)

        case "/ecnb/script/stop":
            return handleScriptStop(body: body)

        case "/ecnb/clipboard/read":
            return handleClipboardRead(body: body)

        case "/ecnb/clipboard/write":
            return handleClipboardWrite(body: body)

        case "/ecnb/file/upload":
            return handleFileUpload(body: body)

        case "/ecnb/file/download":
            return handleFileDownload(body: body)

        case "/ecnb/device/info":
            return handleDeviceInfo()

        case "/ecnb/touch/tap":
            return handleTouchTap(body: body)

        case "/ecnb/touch/longpress":
            return handleTouchLongPress(body: body)

        case "/ecnb/touch/swipe":
            return handleTouchSwipe(body: body)

        case "/ecnb/screenshot":
            return handleScreenshot()

        default:
            return AgentResponse.fail("Unknown endpoint: \(path)", code: 404)
        }
    }

    // MARK: - 触控操作

    private func handleTouchTap(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let params = req.params else {
            return AgentResponse.fail("Missing params")
        }
        let x = params["x"]?.value as? Double ?? 0
        let y = params["y"]?.value as? Double ?? 0
        TouchSimulator.tap(at: CGPoint(x: x, y: y))
        return AgentResponse.ok()
    }

    private func handleTouchLongPress(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let params = req.params else {
            return AgentResponse.fail("Missing params")
        }
        let x = params["x"]?.value as? Double ?? 0
        let y = params["y"]?.value as? Double ?? 0
        let duration = params["duration"]?.value as? Double ?? 1.0
        TouchSimulator.longPress(at: CGPoint(x: x, y: y), duration: duration)
        return AgentResponse.ok()
    }

    private func handleTouchSwipe(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let params = req.params else {
            return AgentResponse.fail("Missing params")
        }
        let x1 = params["x1"]?.value as? Double ?? 0
        let y1 = params["y1"]?.value as? Double ?? 0
        let x2 = params["x2"]?.value as? Double ?? 0
        let y2 = params["y2"]?.value as? Double ?? 0
        let duration = params["duration"]?.value as? Double ?? 0.3
        TouchSimulator.swipe(from: CGPoint(x: x1, y: y1), to: CGPoint(x: x2, y: y2), duration: duration)
        return AgentResponse.ok()
    }

    private func handleScreenshot() -> AgentResponse {
        if let base64 = ScreenCapture.takeScreenshotJPEG(quality: 0.5) {
            return AgentResponse.ok(["image": base64])
        }
        return AgentResponse.fail("Screenshot failed")
    }

    // MARK: - 脚本执行

    private func handleScriptRun(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let script = req.script else {
            return AgentResponse.fail("Missing script content")
        }

        let taskId = req.taskId ?? UUID().uuidString
        let scriptName = req.scriptName ?? "untitled"

        scriptEngine.runScript(taskId: taskId, script: script, name: scriptName, params: req.params)

        return AgentResponse.ok(["taskId": taskId, "status": "running"])
    }

    private func handleScriptStatus(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let taskId = req.taskId else {
            return AgentResponse.fail("Missing taskId")
        }

        let status = scriptEngine.getScriptStatus(taskId: taskId)
        return AgentResponse.ok(status)
    }

    private func handleScriptStop(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let taskId = req.taskId else {
            return AgentResponse.fail("Missing taskId")
        }

        scriptEngine.stopScript(taskId: taskId)
        return AgentResponse.ok(["status": "stopped"])
    }

    // MARK: - 剪切板

    private func handleClipboardRead(body: Data?) -> AgentResponse {
        let content = clipboardManager.read()
        return AgentResponse.ok(["content": content])
    }

    private func handleClipboardWrite(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body) else {
            return AgentResponse.fail("Invalid request")
        }
        let value = req.params?["value"]?.value as? String ?? ""
        clipboardManager.write(value)
        return AgentResponse.ok()
    }

    // MARK: - 文件传输

    private func handleFileUpload(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let content = req.content,
              let remotePath = req.remotePath else {
            return AgentResponse.fail("Missing content or remotePath")
        }

        let fileName = req.fileName ?? URL(fileURLWithPath: remotePath).lastPathComponent
        let success = fileManager.upload(base64Content: content, fileName: fileName, remotePath: remotePath)

        return success ? AgentResponse.ok() : AgentResponse.fail("Upload failed")
    }

    private func handleFileDownload(body: Data?) -> AgentResponse {
        guard let body = body,
              let req = try? JSONDecoder().decode(AgentRequest.self, from: body),
              let remotePath = req.remotePath else {
            return AgentResponse.fail("Missing remotePath")
        }

        if let content = fileManager.download(remotePath: remotePath) {
            return AgentResponse.ok(["content": content])
        }
        return AgentResponse.fail("File not found")
    }

    // MARK: - 设备信息

    private func handleDeviceInfo() -> AgentResponse {
        let info = DeviceInfoCollector.collect()
        return AgentResponse.ok(info)
    }

    // MARK: - HTTP 解析/构建

    private func parseHTTPRequest(_ request: String) -> (method: String, path: String, headers: [String: String], body: Data?) {
        let lines = request.components(separatedBy: "\r\n")
        guard let firstLine = lines.first else { return ("GET", "/", [:], nil) }

        let parts = firstLine.components(separatedBy: " ")
        let method = parts.count > 0 ? parts[0] : "GET"
        let path = parts.count > 1 ? parts[1] : "/"

        var headers: [String: String] = [:]
        var bodyStartIndex = 0
        for i in 1..<lines.count {
            if lines[i].isEmpty {
                bodyStartIndex = i + 1
                break
            }
            let headerParts = lines[i].components(separatedBy: ": ")
            if headerParts.count == 2 {
                headers[headerParts[0]] = headerParts[1]
            }
        }

        var body: Data? = nil
        if bodyStartIndex < lines.count {
            let bodyStr = lines[bodyStartIndex...].joined(separator: "\r\n")
            body = bodyStr.data(using: .utf8)
        }

        return (method, path, headers, body)
    }

    private func buildHTTPResponse(_ response: AgentResponse) -> Data {
        let encoder = JSONEncoder()
        guard let jsonData = try? encoder.encode(response) else {
            let fallback = "{\"code\":-1,\"msg\":\"encode error\"}"
            let httpResponse = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: \(fallback.utf8.count)\r\nConnection: close\r\n\r\n\(fallback)"
            return httpResponse.data(using: .utf8) ?? Data()
        }

        let bodyStr = String(data: jsonData, encoding: .utf8) ?? ""
        let httpResponse = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: \(bodyStr.utf8.count)\r\nConnection: close\r\n\r\n\(bodyStr)"
        return httpResponse.data(using: .utf8) ?? Data()
    }
}
