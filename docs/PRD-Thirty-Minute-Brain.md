# Thirty-Minute Brain PRD

## 1. 产品定位

**产品名：** Thirty-Minute Brain

**一句话定位：** 自动记住用户最近 30 分钟做过什么，让用户能快速找回刚刚看过、复制过、打开过、保存过的东西。

**产品类型：** 本地优先的桌面端 Recently Seen Search 工具。

**核心价值：** 用户不需要主动整理资料，只要在忘记刚才发生的上下文时，按快捷键打开“临时脑子”，搜索或浏览最近 30 分钟线索。

## 2. 产品原则

- 本地保存，默认不上传。
- 采集透明，每个数据源必须可启用、可暂停、可删除。
- 默认 24 小时自动过期，置顶事件不自动删除。
- 写入前过滤疑似密码、token、API key、信用卡号等敏感内容。
- 不自动读取浏览器完整历史、终端历史文件、聊天记录或全盘文件活动。
- 优先解决“刚才那个东西在哪”，不做成重型笔记软件。

## 3. 目标用户与场景

目标用户包括开发者、产品经理、设计师、研究员、运营等重度桌面工作者，尤其是经常在 IDE、浏览器、截图工具、文件管理器和 AI 工具之间切换的人。

核心场景：

- 找回刚才复制过的报错。
- 找回刚才打开过的文件或保存过的截图。
- 找回刚才手动保存的 GitHub issue、文档链接或备注。
- 快速总结“我刚才在处理什么问题”。
- 一键生成上下文包，发给 AI、同事或粘贴到 Codex。

## 4. 成功指标

- 用户能在 10 秒内找回最近复制过的文本、文件、链接或截图。
- 剪贴板文本变化后约 1 秒进入时间线。
- 新截图进入已授权文件夹后约 2 秒进入时间线。
- 用户能一键生成可复制的 Markdown/JSON/Bug report 上下文包。
- 权限中心能清楚展示数据保存位置、采集范围、保留时间和隐私边界。
- 敏感内容命中时，数据库和上下文包都不保存、不输出原文。

## 5. 当前实现状态

已经实现：

- React/Tauri/TypeScript/Tailwind 项目骨架。
- 时间线 UI、搜索、类型筛选、时间窗口筛选。
- 手动添加文本、链接、文件路径。
- 剪贴板事件、截图文件夹和外部事件的本地模型。
- 敏感内容过滤与测试。
- 上下文包生成、模板、选中事件导出。
- 本地规则版“我刚才在干嘛”总结。
- 事件置顶、批量删除、编辑标题与备注。
- 搜索高亮、清理 30 分钟/24 小时事件。
- 权限中心模型、来源开关、全局暂停、本地 ingestion token。
- Phase 3 接入脚手架：浏览器插件、VS Code 插件、PowerShell/bash/zsh hook。
- `CreateEventRequest` 统一协议。
- `ingestionGateway`：token 校验、权限检查、全局暂停、来源/类型白名单、敏感过滤、去重、写入回调。
- `deepLink` payload 解析：`thirty-minute-brain://ingest?token=...&payload=...`。
- `deepLinkIngestion`：解析 deep link 后路由到统一 ingestion API。
- Tauri runtime 外部接入：前端 gateway 校验后调用 Rust `ingest_external_event` 写 SQLite。
- 多个 settings store 共享同一 storage 时保持同步，确保权限中心修改后 API 能读到最新 token/来源开关。
- 分享包导出：Markdown、JSON、Bug report，并默认脱敏。
- GitHub 仓库与持续提交记录。

当前已知限制：

- 本机 Windows 原生 Tauri 构建仍依赖 MSVC Build Tools；缺少 `link.exe` 时无法完成 Rust 原生编译。
- loopback HTTP ingestion endpoint 尚未真正运行，仅完成协议、gateway 和集成脚手架。
- OCR 尚未实现。
- 端到端加密同步、自动更新、签名与发布流水线尚未实现。

## 6. 最终功能范围

### 6.1 本地事件系统

事件类型：

- `clipboard`
- `screenshot`
- `file`
- `link`
- `note`
- `browser_tab`
- `editor_file`
- `editor_selection`
- `command`

