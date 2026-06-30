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

  if (URL_REQUIRED_TYPES.has(input.type) && !url) {
    throw new Error(`${input.type} requires url`);
  }

  if (PATH_REQUIRED_TYPES.has(input.type) && !path) {
    throw new Error(`${input.type} requires path`);
  }

  return {
    type: input.type,
    title,
    source,
    content,
    path,
    url,
    note,
    metadataJson: mergeMetadata(input.metadataJson, source)
  };
}

function fallbackTitle(input: CreateEventRequest): string {
  if (input.url) return safeUrlHost(input.url) ?? input.url;
  if (input.path) return fileNameFromPath(input.path);
  if (input.content) return input.content.slice(0, 80);
  return "Untitled event";
}

function mergeMetadata(metadataJson: string | undefined, source: string): string {
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

  return JSON.stringify({
    ...metadata,
    source
  });
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
