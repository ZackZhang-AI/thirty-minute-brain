# Thirty-Minute Brain

Thirty-Minute Brain 是一个本地优先的桌面短期记忆工具，用来找回最近 30 分钟复制过、打开过、保存过或手动添加过的东西。

它是 Recently Seen Search，不是长期笔记软件。

## 当前功能

- 最近 30 分钟时间线，并支持切换 24 小时视图。
- 搜索标题、内容、路径、URL 和备注。
- 手动添加文本、链接、文件路径。
- 剪贴板文本捕获。
- 截图文件夹监控，支持 `png`、`jpg`、`jpeg`、`webp`。
- 写入前敏感内容过滤。
- 事件置顶，置顶事件不会被过期清理删除。
- 编辑事件标题和备注。
- 单条删除、批量删除、清空全部、按时间窗口清理。
- Markdown 上下文包，支持 AI、同事交接、Bug report、会议回顾模板。
- JSON 和 Bug report 分享包导出。
- 本地规则版“我刚才在干嘛”总结。
- 权限中心：来源开关、全局暂停、本地 ingestion token。
- Phase 3 接入脚手架：浏览器插件、VS Code 插件、PowerShell/bash/zsh hook。
- 外部 ingestion gateway：token 校验、权限检查、敏感过滤、去重、写入回调。
- Deep link payload 解析：`thirty-minute-brain://ingest?token=...&payload=...`。
- Tauri 托盘菜单和 `Ctrl+Shift+Space` 全局快捷键。

## 隐私边界

默认本地保存，不上传。

不会自动读取：

- 浏览器完整历史。
- 终端历史文件。
- 命令输出。
- 聊天软件内容。
- 全盘文件活动。

外部接入必须由用户显式启用：

- 浏览器插件只同步当前 active tab 标题和 URL。
- VS Code 插件只同步当前文件和用户主动发送的 selection。
- Shell hook 只记录命令文本。

疑似敏感内容会在写入前跳过原文，只记录标题 `敏感内容已跳过` 和非敏感原因，例如 `secret-keyword`、`credit-card`、`openai-key`。

## 本地开发

安装依赖：

```powershell
npm.cmd install
```

启动浏览器预览：

```powershell
npm.cmd run dev
```

运行测试：

```powershell
npm.cmd test
```

构建前端：

```powershell
npm.cmd run build
```

## Windows Tauri 原生依赖

Tauri 桌面构建需要：

- WebView2
- Rust/rustup/Cargo
- Visual Studio Build Tools 2022，包含 C++ workload
- Windows SDK

安装 Rust：

```powershell
winget install --id Rustlang.Rustup -e --silent --accept-package-agreements --accept-source-agreements
```

安装 Visual Studio Build Tools：

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-package-agreements --accept-source-agreements
```

安装时选择 Desktop development with C++、MSVC 和 Windows SDK。

查看 Tauri 信息：

```powershell
npm.cmd run tauri -- info
```

启动桌面应用：

```powershell
npm.cmd run tauri -- dev
```

创建 Windows 构建：

```powershell
npm.cmd run tauri -- build
```

## 架构

- Frontend：React、TypeScript、Tailwind CSS、Vite
- Desktop shell：Tauri 2
- Persistence：SQLite through Rust `rusqlite`
- File watching：Rust `notify`
- Search：当前本地搜索，后续升级 SQLite FTS5
- Privacy filter：本地正则、高熵检测和 Luhn 校验
- External ingestion：`CreateEventRequest` + token + permission gateway + optional deep link