稳定字段：

- `id`
- `type`
- `title`
- `content`
- `source`
- `path`
- `url`
- `note`
- `metadata_json`
- `content_hash`
- `sensitive_flag`
- `sensitive_reason`
- `created_at`
- `expires_at`
- `pinned_at`

规则：

- 默认 `expires_at = created_at + 24h`。
- 启动时和每 30 分钟清理过期事件。
- `pinned_at` 不为空的事件不自动过期。
- 外部来源统一走 ingestion gateway。
- 删除或更新事件后同步更新搜索索引。

### 6.2 数据源

MVP 数据源：

- 剪贴板文本监听。
- 用户选择的截图文件夹。
- 用户手动添加文本、链接、文件路径。
- App 内粘贴文本。

授权后数据源：

- 浏览器插件只同步当前标签页，不读取完整历史。
- VS Code 插件只同步当前文件和用户主动发送的选区。
- 终端 shell hook 只记录命令文本，默认不记录输出。

明确不自动采集：

- 浏览器完整历史。
- 终端历史文件。
- 聊天软件内容。
- 全盘文件活动。
- 云端 AI 总结。

### 6.3 隐私与安全

写入前过滤：

- `password=`
- `passwd=`
- `secret=`
- `token=`
- `api_key=`
- JWT
- GitHub token
- OpenAI key
- AWS access key
- 使用 Luhn 校验的信用卡号
- 高熵长字符串

命中策略：

- 不保存原始 `content`。
- `title = "敏感内容已跳过"`。
- `sensitive_flag = true`。
- 只保存规则级 `sensitive_reason`，不保存敏感值。
- 上下文包与分享包不输出敏感原文。

### 6.4 时间线与搜索

主视图：

- 默认显示最近 30 分钟。
- 可切换 24 小时。
- 按时间倒序排列。
- 显示类型、标题、预览、来源、相对时间。
- 支持展开详情。

搜索范围：

- `title`
- `content`
- `path`
- `url`
- `note`
- 后续 OCR 文本

路线：

- 当前使用本地内存/LIKE 风格搜索。
- v0.2 升级到 SQLite FTS5。
- 支持按类型、时间窗口、敏感跳过状态过滤。
- 搜索结果支持高亮。

### 6.5 事件管理

必须支持：

- 单条删除。
- 批量删除。
- 清空全部。
- 清空最近 30 分钟。
- 清空最近 24 小时。
- Pin/Unpin。
- 编辑标题和备注。
- 复制剪贴板事件内容。
- 打开链接。
- 打开文件或文件位置。
- 截图预览。
- 选择多个事件生成上下文包。

### 6.6 上下文包与分享包

基础能力：

- 生成最近 30 分钟 Markdown。
- 支持复制。
- 支持保存 `.md`。
- 敏感事件只输出“敏感内容已跳过”。

模板：

- 给 AI。
- 给同事。
- Bug report。
- 会议回顾。

增强能力：

- 只基于选中事件生成上下文包。
- 输出 Markdown、JSON、Bug report。
- 分享包默认不包含敏感原文。

### 6.7 “我刚才在干嘛”

当前：

- 使用本地规则总结。
- 根据事件类型和关键词推断主题。
- 不调用云端 AI。

后续：

- 用户配置本地 LLM 后，可启用本地模型总结。
- 默认仍使用规则总结。
- 不默认上传任何事件内容。

### 6.8 截图 OCR

v0.2 后加入：

- 本地 OCR 识别截图文字。
- OCR 文本进入搜索索引。
- OCR 结果写入前经过敏感过滤。
- OCR 文本可在事件详情里查看、隐藏、删除。

### 6.9 权限中心

最终权限中心需要支持：

- 每个数据源独立开关。
- 显示是否启用。
- 显示最近写入时间。
- 明确“采集什么”和“不采集什么”。
- 显示保存多久。
- 一键暂停所有自动/外部采集。
- 临时隐身模式。
- 来源级别删除数据。
- 本地 ingestion token 管理。

### 6.10 插件与接入协议

本地接入协议：

