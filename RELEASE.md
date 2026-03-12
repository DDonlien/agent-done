# Release Package（源码仓库内不提交二进制）

根据 GitHub 仓库协作规范，本仓库**不提交** `release-package.zip` 这类二进制产物。
请在本地或 CI 中通过脚本生成发布包。

## 一键打包

```bash
./package_release.sh 0.1.0
```

执行后会在 `release/` 目录生成：

- `AI-Tab-Progress-Indicator-v0.1.0-chrome.zip`
- `AI-Tab-Progress-Indicator-v0.1.0-chrome.zip.sha256`

## 安装方式（Chrome / Edge / 360 / Arc 等 Chromium 内核）

> Chromium 系浏览器通常不直接安装 zip，而是“解压后加载”。

1. 解压 `release/AI-Tab-Progress-Indicator-v0.1.0-chrome.zip`。
2. 打开浏览器扩展页：`chrome://extensions/`（或 `edge://extensions/`）。
3. 打开“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择解压后的目录（里面包含 `manifest.json`）。

## 校验完整性（可选）

```bash
sha256sum -c release/AI-Tab-Progress-Indicator-v0.1.0-chrome.zip.sha256
```
