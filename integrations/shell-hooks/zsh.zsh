export THIRTY_MINUTE_BRAIN_INGEST_URL="${THIRTY_MINUTE_BRAIN_INGEST_URL:-http://127.0.0.1:38330/ingest}"
export THIRTY_MINUTE_BRAIN_TOKEN="${THIRTY_MINUTE_BRAIN_TOKEN:-}"
__THIRTY_MINUTE_BRAIN_LAST_COMMAND=""

__thirty_minute_brain_capture_command() {
  local command
  command="$(fc -ln -1)"
  if [[ -z "$command" || "$command" == "$__THIRTY_MINUTE_BRAIN_LAST_COMMAND" ]]; then
    return
  fi
  __THIRTY_MINUTE_BRAIN_LAST_COMMAND="$command"

  curl -sS -X POST "$THIRTY_MINUTE_BRAIN_INGEST_URL" \
    -H "content-type: application/json" \
    -H "x-thirty-minute-brain-token: $THIRTY_MINUTE_BRAIN_TOKEN" \
    --data "$(printf '{"type":"command","title":%s,"content":%s,"source":"shell_hook","metadataJson":%s}' \
      "$(printf '%s' "$command" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
      "$(printf '%s' "$command" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
      "$(printf '{"shell":"zsh","timestamp":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")" \
    >/dev/null 2>&1 || true
}

autoload -Uz add-zsh-hook
add-zsh-hook precmd __thirty_minute_brain_capture_command
