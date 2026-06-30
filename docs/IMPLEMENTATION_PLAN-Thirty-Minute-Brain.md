# Thirty-Minute Brain 执行计划

## 1. 实施策略

采用本地优先、风险递增的实现顺序：

1. 先搭建可运行桌面壳和数据库。
2. 再实现事件写入、读取、搜索。
3. 再接入低风险采集源：手动添加、剪贴板、截图文件夹。
4. 最后做隐私保护、上下文包、设置和打包。

每个阶段都必须产出可运行、可验证的软件，不把关键风险留到最后。

## 2. 推荐项目结构

```text
thirty-minute-brain/
  package.json
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    styles.css
    lib/
      api.ts
      time.ts
      types.ts
    components/
      SearchBar.tsx
      TimelineView.tsx
      EventCard.tsx
      AddContextModal.tsx
      ContextPackModal.tsx
      SettingsView.tsx
      EmptyState.tsx
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs
      db.rs
      models.rs
      events.rs
      commands.rs
      clipboard.rs
      watcher.rs
      sensitive.rs
      context_pack.rs
      settings.rs
      cleanup.rs
    migrations/
      001_init.sql
  docs/
    PRD-Thirty-Minute-Brain.md
    IMPLEMENTATION_PLAN-Thirty-Minute-Brain.md
```

## 3. 阶段一：项目初始化

**目标：** 创建 Tauri + React + TypeScript + Tailwind 项目，并能启动桌面窗口。

### 任务

1. 初始化 Vite React TypeScript 项目。
2. 初始化 Tauri 2。
3. 接入 Tailwind CSS。
4. 配置基础窗口：
   - 标题：Thirty-Minute Brain
   - 默认尺寸：900 x 680
   - 最小尺寸：720 x 520
5. 创建基础 UI：
   - 搜索框
   - 时间线区域
   - 添加按钮
   - 生成上下文包按钮
   - 设置入口

### 验收

- `npm run tauri dev` 可启动桌面应用。
- 主界面不依赖后端数据也能显示空状态。

## 4. 阶段二：数据库与事件模型

**目标：** 建立 SQLite schema，并完成事件的增删查搜。

### 后端任务

1. 添加 SQLite 依赖。
2. 创建 `events`、`settings`、`watched_folders` 表。
3. 实现数据库初始化和迁移。
4. 定义 Rust Event model。
5. 实现 EventRepository：
   - `create_event`
   - `list_recent_events`
   - `search_events`
   - `delete_event`
   - `cleanup_expired_events`
6. 暴露 Tauri commands：
   - `create_manual_event`
   - `list_recent_events`
   - `search_events`
   - `delete_event`

### 前端任务

1. 定义 TypeScript Event 类型。
2. 封装 `src/lib/api.ts`。
3. 时间线从真实后端读取事件。
4. 添加删除单条事件的 UI 操作。

### 验收

- 手动创建一条事件后，重启应用仍能看到。
- 搜索关键词能返回匹配标题或内容的事件。
- 删除事件后不再显示。

## 5. 阶段三：手动添加上下文

**目标：** 先实现完全可控的数据入口。

### 功能

1. 用户可添加 Text。
2. 用户可添加 Link。
3. 用户可添加 File path。
4. 用户可添加 note。
5. 系统自动生成标题：
   - Text：取前 80 字符。
   - Link：优先用用户标题，否则用 URL host。
   - File：使用文件名。

### UI

添加上下文弹窗包含：

- 类型切换：Text / Link / File。
- 标题输入，可选。
- 内容输入。
- 备注输入。
- 保存按钮。

### 验收

- 三种手动事件都可保存并展示。
- Link 可点击打开默认浏览器。
- File 可点击打开所在位置或文件。

## 6. 阶段四：敏感内容过滤

**目标：** 所有文本写入前经过敏感检测。

### 检测规则

实现 `sensitive.rs`：

