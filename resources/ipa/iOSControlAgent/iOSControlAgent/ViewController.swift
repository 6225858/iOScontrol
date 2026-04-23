//
//  ViewController.swift
//  iOSControlAgent
//
//  状态显示界面
//

import UIKit

class ViewController: UIViewController {

    private let statusLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        statusLabel.text = "iOSControl Agent\nWaiting for XCTest..."
        statusLabel.numberOfLines = 0
        statusLabel.textAlignment = .center
        statusLabel.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)

        NSLayoutConstraint.activate([
            statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            statusLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 20),
            statusLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20),
        ])
    }

    func updateStatus(running: Bool) {
        DispatchQueue.main.async {
            self.statusLabel.text = running
                ? "iOSControl Agent\nHTTP Server Running ✅\nPort: 19402"
                : "iOSControl Agent\nServer Stopped ❌"
        }
    }
}
