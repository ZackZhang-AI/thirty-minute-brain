# Thirty-Minute Brain PRD

## 1. 产品概述

**产品名：** Thirty-Minute Brain

**一句话定位：** 自动记住用户最近 30 分钟做过什么，让用户可以快速找回刚刚看过、复制过、打开过、保存过的东西。

**产品类型：** 本地优先的桌面端「最近看过搜索」工具。

**核心价值：** 用户不需要主动整理笔记，只要在遗忘刚刚发生的上下文时，按快捷键打开一个临时脑子，搜索或浏览最近 30 分钟的线索。

**第一版原则：**

- 本地保存，不上传。
- 可控采集，不偷偷读取高敏数据源。
- 默认自动过期。
- 敏感内容默认跳过或脱敏。
- 优先解决「刚才那个东西在哪」这个高频痛点，而不是做成笔记软件。

## 2. 背景与问题

用户在工作流中经常短时间切换多个窗口、网页、文件、错误信息和截图。真正痛苦的不是长期知识管理，而是短期上下文丢失：

- 刚才复制的报错在哪？
- 刚才打开过哪个文件？
- 刚才保存的截图叫什么？
- 刚才那个链接是不是 GitHub issue？
- 刚才我到底在处理哪个问题？

传统笔记工具要求用户主动整理，浏览器历史和系统日志又太散、太脏、太隐私。Thirty-Minute Brain 要成为一个短期记忆缓存，只记录用户允许的低风险上下文源，并在短时间内提供搜索、回看、总结和打包。

## 3. 目标用户

### 3.1 核心用户

- 程序员、产品经理、设计师、研究者、运营等重度桌面工作者。
- 经常在 IDE、浏览器、聊天软件、截图工具、文件管理器之间切换的人。
- 使用 AI/Codex/ChatGPT 协作时，需要把刚刚发生的上下文快速整理给 AI 的人。

### 3.2 早期用户画像

**开发者场景：** 修 bug 时复制报错、打开源码、查看 StackOverflow 或 GitHub issue、截取异常页面，希望过几分钟后还能找回全部线索。

**办公场景：** 处理合同、发票、截图、会议链接，希望不用翻文件夹和聊天记录。

**AI 协作场景：** 想把最近 30 分钟的文件、报错、截图、链接整理成一个可粘贴给 AI 的上下文包。

## 4. 产品目标

### 4.1 MVP 目标

在本地桌面端实现一个安全、透明、低权限的 Recently Seen Search：

1. 监听剪贴板文本变化。
2. 监控用户选择的截图文件夹，新图片出现时保存为事件。
3. 支持用户手动添加文本、链接、文件路径。
4. 展示最近 30 分钟时间线。
5. 支持搜索标题、内容、文件名、备注。
6. 默认事件 24 小时后过期。
7. 检测疑似密码、token、信用卡号等敏感内容，命中时不保存原文。
8. 提供「生成上下文包」按钮，输出最近 30 分钟事件的 Markdown。
9. 所有数据只保存在本地 SQLite。

### 4.2 非目标

MVP 不做以下能力：

- 自动读取浏览器历史。
- 自动读取终端历史。
- 自动读取 VS Code 当前文件。
- 云同步、多设备同步。
- OCR 识别截图内容。
- AI 云端总结。
- 长期知识库、标签体系、复杂笔记编辑器。

## 5. 成功指标

### 5.1 用户价值指标

- 用户能在 10 秒内找回最近复制过的文本、文件或截图。
- 用户能通过一个快捷键打开主界面。
- 用户能一键生成可粘贴给 AI 或同事的上下文包。
- 用户能明确知道数据来源、保存位置和过期规则。

### 5.2 MVP 验收指标

- 剪贴板文本变化能在 1 秒内出现在时间线。
- 用户选择截图文件夹后，新图片能在 2 秒内出现在时间线。
- 搜索能覆盖事件标题、内容、路径、URL、备注。
- 敏感内容检测命中时，不保存原始敏感文本。
- 过期清理能删除超过 expires_at 的事件。
- 应用重启后历史事件仍存在，过期事件被清理。

