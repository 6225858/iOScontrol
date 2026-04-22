//
//  Socket.swift
//  iOSControlAgent
//
//  轻量级 TCP Socket 封装 — 用于 HTTP 服务器
//

import Foundation

class Socket {
    private var socketFileDescriptor: Int32 = -1

    static func create() throws -> Socket {
        let socket = Socket()
        socket.socketFileDescriptor = Darwin.socket(AF_INET, SOCK_STREAM, 0)
        if socket.socketFileDescriptor == -1 {
            throw SocketError.creationFailed
        }

        // 设置 SO_REUSEADDR
        var on: Int32 = 1
        setsockopt(socket.socketFileDescriptor, SOL_SOCKET, SO_REUSEADDR, &on, socklen_t(MemoryLayout<Int32>.size))

        return socket
    }

    func listen(on port: UInt16) throws {
        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = port.bigEndian
        addr.sin_addr = in_addr(s_addr: INADDR_ANY)

        let bindResult = withUnsafePointer(to: &addr) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { rebound in
                Darwin.bind(socketFileDescriptor, rebound, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }

        if bindResult == -1 {
            throw SocketError.bindFailed
        }

        let listenResult = Darwin.listen(socketFileDescriptor, 10)
        if listenResult == -1 {
            throw SocketError.listenFailed
        }
    }

    func acceptClientConnection() throws -> Socket {
        var addr = sockaddr_in()
        var len = socklen_t(MemoryLayout<sockaddr_in>.size)

        let clientFd = withUnsafeMutablePointer(to: &addr) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { rebound in
                Darwin.accept(socketFileDescriptor, rebound, &len)
            }
        }

        if clientFd == -1 {
            throw SocketError.acceptFailed
        }

        let clientSocket = Socket()
        clientSocket.socketFileDescriptor = clientFd
        return clientSocket
    }

    func read(maxLength: Int) throws -> Data {
        var buffer = [UInt8](repeating: 0, count: maxLength)
        let bytesRead = Darwin.read(socketFileDescriptor, &buffer, maxLength)
        if bytesRead < 0 {
            throw SocketError.readFailed
        }
        return Data(buffer.prefix(bytesRead))
    }

    func write(from data: Data) throws {
        let bytesWritten = data.withUnsafeBytes { pointer in
            Darwin.write(socketFileDescriptor, pointer.baseAddress, data.count)
        }
        if bytesWritten < 0 {
            throw SocketError.writeFailed
        }
    }

    func write(from string: String) throws {
        guard let data = string.data(using: .utf8) else { return }
        try write(from: data)
    }

    func close() {
        if socketFileDescriptor != -1 {
            Darwin.close(socketFileDescriptor)
            socketFileDescriptor = -1
        }
    }

    deinit {
        close()
    }
}

enum SocketError: Error {
    case creationFailed
    case bindFailed
    case listenFailed
    case acceptFailed
    case readFailed
    case writeFailed
}
