import { generateContextPack } from "./contextPack";
import { normalizeCreateEventRequest } from "./ingestion";
import { filterSensitiveContent } from "./sensitive";
import { applyEventFilters, filterEventsForQuery, getEventsWithinWindow } from "./search";
import type {
  ClearEventsOptions,
  ContextPackOptions,
  CreateEventRequest,
  EventQueryOptions,
  EventUpdateInput,
  MemoryEvent,
  NewManualEventInput,
  PrivacyStatus
} from "./types";

interface LocalStoreOptions {
  now?: () => Date;
}

export interface EventStore {
  createEvent(input: CreateEventRequest): Promise<MemoryEvent>;
  createManualEvent(input: NewManualEventInput): Promise<MemoryEvent>;
  createClipboardEvent(content: string): Promise<MemoryEvent>;
  listRecentEvents(options?: EventQueryOptions | number): Promise<MemoryEvent[]>;
  searchEvents(query: string, options?: EventQueryOptions | number): Promise<MemoryEvent[]>;
  updateEvent(id: string, input: EventUpdateInput): Promise<MemoryEvent>;
  togglePinEvent(id: string, pinned: boolean): Promise<MemoryEvent>;
  deleteEvent(id: string): Promise<void>;
  deleteEvents(ids: string[]): Promise<void>;
  generateContextPack(options?: ContextPackOptions | number): Promise<string>;
  clearAllEvents(): Promise<void>;
  clearEvents(options?: ClearEventsOptions): Promise<void>;
  getPrivacyStatus(): Promise<PrivacyStatus>;
}

