# Thirty-Minute Brain Shell Hooks

These hooks record command text only. They do not record command output.

Supported examples:

- `powershell.ps1`
- `bash.sh`
- `zsh.zsh`

All payloads use:

```json
{
  "type": "command",
  "title": "git status",
  "content": "git status",
  "source": "shell_hook",
  "metadataJson": "{\"shell\":\"bash\",\"timestamp\":\"2026-07-01T00:00:00Z\"}"
}
```

The desktop app still performs sensitive-content filtering before storage.
