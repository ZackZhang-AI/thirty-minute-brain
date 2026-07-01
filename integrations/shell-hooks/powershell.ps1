param(
  [string]$IngestUrl = "http://127.0.0.1:38330/ingest",
  [string]$Token = ""
)

$script:ThirtyMinuteBrainLastCommandId = -1

function Send-ThirtyMinuteBrainCommand {
  $history = Get-History -Count 1
  if (-not $history) { return }
  if ($history.Id -eq $script:ThirtyMinuteBrainLastCommandId) { return }
  $script:ThirtyMinuteBrainLastCommandId = $history.Id

  $payload = @{
    type = "command"
    title = $history.CommandLine
    content = $history.CommandLine
    source = "shell_hook"
    metadataJson = (@{
      shell = "powershell"
      timestamp = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json -Compress)
  } | ConvertTo-Json -Compress

  try {
    Invoke-RestMethod -Method Post -Uri $IngestUrl -Headers @{
      "content-type" = "application/json"
      "x-thirty-minute-brain-token" = $Token
    } -Body $payload | Out-Null
  } catch {
    # Best effort: never interrupt the shell prompt.
  }
}

function prompt {
  Send-ThirtyMinuteBrainCommand
  "PS $($executionContext.SessionState.Path.CurrentLocation)$('>' * ($nestedPromptLevel + 1)) "
}
