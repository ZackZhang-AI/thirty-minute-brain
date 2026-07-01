# Thirty-Minute Brain VS Code Extension

This scaffold only sends the current file or the user's active selection.

It does not scan the workspace and does not read the whole project automatically.

Commands:

- `Thirty-Minute Brain: Capture Current File`
- `Thirty-Minute Brain: Capture Selection`

Expected desktop endpoint:

```text
POST http://127.0.0.1:38330/ingest
```