## 6. 核心用户故事

1. 作为用户，我想看到过去 30 分钟的时间线，这样我可以回忆自己刚才做了什么。
2. 作为用户，我想搜索 TypeError、文件名或链接关键词，这样我可以找回刚才出现过的东西。
3. 作为用户，我想自动保存剪贴板文本，这样复制过的报错不会一闪而过。
4. 作为用户，我想监控截图文件夹，这样新截图可以自动成为上下文线索。
5. 作为用户，我想手动添加文本、链接和文件路径，这样我可以控制哪些内容进入临时脑子。
6. 作为用户，我想让敏感内容自动跳过，这样密码、token、信用卡号不会被保存。
7. 作为用户，我想生成上下文包，这样我可以把最近 30 分钟的线索交给 AI、同事或自己。
8. 作为用户，我想让数据自动过期，这样这个工具不会变成隐私负担。

## 7. 功能需求

### 7.1 剪贴板监听

**描述：** 应用在后台定时读取系统剪贴板文本，检测变化后保存为 clipboard 事件。

**规则：**

- 只监听文本，不监听图片、富文本、文件对象。
- 相同内容不重复保存。
- 空内容不保存。
- 超过最大长度的内容截断保存，默认最大 20,000 字符。
- 命中敏感内容时，不保存原文，只保存标题「敏感内容已跳过」和 sensitive_flag=true。

**事件字段：**

- type=clipboard
- title=剪贴板文本摘要
- content=剪贴板文本或空
- source=clipboard
- created_at=当前时间
- expires_at=created_at + 24 小时

### 7.2 截图文件夹监控

**描述：** 用户选择一个或多个截图文件夹后，应用监控新增图片文件，并保存为 screenshot 事件。

**支持格式：**

- png
- jpg
- jpeg
- webp

**规则：**

- 只记录新出现的图片路径，不复制图片文件。
- 文件写入稳定后再记录，避免半写入文件。
- 同一路径不重复保存。
- 用户可以为截图添加备注。

**事件字段：**

- type=screenshot
- title=文件名
- path=图片绝对路径
- source=watched_folder
- note=用户备注，可为空

### 7.3 手动添加上下文

**描述：** 用户可在应用内手动添加链接、文本、文件路径。

**输入类型：**

- Text：普通文本、错误信息、短笔记。
- Link：URL 和可选标题。
- File：本地文件路径。

**规则：**

- URL 使用基本格式校验。
- 文件路径保存绝对路径和文件名。
- 文本同样经过敏感内容检测。
- 用户可给任意事件添加 note。

### 7.4 时间线

**描述：** 主界面默认展示最近 30 分钟事件，按时间倒序排列。

**展示内容：**

- 时间，如 10:21。
- 类型，如 Clipboard、Screenshot、File、Link、Note。
- 标题。
- 简短内容预览。
- 来源或路径。
- 距现在多久，如 12 min ago。
- sensitive_flag 命中时显示「敏感内容已跳过」。

**交互：**

- 点击事件展开详情。
- 文件事件可打开所在位置。
- 链接事件可用默认浏览器打开。
- 剪贴板事件可重新复制。
- 截图事件可预览本地图片。

### 7.5 搜索

**描述：** 用户在搜索框输入关键词后，搜索最近事件。

**MVP 搜索范围：**

- title
- content
- path
- url
- note

**默认范围：**

- 优先搜索最近 30 分钟。
- 提供切换：30 分钟 / 24 小时。

**实现方式：**

- MVP 使用 SQLite LIKE。
- 数据规模增长后升级 SQLite FTS5。

### 7.6 生成上下文包

**描述：** 用户点击「生成上下文包」，应用把最近 30 分钟事件整理成 Markdown。

**输出结构：**