export function createLocalEventStore(options: LocalStoreOptions = {}): EventStore {
  const now = options.now ?? (() => new Date());
  let events: MemoryEvent[] = [];
  const seenClipboardHashes = new Set<string>();

  const sortDesc = (items: MemoryEvent[]) =>
    [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const createBaseEvent = (input: {
    type: MemoryEvent["type"];
    title: string;
    content?: string | null;
    path?: string | null;
    url?: string | null;
    note?: string | null;
    source?: string | null;
    metadataJson?: string | null;
    sensitiveFlag?: boolean;
    sensitiveReason?: string | null;
    contentHash?: string | null;
  }): MemoryEvent => {
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60_000);

    return {
      id: crypto.randomUUID(),
      type: input.type,
      title: input.title,
      content: input.content ?? null,
      source: input.source ?? null,
      path: input.path ?? null,
      url: input.url ?? null,
      note: input.note ?? null,
      metadataJson: input.metadataJson ?? null,
      contentHash: input.contentHash ?? null,
      sensitiveFlag: input.sensitiveFlag ?? false,
      sensitiveReason: input.sensitiveReason ?? null,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      pinnedAt: null
    };
  };

  const save = (event: MemoryEvent) => {
    events = [event, ...events];
    return event;
  };

  const store: EventStore = {
    async createEvent(input) {
      const normalized = normalizeCreateEventRequest(input);
      const contentHash = await sha256(stableEventHashInput(normalized));
      const existing = events.find((event) => event.contentHash === contentHash);
      if (existing) return existing;

      const filtered = normalized.content ? filterSensitiveContent(normalized.content) : null;
      return save(
        createBaseEvent({
          type: normalized.type,
          title: filtered?.sensitive ? filtered.title : normalized.title.trim() || filtered?.title || "Untitled",
          content: filtered ? filtered.content : null,
          path: normalized.path ?? null,
          url: normalized.url ?? null,
          note: normalized.note ?? null,
          source: normalized.source,
          metadataJson: normalized.metadataJson ?? null,
          contentHash,
          sensitiveFlag: filtered?.sensitive ?? false,
          sensitiveReason: filtered?.reason ?? null
        })
      );
    },

    async createManualEvent(input) {
      if (input.type === "note") {
        const filtered = filterSensitiveContent(input.content ?? input.note ?? "");
        return save(
          createBaseEvent({
            type: "note",
            title: filtered.sensitive ? filtered.title : input.title?.trim() || filtered.title,
            content: filtered.content,
            note: input.note ?? null,
            source: "manual",
            sensitiveFlag: filtered.sensitive,
            sensitiveReason: filtered.reason
          })
        );
      }

      if (input.type === "link") {
        const url = input.url?.trim() ?? "";
        const fallbackTitle = safeUrlHost(url) ?? url;
        return save(
          createBaseEvent({
            type: "link",
            title: input.title?.trim() || fallbackTitle,
            url,
            note: input.note ?? null,
            source: "manual"
          })
        );
      }

      const path = input.path?.trim() ?? "";
      return save(
        createBaseEvent({
          type: "file",
          title: input.title?.trim() || fileNameFromPath(path),
          path,
          note: input.note ?? null,
          source: "manual"
        })
      );
    },

    async createClipboardEvent(content) {
      const contentHash = await sha256(content);
      if (seenClipboardHashes.has(contentHash)) {
        return events.find((event) => event.contentHash === contentHash)!;
      }
      seenClipboardHashes.add(contentHash);
      const filtered = filterSensitiveContent(content);

      return save(
        createBaseEvent({
          type: "clipboard",
          title: filtered.title,
          content: filtered.content,
          source: "clipboard",
          contentHash,
          sensitiveFlag: filtered.sensitive,
          sensitiveReason: filtered.reason
        })
      );
    },

    async listRecentEvents(options = {}) {
      const normalized = normalizeQueryOptions(options);
      return sortDesc(applyEventFilters(getEventsWithinWindow(events, now(), normalized.windowMinutes, normalized), normalized));
    },

    async searchEvents(query, options = {}) {
      const normalized = normalizeQueryOptions(options);
      const windowed = getEventsWithinWindow(events, now(), normalized.windowMinutes, normalized);
      return sortDesc(applyEventFilters(filterEventsForQuery(windowed, query), normalized));
    },

    async updateEvent(id, input) {
      const existing = events.find((event) => event.id === id);
      if (!existing) throw new Error(`Event not found: ${id}`);
      const updated = {
        ...existing,
        title: input.title?.trim() || existing.title,
        note: input.note === undefined ? existing.note : input.note
      };
      events = events.map((event) => (event.id === id ? updated : event));
      return updated;
    },

    async togglePinEvent(id, pinned) {
      const existing = events.find((event) => event.id === id);
      if (!existing) throw new Error(`Event not found: ${id}`);
      const updated = {
        ...existing,
        pinnedAt: pinned ? now().toISOString() : null
      };
      events = events.map((event) => (event.id === id ? updated : event));
      return updated;
    },

    async deleteEvent(id) {
      events = events.filter((event) => event.id !== id);
    },

    async deleteEvents(ids) {
      const idSet = new Set(ids);
      events = events.filter((event) => !idSet.has(event.id));
    },

    async generateContextPack(options = {}) {
      const normalized = normalizeContextOptions(options);
      const sourceEvents = normalized.selectedIds?.length
        ? events.filter((event) => normalized.selectedIds?.includes(event.id))
        : await store.listRecentEvents(normalized);
      return generateContextPack(sourceEvents, { template: normalized.template });
    },

    async clearAllEvents() {
      events = [];
      seenClipboardHashes.clear();
    },

    async clearEvents(options = {}) {
      const cutoffMs =
        options.windowMinutes === undefined ? Number.POSITIVE_INFINITY : now().getTime() - options.windowMinutes * 60_000;
      events = events.filter((event) => {
        if (event.pinnedAt) return true;
        if (options.windowMinutes === undefined) return false;
        return new Date(event.createdAt).getTime() < cutoffMs;
      });
    },

    async getPrivacyStatus() {
      return {
        localOnly: true,
        retentionHours: 24,
        databasePath: "Browser preview memory store",
        eventCount: events.length,
        enabledSources: ["manual", "clipboard", "watched_folder", "browser_extension", "vscode_extension", "shell_hook"],
        disallowedSources: ["browser_history", "terminal_history", "chat_apps"]
      };
    }
  };

  return store;
}

function normalizeQueryOptions(options: EventQueryOptions | number): EventQueryOptions & { windowMinutes: number; includePinned: boolean } {
  if (typeof options === "number") {
    return { windowMinutes: options, includePinned: true };
  }
  return {
    ...options,
    windowMinutes: options.windowMinutes ?? 30,
    includePinned: options.includePinned ?? true
  };
}

function normalizeContextOptions(options: ContextPackOptions | number): ContextPackOptions & { windowMinutes: number; includePinned: boolean } {
  if (typeof options === "number") {
    return { windowMinutes: options, includePinned: true };
  }
  return {
    ...options,
    windowMinutes: options.windowMinutes ?? 30,
    includePinned: options.includePinned ?? true
  };
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

function stableEventHashInput(input: CreateEventRequest): string {
  return JSON.stringify({
    type: input.type,
    title: input.title,
    content: input.content ?? "",
    path: input.path ?? "",
    url: input.url ?? "",
    note: input.note ?? "",
    source: input.source
  });
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
