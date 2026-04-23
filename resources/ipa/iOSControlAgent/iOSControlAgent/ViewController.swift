//
//  ViewController.swift
//  iOSControlAgent
//
//  状态显示界面 — 显示 HTTP 服务运行状态
//

import UIKit

class ViewController: UIViewController {

    private let statusLabel = UILabel()
    private let portLabel = UILabel()
    private let versionLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        setupUI()
    }

    private func setupUI() {
        // 标题
        let titleLabel = UILabel()
        titleLabel.text = "iOSControl Agent"
        titleLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        // 状态图标 + 文字
        statusLabel.text = "HTTP Server Running"
        statusLabel.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        statusLabel.textColor = .systemGreen
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)

        // 端口
        portLabel.text = "Port: 19402"
        portLabel.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        portLabel.textColor = .secondaryLabel
        portLabel.textAlignment = .center
        portLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(portLabel)

        // 版本
        versionLabel.text = "v1.0.0 (App Mode)"
        versionLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        versionLabel.textColor = .tertiaryLabel
        versionLabel.textAlignment = .center
        versionLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(versionLabel)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -60),

            statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            statusLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20),

            portLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            portLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 10),

            versionLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            versionLabel.topAnchor.constraint(equalTo: portLabel.bottomAnchor, constant: 10),

            titleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20),
        ])
    }

    func updateStatus(running: Bool) {
        DispatchQueue.main.async {
            self.statusLabel.text = running
                ? "HTTP Server Running"
                : "Server Stopped"
            self.statusLabel.textColor = running ? .systemGreen : .systemRed
        }
    }
}