```markdown
# Thirty-Minute Brain Context

## 我刚才可能在做什么

基于最近 30 分钟的线索，用户可能正在处理：...

## 关键线索

- 10:21 Clipboard: TypeError: Cannot read properties...
- 10:27 Link: StackOverflow - Cannot read properties...
- 10:31 Screenshot: checkout bug.png

## 相关文件

- C:\project\src\App.tsx

## 相关链接

- https://github.com/...

## 相关报错或文本

```text
...
```
```

**MVP 总结策略：**

- 不调用云端 AI。
- 使用规则生成一句保守总结。
- 根据事件类型和关键词推断主题，例如登录、支付、报错、invoice、webhook。

### 7.7 敏感内容过滤

**描述：** 在写入数据库前，对文本内容进行本地敏感检测。

**MVP 检测类型：**

- 信用卡号，使用 Luhn 校验降低误报。
- 常见 API key/token 格式。
- password=、passwd=、secret=、token=、api_key= 等键值对。
- JWT。
- GitHub token。
- AWS access key。
- OpenAI key。
- 长随机字符串。

**命中处理：**

- 不保存原始 content。
- title 保存为「敏感内容已跳过」。
- sensitive_flag=true。
- metadata 保存 reason 类型，但不保存敏感值。

### 7.8 自动过期和清理

**默认策略：**

- 30 分钟：强记忆，主界面默认展示。
- 24 小时：弱记忆，仍可搜索。
- 超过 24 小时：默认删除。

**清理时机：**

- 应用启动时清理一次。
- 每 30 分钟后台清理一次。

### 7.9 设置

MVP 设置项：

- 是否启用剪贴板监听。
- 剪贴板轮询间隔，默认 1000ms。
- 截图文件夹列表。
- 默认过期时间，默认 24 小时。
- 是否开机启动，MVP 可先预留。
- 数据库文件位置展示。
- 一键清空所有事件。

## 8. 信息架构与界面

### 8.1 主窗口

默认入口是一个快速搜索窗口：

- 顶部搜索框：Search your last 30 minutes...
- 操作区：添加上下文、生成上下文包、设置。
- 内容区：最近 30 分钟时间线。
- 空状态：提示用户启用剪贴板监听、选择截图文件夹或手动添加上下文。

### 8.2 事件卡片

事件卡片包含：

- 类型图标。
- 标题。
- 时间。
- 内容预览。
- 来源路径或 URL。
- 快捷操作：复制、打开、删除。

### 8.3 添加上下文弹窗

字段：

- 类型：Text / Link / File。
- 标题，可选。
- 内容 / URL / 文件路径。
- 备注，可选。

### 8.4 上下文包弹窗

展示生成的 Markdown，并提供：

- 复制到剪贴板。
- 保存为 .md 文件。
- 关闭。

## 9. 技术架构

### 9.1 推荐技术栈

- 桌面框架：Tauri 2
- 前端：React + TypeScript
- 样式：Tailwind CSS
- 本地数据库：SQLite
- 数据访问：Rust side SQLx 或 tauri-plugin-sql
- 文件夹监控：Rust notify crate
- 剪贴板：Tauri clipboard plugin 或 Rust clipboard 库
- 全局快捷键：Tauri global-shortcut plugin
- 托盘：Tauri tray API

### 9.2 架构分层

```text
App Shell
  - Tauri window
  - tray
  - global shortcut

Frontend React
  - Timeline UI
  - Search UI
  - Add Context modal
  - Settings UI
  - Context Pack modal

Tauri Command API
  - create_event
  - search_events
  - list_recent_events
  - delete_event
  - generate_context_pack
  - update_settings

Background Services
  - ClipboardWatcher
  - ScreenshotFolderWatcher
  - ExpirationCleaner
  - SensitiveContentFilter

Persistence
  - SQLite database
  - app settings
```

### 9.3 数据流

**剪贴板：**

```text
ClipboardWatcher
  -> read text
  -> compare last hash
  -> SensitiveContentFilter
  -> EventRepository.insert
  -> emit event to frontend
```

**截图：**

