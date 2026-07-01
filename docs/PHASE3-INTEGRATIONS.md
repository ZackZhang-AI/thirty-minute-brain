# Phase 3 工作流接入说明

Thirty-Minute Brain 的外部接入统一使用 `CreateEventRequest`。浏览器插件、VS Code 插件和 shell hook 不能直接写数据库，必须先经过 ingestion gateway。

## 统一协议

```ts
interface CreateEventRequest {
  type: "browser_tab" | "editor_file" | "editor_selection" | "command";
  title: string;
  content?: string;
  path?: string;
  url?: string;
  note?: string;
  source: "browser_extension" | "vscode_extension" | "shell_hook";
  metadataJson?: string;
}
```

## 入口

当前已实现：

- `src/lib/ingestion.ts`：来源/类型白名单、必填字段校验、命令输出 metadata 二次剥离。
- `src/lib/ingestionGateway.ts`：token 校验、来源启用状态、全局暂停、权限检查、敏感过滤、去重、写入回调。
- `src/lib/externalIngestionApi.ts`：settings-backed 本地预览接入 API，写入成功后更新来源 `lastWriteAt`。
- `src/lib/deepLink.ts`：解析 `thirty-minute-brain://ingest?token=...&payload=...`。
- `src/lib/api.ts`：导出本地预览 `ingestionApi.ingestExternalEvent`；Tauri runtime 暂时显式拒绝，避免绕过 SQLite/token 语义。
- Tauri command 雏形：`ingest_external_event`。

下一步原生接入：

- 将 Tauri command 接到同一套动态权限/token 语义。
- 启用本地 loopback endpoint：`POST http://127.0.0.1:38330/ingest`。
- 在桌面端注册 deep link scheme。

## Deep Link 格式

```text
thirty-minute-brain://ingest?token=<local-token>&payload=<base64url-json>
```

`payload` 是 `CreateEventRequest` 的 base64url JSON。桌面端解析后仍然会走 gateway，不允许绕过权限、敏感过滤或去重。

## 来源规则

| Source | Allowed event types | 明确不采集 |
| --- | --- | --- |
| `browser_extension` | `browser_tab` | 完整浏览器历史、页面正文、Cookie |
| `vscode_extension` | `editor_file`, `editor_selection` | 整个 workspace、未打开文件 |
| `shell_hook` | `command` | 命令输出、终端历史文件、环境变量 |

## 浏览器插件

位置：`integrations/browser-extension`

- 只保存当前 active tab 的标题和 URL。
- 默认由用户点击插件按钮保存。
- 可选开启 active tab 自动同步。
- 不读取完整浏览器历史。

## VS Code 插件

位置：`integrations/vscode-extension`

命令：

- `Thirty-Minute Brain: Capture Current File`
- `Thirty-Minute Brain: Capture Selection`

约束：

- 当前文件只发送路径、workspace、语言信息。
- selection 只发送用户主动选中的片段预览。
- 不自动扫描整个项目。

## Shell Hooks

位置：`integrations/shell-hooks`

支持：

- PowerShell
- bash
- zsh

约束：

- 只记录命令文本。
- 默认不记录 stdout/stderr/output。
- 即使插件误传输出，桌面端也会剥离相关 metadata。
- 命令文本写入前仍会执行敏感内容过滤。

## 写入流程

每个外部事件都必须经过：

1. ingestion token 校验。
2. 来源是否启用检查。
3. 全局暂停检查。
4. source/type 白名单检查。
5. 必填字段校验。
6. 敏感内容过滤。
7. 稳定 hash 去重。
8. 默认 24 小时过期时间设置。
9. 搜索索引写入。
10. 来源最近写入时间更新。
