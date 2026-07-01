import type { CreateEventRequest, EventType } from "./types";

const SUPPORTED_EVENT_TYPES = new Set<EventType>([
  "clipboard",
  "screenshot",
  "file",
  "link",
  "note",
  "browser_tab",
  "editor_file",
  "editor_selection",
  "command"
]);

const URL_REQUIRED_TYPES = new Set<EventType>(["link", "browser_tab"]);
const PATH_REQUIRED_TYPES = new Set<EventType>(["file", "screenshot", "editor_file"]);
const CONTENT_REQUIRED_TYPES = new Set<EventType>(["clipboard", "note", "editor_selection", "command"]);

const SOURCE_POLICY: Record<string, ReadonlySet<EventType>> = {
  manual: new Set(["file", "link", "note"]),
  clipboard: new Set(["clipboard"]),
  watched_folder: new Set(["screenshot"]),
  browser_extension: new Set(["browser_tab"]),
  vscode_extension: new Set(["editor_file", "editor_selection"]),
  shell_hook: new Set(["command"])
};

const TERMINAL_OUTPUT_METADATA_KEYS = new Set(["stdout", "stderr", "output", "commandOutput", "combinedOutput"]);

export function normalizeCreateEventRequest(input: CreateEventRequest): CreateEventRequest {
  if (!SUPPORTED_EVENT_TYPES.has(input.type)) {
    throw new Error(`Unsupported event type: ${String(input.type)}`);
  }

  const title = input.title?.trim() || fallbackTitle(input);
  const source = input.source?.trim();
  const url = input.url?.trim();
  const path = input.path?.trim();
  const content = input.content?.trim();
  const note = input.note?.trim();

  if (!source) {
    throw new Error("CreateEventRequest requires source");
  }

  assertSourceCanCreate(source, input.type);

  if (URL_REQUIRED_TYPES.has(input.type) && !url) {
    throw new Error(`${input.type} requires url`);
  }

  if (PATH_REQUIRED_TYPES.has(input.type) && !path) {
    throw new Error(`${input.type} requires path`);
  }

  if (CONTENT_REQUIRED_TYPES.has(input.type) && !content) {
    throw new Error(`${input.type} requires content`);
  }

  return {
    type: input.type,
    title,
    source,
    content,
    path,
    url,
    note,
    metadataJson: mergeMetadata(input.metadataJson, source, input.type)
  };
}

function assertSourceCanCreate(source: string, type: EventType): void {
  const allowedTypes = SOURCE_POLICY[source];
  if (!allowedTypes) {
    throw new Error(`Unauthorized event source: ${source}`);
  }

  if (!allowedTypes.has(type)) {
    throw new Error(`${source} cannot create ${type} events`);
  }
}

function fallbackTitle(input: CreateEventRequest): string {
  if (input.url) return safeUrlHost(input.url) ?? input.url;
  if (input.path) return fileNameFromPath(input.path);
  if (input.content) return input.content.slice(0, 80);
  return "Untitled event";
}

function mergeMetadata(metadataJson: string | undefined, source: string, type: EventType): string {
  let metadata: Record<string, unknown> = {};

  if (metadataJson) {
    try {
      const parsed = JSON.parse(metadataJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      metadata = { rawMetadata: metadataJson };
    }
  }

  if (type === "command") {
    metadata = stripTerminalOutputMetadata(metadata);
  }

  return JSON.stringify({
    ...metadata,
    source
  });
}

function stripTerminalOutputMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !TERMINAL_OUTPUT_METADATA_KEYS.has(key)));
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) || path || "Untitled file";
}

function safeUrlHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}
