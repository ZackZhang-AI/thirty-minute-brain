# Phase 3 Integrations

Thirty-Minute Brain accepts external workflow events through the same `CreateEventRequest` contract used internally.

## Contract

```ts
interface CreateEventRequest {
  type:
    | "browser_tab"
    | "editor_file"
    | "editor_selection"
    | "command";
  title: string;
  content?: string;
  path?: string;
  url?: string;
  note?: string;
  source: "browser_extension" | "vscode_extension" | "shell_hook";
  metadataJson?: string;
}
```

## Source Rules

| Source | Allowed event types | Explicitly not collected |
| --- | --- | --- |
| `browser_extension` | `browser_tab` | Full browser history |
| `vscode_extension` | `editor_file`, `editor_selection` | Whole workspace scan |
| `shell_hook` | `command` | Command output and terminal history files |

Every request goes through:

- source/type permission checks
- required-field validation
- sensitive-content filtering
- stable hash de-duplication
- 24-hour expiration setup
- local search indexing

## Browser Extension

Location: `integrations/browser-extension`

The extension saves only the active tab. Default behavior is click-to-save. Optional active-tab sync is stored in extension-local settings.

## VS Code Extension

Location: `integrations/vscode-extension`

The extension exposes two commands:

- capture current file
- capture active selection

It does not read the whole project automatically.

## Shell Hooks

Location: `integrations/shell-hooks`

The shell hooks record command text only and send no stdout/stderr/output metadata. The desktop app strips terminal output metadata again on ingestion as a second safety layer.

## Desktop Entry Points

Implemented now:

- Tauri command: `ingest_external_event`
- Shared local validation in `src/lib/ingestion.ts`

Next native step:

- enable a loopback endpoint such as `POST http://127.0.0.1:38330/ingest`
- add Tauri deep-link routing for payloads like `thirty-minute-brain://ingest?...`
- add a local ingestion token in the permission center
