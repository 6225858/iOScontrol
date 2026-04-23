//
//  ViewController.swift
//  iOSControlAgent
//
//  宿主 App 的根视图 — 显示运行状态
//

import UIKit

class ViewController: UIViewController {

    private var statusLabel: UILabel!
    private var portLabel: UILabel!
    private var versionLabel: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .white

        let titleLabel = UILabel()
        titleLabel.text = "iOSControl Agent"
        titleLabel.font = UIFont.boldSystemFont(ofSize: 24)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        statusLabel = UILabel()
        statusLabel.text = "● 等待连接"
        statusLabel.font = UIFont.systemFont(ofSize: 18)
        statusLabel.textColor = .orange
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)

        portLabel = UILabel()
        portLabel.text = "端口: 19402"
        portLabel.font = UIFont.systemFont(ofSize: 16)
        portLabel.textColor = .gray
        portLabel.textAlignment = .center
        portLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(portLabel)

        versionLabel = UILabel()
        versionLabel.text = "v1.0.0"
        versionLabel.font = UIFont.systemFont(ofSize: 14)
        versionLabel.textColor = .lightGray
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
        ])
    }

    /// 更新服务器运行状态
    func updateStatus(running: Bool) {
        DispatchQueue.main.async {
            if running {
                self.statusLabel.text = "● 运行中"
                self.statusLabel.textColor = .green
            } else {
                self.statusLabel.text = "● 已停止"
                self.statusLabel.textColor = .red
            }
        }
    }
}