```text
FolderWatcher
  -> detect created image
  -> wait until file stable
  -> EventRepository.insert
  -> emit event to frontend
```

**搜索：**

```text
React SearchBox
  -> Tauri command search_events(query, window)
  -> SQLite LIKE query
  -> EventDTO[]
  -> render results
```

**上下文包：**

```text
React button
  -> Tauri command generate_context_pack(30min)
  -> load events
  -> group by type
  -> render markdown
  -> return to UI
```

## 10. 数据库设计

### 10.1 events

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source TEXT,
  path TEXT,
  url TEXT,
  note TEXT,
  metadata_json TEXT,
  content_hash TEXT,
  sensitive_flag INTEGER NOT NULL DEFAULT 0,
  sensitive_reason TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

### 10.2 settings

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 10.3 watched_folders

```sql
CREATE TABLE watched_folders (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
```

### 10.4 indexes

```sql
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_expires_at ON events(expires_at);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_content_hash ON events(content_hash);
```

## 11. 主要模块

### 11.1 Frontend

- `App.tsx`：应用主布局和路由。
- `TimelineView.tsx`：最近 30 分钟时间线。
- `SearchBar.tsx`：搜索输入和状态。
- `EventCard.tsx`：事件展示和快捷操作。
- `AddContextModal.tsx`：手动添加上下文。
- `ContextPackModal.tsx`：上下文包展示和复制。
- `SettingsView.tsx`：监听开关、截图文件夹、过期策略。
- `api.ts`：封装 Tauri invoke。

### 11.2 Backend

- `db.rs`：数据库初始化、迁移、连接池。
- `events.rs`：事件模型和 repository。
- `clipboard.rs`：剪贴板监听。
- `watcher.rs`：截图文件夹监控。
- `sensitive.rs`：敏感内容检测。
- `context_pack.rs`：Markdown 生成。
- `settings.rs`：设置读写。
- `commands.rs`：暴露给前端的 Tauri commands。

## 12. 隐私与安全

### 12.1 隐私承诺

- 数据只保存在本地。
- 不自动读取浏览器历史。
- 不自动读取终端历史。
- 不上传剪贴板或截图路径。
- 用户可随时关闭监听和清空数据。
- 默认 24 小时自动删除。

### 12.2 透明性

首次启动需要展示：

- 当前会监听哪些数据源。
- 数据保存在哪里。
- 数据多久删除。
- 哪些内容会被自动跳过。

### 12.3 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 保存密码或 token | 写入前敏感检测，命中不保存原文 |
| 剪贴板误采集隐私 | 默认清晰提示，可一键关闭 |
| 截图路径暴露敏感文件名 | 仅本地保存，可删除单条事件 |
| 用户误以为有云同步 | UI 明确标注 Local only |
| 数据无限增长 | 默认 24 小时过期清理 |

## 13. 边界与未来路线

### 13.1 MVP 后可加

- 浏览器插件同步当前标签页。
- VS Code 插件同步当前打开文件。
- 终端 shell hook 记录命令。
- OCR 识别截图文字。
- SQLite FTS5。
- 本地 LLM 总结「我刚才在干嘛」。
- 事件 pin，不自动过期。
- 项目级上下文包模板。

### 13.2 需要谨慎加入

- 自动读取浏览器历史。
- 自动读取聊天软件内容。
- 自动读取全部文件系统活动。
- 云端同步。
- 云端 AI 总结。

## 14. MVP 验收清单

- 用户可启动桌面应用。
- 用户可通过快捷键打开主窗口。
- 用户可启用或关闭剪贴板监听。
- 剪贴板文本变化可生成事件。
- 敏感剪贴板文本不会保存原文。
- 用户可选择截图文件夹。
- 新截图可生成事件。
- 用户可手动添加文本、链接、文件。
- 最近 30 分钟时间线可正确展示。
- 搜索可返回匹配事件。
- 上下文包可生成并复制。
- 事件默认 24 小时过期。
- 所有数据保存在本地 SQLite。

