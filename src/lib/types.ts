export type EventType =
  | "clipboard"
  | "screenshot"
  | "file"
  | "link"
  | "note"
  | "browser_tab"
  | "editor_file"
  | "editor_selection"
  | "command";

export type ContextPackTemplate = "ai" | "teammate" | "bug_report" | "meeting";

export interface MemoryEvent {
  id: string;
  type: EventType;
  title: string;
  content: string | null;
  source: string | null;
  path: string | null;
  url: string | null;
  note: string | null;
  metadataJson: string | null;
  contentHash: string | null;
  sensitiveFlag: boolean;
  sensitiveReason: string | null;
  createdAt: string;
  expiresAt: string;
  pinnedAt: string | null;
}

export interface NewManualEventInput {
  type: Extract<EventType, "file" | "link" | "note">;
  title?: string;
  content?: string;
  path?: string;
  url?: string;
  note?: string;
}

export interface CreateEventRequest {
  type: EventType;
  title: string;
  content?: string;
  path?: string;
  url?: string;
  note?: string;
  source: string;
  metadataJson?: string;
}

export interface EventQueryOptions {
  windowMinutes?: number;
  types?: EventType[];
  sensitiveOnly?: boolean;
  includePinned?: boolean;
}

export interface ContextPackOptions extends EventQueryOptions {
  template?: ContextPackTemplate;
  selectedIds?: string[];
}

export interface EventUpdateInput {
  title?: string;
  note?: string | null;
}

export interface ClearEventsOptions {
  windowMinutes?: number;
}

export interface PrivacyStatus {
  localOnly: boolean;
  retentionHours: number;
  databasePath: string;
  eventCount: number;
  enabledSources: string[];
  disallowedSources: string[];
}

export interface WatchedFolder {
  id: string;
  path: string;
  kind: "screenshot";
  enabled: boolean;
  createdAt: string;
}
