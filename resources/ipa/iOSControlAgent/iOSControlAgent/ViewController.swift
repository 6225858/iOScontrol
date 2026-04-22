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

        // 标题
        let titleLabel = UILabel()
        titleLabel.text = "iOSControl Agent"
        titleLabel.font = UIFont.boldSystemFont(ofSize: 24)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        // 状态标签
        statusLabel = UILabel()
        statusLabel.text = "● 运行中"
        statusLabel.font = UIFont.systemFont(ofSize: 18)
        statusLabel.textColor = .green
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)

        // 端口标签
        portLabel = UILabel()
        portLabel.text = "端口: 19402"
        portLabel.font = UIFont.systemFont(ofSize: 16)
        portLabel.textColor = .gray
        portLabel.textAlignment = .center
        portLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(portLabel)

        // 版本标签
        versionLabel = UILabel()
        versionLabel.text = "v1.0.0"
        versionLabel.font = UIFont.systemFont(ofSize: 14)
        versionLabel.textColor = .lightGray
        versionLabel.textAlignment = .center
        versionLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(versionLabel)

        // 布局
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
}
