#!/usr/bin/env bash

export THIRTY_MINUTE_BRAIN_INGEST_URL="${THIRTY_MINUTE_BRAIN_INGEST_URL:-http://127.0.0.1:38330/ingest}"
export THIRTY_MINUTE_BRAIN_TOKEN="${THIRTY_MINUTE_BRAIN_TOKEN:-}"
__THIRTY_MINUTE_BRAIN_LAST_COMMAND=""

__thirty_minute_brain_capture_command() {
  local command
  command="$(history 1 | sed 's/^[[:space:]]*[0-9]\+[[:space:]]*//')"
  if [[ -z "$command" || "$command" == "$__THIRTY_MINUTE_BRAIN_LAST_COMMAND" ]]; then
    return
  fi
  __THIRTY_MINUTE_BRAIN_LAST_COMMAND="$command"

  curl -sS -X POST "$THIRTY_MINUTE_BRAIN_INGEST_URL" \
    -H "content-type: application/json" \
    -H "x-thirty-minute-brain-token: $THIRTY_MINUTE_BRAIN_TOKEN" \
    --data "$(printf '{"type":"command","title":%s,"content":%s,"source":"shell_hook","metadataJson":%s}' \
      "$(printf '%s' "$command" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
      "$(printf '%s' "$command" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
      "$(printf '{"shell":"bash","timestamp":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")" \
    >/dev/null 2>&1 || true
}

PROMPT_COMMAND="__thirty_minute_brain_capture_command${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
