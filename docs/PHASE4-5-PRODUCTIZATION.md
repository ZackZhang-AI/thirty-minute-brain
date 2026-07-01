# Phase 4/5 产品化说明

本文件记录 Thirty-Minute Brain 从“可用工具”走向“可信产品”的实现状态。

## 已在本地实现

- 权限中心数据模型。
- 来源目录：每个来源声明“采集什么”和“不采集什么”。
- 全局暂停。
- 每个来源独立启用/禁用。
- 本地 ingestion token 设置。
- 外部 ingestion gateway。
- 成功写入后的来源 `lastWriteAt` 回调。
- Markdown/JSON/Bug report 分享包导出。
- 敏感事件导出脱敏。
- 未来云同步开关，默认关闭且当前没有网络实现。
- 中英文语言设置字段。

## 权限边界

外部来源保持最小化：

- 浏览器插件：只记录 active tab 标题和 URL。
- VS Code 插件：只记录当前文件路径和用户主动发送的 selection。
- Shell hook：只记录命令文本。

不会自动采集：

- 浏览器完整历史。
- 终端历史文件。
- 命令输出。
- 环境变量。
- 聊天软件内容。
- 全盘文件活动。

## 分享与协作

已支持：

- Markdown 上下文包。
- JSON 分享包。
- Bug report 分享包。
- 只基于选中事件导出。
- 敏感事件默认不包含原文。

后续增强：

- AI prompt 专用模板。
- 分享包可视化预览。
- 只包含指定来源/类型的分享包。
- 分享前二次隐私检查。

## 仍待实现

这些 v1.0 能力需要真实基础设施或系统级配置：

- 端到端加密云同步。
- 自动更新服务。
- Windows 代码签名。
- macOS notarization。
- Linux AppImage/deb 发布流水线。
- 正式 loopback ingestion server。
- 正式 deep link scheme 注册。
- 插件 marketplace 发布。

## 发布质量要求

发布前必须验证：

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run tauri -- dev`
- `npm.cmd run tauri -- build`
- Windows 安装包安装、启动、托盘、快捷键、卸载。

当前本机限制：缺少 MSVC Build Tools / `link.exe` 时，Rust/Tauri 原生构建无法完成。