- 桌面端提供本地 loopback ingestion API 或 Tauri deep link。
- 外部插件统一发送 `CreateEventRequest`。
- 外部入口必须携带本地 ingestion token。
- 桌面端统一执行权限检查、敏感过滤、去重、过期时间设置和搜索索引写入。

Deep link 形式：

```text
thirty-minute-brain://ingest?token=<local-token>&payload=<base64url-json>
```

插件约束：

- 插件默认只能写入，不能读取数据库。
- 插件只能写入已授权事件类型。
- 用户可以单独启用/禁用每个来源。
- 保留来源审计信息和最近写入时间。

## 7. 分阶段路线

### Phase 1：MVP 完整稳定版

目标：把当前版本打磨成可日常使用的本地桌面工具。

- 跑通 Tauri 原生编译与 Windows 安装包。
- 验证 SQLite 持久化。
- 验证剪贴板监听、截图文件夹监听、手动添加。
- 完善托盘、全局快捷键、关闭隐藏到托盘。
- 完善设置页隐私说明和数据位置展示。

### Phase 2：本地智能增强版

目标：从记录工具升级成短期工作记忆。

- SQLite FTS5 全文搜索。
- 选中事件生成上下文包。
- 批量删除与时间窗口清理。
- 搜索结果高亮。
- 截图 OCR。
- “我刚才在干嘛”规则总结增强。
- 上下文包模板增强。
- 本地导出 Markdown/JSON/Bug report。

### Phase 3：工作流接入版

目标：接入浏览器、VS Code、终端，同时保持隐私边界清晰。

- 浏览器插件同步当前标签页。
- VS Code 插件同步当前文件和主动选区。
- 终端 shell hook 记录命令文本。
- 本地 ingestion API。
- Tauri deep link 接入。
- 统一 `CreateEventRequest` 协议。
- 来源级别开关、token 和审计。

### Phase 4：权限中心与插件系统

目标：让产品可信、可控、可扩展。

- 完整权限中心。
- 插件事件类型白名单。
- 本地 API token 管理。
- 来源级别删除。
- 临时隐身模式。
- 插件无法读取全量数据库，除非用户授权。

### Phase 5：v1.0 产品化

目标：变成可长期使用和发布的正式桌面产品。

- Windows 安装包优先。
- 自动更新。
- 应用签名。
- 数据库 migration 稳定。
- 多语言：中文/英文。
- 可选端到端加密同步，默认关闭。
- 分享包导出 Markdown/JSON/Bug report/AI prompt。

## 8. 下一步执行重点

短期优先级：

1. 完成 loopback HTTP ingestion endpoint。
2. 注册 Tauri deep link scheme，并把系统 deep link 事件交给 `ingestionApi.ingestDeepLink`。
3. 让浏览器插件、VS Code 插件、shell hook 使用 token + deep link/loopback 协议。
4. 在权限中心展示真实 `lastWriteAt`。
5. 补齐来源级别删除和临时隐身模式。
6. 继续保持 `npm.cmd test` 和 `npm.cmd run build` 通过。
7. 安装 MSVC Build Tools 后验证 `npm.cmd run tauri -- build`。

## 9. 验收清单

- 首次启动能看到隐私说明。
- 关闭剪贴板监听后不会自动保存新剪贴板事件。
- 普通剪贴板文本会进入时间线。
- 疑似 token/password 不保存原文。
- 手动添加链接、文本、文件路径可搜索。
- 截图文件夹新增图片可生成事件。
- 30 分钟和 24 小时窗口切换正常。
- 选中多个事件后可批量删除。
- 选中多个事件后可只基于这些事件生成上下文包。
- 生成的上下文包不泄露敏感原文。
- Pin 事件不会因为清理过期事件被删除。
- 浏览器插件不读取完整历史。
- VS Code 插件不扫描整个项目。
- shell hook 不记录命令输出。
- 外部接入 token 错误时不会写入事件。
- 禁用某来源后，该来源无法写入事件。
- 全局暂停后自动/外部来源无法写入事件。
- `npm.cmd test` 通过。
- `npm.cmd run build` 通过。
- 安装 MSVC Build Tools 后，`npm.cmd run tauri -- build` 通过。