- `password\s*[:=]`
- `passwd\s*[:=]`
- `secret\s*[:=]`
- `token\s*[:=]`
- `api[_-]?key\s*[:=]`
- JWT：`eyJ...`.`...`.`...`
- GitHub token：`ghp_`、`github_pat_`
- OpenAI key：`sk-`
- AWS access key：`AKIA[0-9A-Z]{16}`
- 信用卡号：数字候选 + Luhn 校验
- 长随机字符串：长度大于 32 且字符熵较高

### 命中策略

命中后保存事件，但不保存原文：

- `title = "敏感内容已跳过"`
- `content = null`
- `sensitive_flag = true`
- `sensitive_reason = matched rule`

### 验收

- 复制或添加 `password=abc123` 时数据库不出现 `abc123`。
- 复制普通报错时正常保存。

## 7. 阶段五：剪贴板监听

**目标：** 后台监听文本剪贴板变化并自动保存。

### 后端任务

1. 实现 ClipboardWatcher。
2. 默认轮询间隔 1000ms。
3. 记录上一次 content hash，避免重复。
4. 只保存非空文本。
5. 写入前调用敏感内容过滤。
6. 事件生成后通知前端刷新。

### 设置项

- `clipboard.enabled`
- `clipboard.poll_interval_ms`

### 验收

- 复制一段普通文本，1 秒内出现在时间线。
- 连续复制同一段文本，不重复创建事件。
- 复制疑似 token，不保存原文。
- 关闭剪贴板监听后，不再生成 clipboard 事件。

## 8. 阶段六：截图文件夹监控

**目标：** 用户选择截图文件夹后，新图片自动生成事件。

### 后端任务

1. 实现 watched folder CRUD。
2. 使用文件夹监控库监听 create 事件。
3. 支持 png、jpg、jpeg、webp。
4. 文件稳定后再写入事件。
5. 应用启动时恢复已启用文件夹监听。

### 前端任务

1. 设置页显示截图文件夹列表。
2. 支持添加文件夹。
3. 支持移除文件夹。
4. 事件卡片支持图片预览。

### 验收

- 添加截图文件夹后，新图片保存时会出现在时间线。
- 非图片文件不会生成事件。
- 重启应用后监听仍然生效。

## 9. 阶段七：搜索与时间窗口

**目标：** 优化主体验，让用户找东西足够快。

### 功能

1. 搜索 title、content、path、url、note。
2. 默认范围最近 30 分钟。
3. 可切换最近 24 小时。
4. 搜索为空时显示最近 30 分钟时间线。
5. 搜索结果按时间倒序。

### 实现

MVP 使用 SQLite LIKE：

```sql
WHERE created_at >= ?
AND (
  title LIKE ?
  OR content LIKE ?
  OR path LIKE ?
  OR url LIKE ?
  OR note LIKE ?
)
ORDER BY created_at DESC
```

### 验收

- 搜索 `TypeError` 能找到剪贴板报错。
- 搜索文件名能找到 file 或 screenshot 事件。
- 搜索 URL 片段能找到 link 事件。

## 10. 阶段八：上下文包生成

**目标：** 把最近 30 分钟整理成可复制 Markdown。

### 后端任务

1. 查询最近 30 分钟事件。
2. 按类型分组。
3. 根据关键词生成保守总结。
4. 输出 Markdown。
5. 避免输出 sensitive_flag 事件原文。

### 前端任务

1. 添加「生成上下文包」按钮。
2. 弹窗展示 Markdown。
3. 支持复制到剪贴板。
4. 支持保存为 `.md` 文件。

### 验收

- 点击按钮能生成结构化 Markdown。
- 复制后可粘贴到 Codex 或聊天软件。
- 敏感事件只显示「敏感内容已跳过」。

## 11. 阶段九：过期清理与隐私设置

**目标：** 建立用户信任。

### 后端任务

1. 新事件默认 `expires_at = created_at + 24h`。
2. 应用启动时清理过期事件。
3. 后台每 30 分钟清理一次。
4. 实现一键清空所有事件。

### 前端任务

1. 设置页显示：
   - 本地数据库路径。
   - 当前事件数量。
   - 默认过期时间。
   - 清空所有事件按钮。
