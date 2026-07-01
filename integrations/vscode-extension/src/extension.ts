import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("thirtyMinuteBrain.captureCurrentFile", captureCurrentFile),
    vscode.commands.registerCommand("thirtyMinuteBrain.captureSelection", captureSelection)
  );
}

export function deactivate() {}

async function captureCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  await sendEvent({
    type: "editor_file",
    title: fileName(editor.document.uri.fsPath),
    path: editor.document.uri.fsPath,
    source: "vscode_extension",
    metadataJson: JSON.stringify({
      workspace: workspaceName(),
      language: editor.document.languageId,
      timestamp: new Date().toISOString()
    })
  });
}

async function captureSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selectedText = editor.document.getText(editor.selection);
  if (!selectedText.trim()) return;

  await sendEvent({
    type: "editor_selection",
    title: `${fileName(editor.document.uri.fsPath)} selection`,
    content: selectedText,
    path: editor.document.uri.fsPath,
    source: "vscode_extension",
    metadataJson: JSON.stringify({
      workspace: workspaceName(),
      language: editor.document.languageId,
      selectionPreview: selectedText.slice(0, 500),
      timestamp: new Date().toISOString()
    })
  });
}

async function sendEvent(payload: Record<string, unknown>) {
  const config = vscode.workspace.getConfiguration("thirtyMinuteBrain");
  const ingestUrl = config.get<string>("ingestUrl", "http://127.0.0.1:38330/ingest");
  const token = config.get<string>("ingestionToken", "");

  await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-thirty-minute-brain-token": token
    },
    body: JSON.stringify(payload)
  });
}

function workspaceName(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.name;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) || path;
}
