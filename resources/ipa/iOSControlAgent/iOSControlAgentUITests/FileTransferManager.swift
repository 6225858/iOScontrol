//
//  FileTransferManager.swift
//  iOSControlAgentUITests
//
//  文件传输管理 — 管理设备端文件的上传/下载
//

import Foundation

class FileTransferManager {

    /// 上传文件到设备 (base64 解码写入)
    func upload(base64Content: String, fileName: String, remotePath: String) -> Bool {
        guard let data = Data(base64Encoded: base64Content) else {
            print("[FileTransfer] Invalid base64 content")
            return false
        }

        let writePath = resolveRemotePath(remotePath, fileName: fileName)

        do {
            let directory = writePath.deletingLastPathComponent()
            if !FileManager.default.fileExists(atPath: directory.path) {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            }

            try data.write(to: writePath)
            print("[FileTransfer] File uploaded: \(writePath.path)")
            return true
        } catch {
            print("[FileTransfer] Upload failed: \(error)")
            return false
        }
    }

    /// 从设备下载文件 (读取并 base64 编码)
    func download(remotePath: String) -> String? {
        let readPath = resolveRemotePath(remotePath)

        guard FileManager.default.fileExists(atPath: readPath.path) else {
            print("[FileTransfer] File not found: \(readPath.path)")
            return nil
        }

        do {
            let data = try Data(contentsOf: readPath)
            return data.base64EncodedString()
        } catch {
            print("[FileTransfer] Download failed: \(error)")
            return nil
        }
    }

    /// 列出目录内容
    func listDirectory(remotePath: String) -> [[String: Any]]? {
        let dirPath = resolveRemotePath(remotePath)

        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: dirPath,
            includingPropertiesForKeys: [.fileSizeKey, .isDirectoryKey, .creationDateKey],
            options: .skipsHiddenFiles
        ) else {
            return nil
        }

        return contents.map { url in
            let isDir = (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
            return [
                "name": url.lastPathComponent,
                "path": url.path,
                "isDirectory": isDir,
                "size": size,
            ]
        }
    }

    /// 删除文件
    func delete(remotePath: String) -> Bool {
        let filePath = resolveRemotePath(remotePath)
        do {
            try FileManager.default.removeItem(at: filePath)
            return true
        } catch {
            print("[FileTransfer] Delete failed: \(error)")
            return false
        }
    }

    // MARK: - 路径解析

    private func resolveRemotePath(_ remotePath: String, fileName: String? = nil) -> URL {
        if remotePath.hasPrefix("/") {
            var url = URL(fileURLWithPath: remotePath)
            if let fileName = fileName {
                url = url.appendingPathComponent(fileName)
            }
            return url
        }

        let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        var url = documentsDir.appendingPathComponent(remotePath)
        if let fileName = fileName {
            url = url.appendingPathComponent(fileName)
        }
        return url
    }
}