2. 首次启动显示隐私说明。

### 验收

- 过期事件会被删除。
- 用户能看到数据保存位置。
- 用户能一键清空所有数据。

## 12. 阶段十：快捷键、托盘和体验打磨

**目标：** 让它像真正的桌面临时脑子。

### 功能

1. 全局快捷键打开主窗口。
2. 系统托盘常驻。
3. 关闭窗口时默认隐藏到托盘。
4. 托盘菜单：
   - 打开 Thirty-Minute Brain
   - 暂停剪贴板监听
   - 清空最近事件
   - 退出
5. 空状态和错误状态优化。

### 推荐快捷键

- Windows/Linux：`Ctrl+Shift+Space`
- macOS：`Cmd+Shift+Space`

### 验收

- 按快捷键能唤起窗口并聚焦搜索框。
- 关闭窗口后后台监听仍按设置运行。
- 从托盘可以退出应用。

## 13. 阶段十一：测试

### 后端测试

重点测试：

- 敏感内容检测。
- Luhn 信用卡检测。
- 事件创建和搜索。
- 过期清理。
- content hash 去重。
- context pack 生成。

### 前端测试

重点测试：

- 时间线渲染。
- 搜索状态。
- 添加上下文表单。
- 上下文包弹窗。
- 设置项读写。

### 手动验收脚本

1. 启动应用。
2. 复制普通报错。
3. 搜索报错关键词。
4. 复制疑似 token。
5. 确认原文未保存。
6. 手动添加一个 GitHub 链接。
7. 选择截图文件夹。
8. 保存一张新截图。
9. 生成上下文包。
10. 重启应用确认数据仍存在。
11. 清空所有事件。

## 14. 阶段十二：打包与发布

### 任务

1. 配置应用图标。
2. 配置 Windows 构建。
3. 配置 macOS 构建，后续处理签名和 notarization。
4. 配置 Linux 构建，AppImage 或 deb。
5. 写 README：
   - 产品定位。
   - 隐私说明。
   - 功能列表。
   - 本地开发。
   - 构建命令。

### MVP 发布标准

- Windows 可安装包可运行。
- README 明确说明不会读取浏览器历史和终端历史。
- 首次启动有隐私提示。

## 15. 里程碑排期

### Week 1：基础可用

- 项目初始化。
- SQLite schema。
- 手动添加上下文。
- 时间线。
- 搜索。

产出：一个不自动采集、但能手动添加和搜索的本地上下文工具。

### Week 2：自动记忆

- 敏感内容过滤。
- 剪贴板监听。
- 截图文件夹监控。
- 过期清理。

产出：MVP 核心功能闭环。

### Week 3：产品化

- 上下文包。
- 设置页。
- 快捷键。
- 托盘。
- 打包。
- README。

产出：可给早期用户试用的桌面应用。

## 16. 风险控制

| 风险 | 解决策略 |
| --- | --- |
| Tauri 插件兼容问题 | 优先使用 Tauri 官方插件；插件不稳时用 Rust crate 封装 |
| 剪贴板采集隐私争议 | 首次启动明确提示；设置中可关闭；敏感内容跳过 |
| 文件夹监控误触发 | 只监听用户选择文件夹；只接受图片扩展名；路径去重 |
| 搜索性能下降 | MVP LIKE；数据量上升后切 FTS5 |
| 应用边界扩大 | MVP 禁止浏览器历史、终端历史、自动 IDE 读取 |
| 上下文包总结不准 | MVP 使用规则摘要，不假装 AI 已理解用户意图 |

## 17. 后续版本路线

### v0.2

- SQLite FTS5。
- Pin 事件，不自动过期。
- OCR 截图文字。
- 本地 LLM 总结「我刚才在干嘛」。

### v0.3

- 浏览器插件同步当前标签页。
- VS Code 插件同步当前文件。
- 项目级上下文包。

### v1.0

- 多设备端到端加密同步，可选。
- 更完整的权限中心。
- 事件来源插件系统。
- 团队协作上下文包。

