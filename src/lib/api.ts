import { invoke } from "@tauri-apps/api/core";
import { ingestDeepLink } from "./deepLinkIngestion";
import { createExternalIngestionApi } from "./externalIngestionApi";
import { createLocalEventStore } from "./localStore";
import { createSettingsStore } from "./settings";
import { createTauriIngestionApi } from "./tauriIngestionApi";
import type { ExternalIngestRequest } from "./ingestionGateway";
import type { EventStore } from "./localStore";
import type {
  ClearEventsOptions,
  ContextPackOptions,
  CreateEventRequest,
  EventQueryOptions,
  EventUpdateInput,
  MemoryEvent,
  NewManualEventInput,
  PrivacyStatus,
  WatchedFolder
} from "./types";

const localStore = createLocalEventStore();
const localSettingsStore = createSettingsStore();
const localExternalIngestionApi = createExternalIngestionApi({
  store: localStore,
  settingsStore: localSettingsStore
});
const tauriExternalIngestionApi = createTauriIngestionApi({
  settingsStore: localSettingsStore,
  callTauri
});

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

async function callTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args);
}

export const eventApi: EventStore = {
  async createEvent(input: CreateEventRequest): Promise<MemoryEvent> {
    if (isTauriRuntime()) return callTauri("create_event", { input });
    return localStore.createEvent(input);
  },

  async createManualEvent(input: NewManualEventInput): Promise<MemoryEvent> {
    if (isTauriRuntime()) return callTauri("create_manual_event", { input });
    return localStore.createManualEvent(input);
  },

  async createClipboardEvent(content: string): Promise<MemoryEvent> {
    if (isTauriRuntime()) return callTauri("create_clipboard_event", { content });
    return localStore.createClipboardEvent(content);
  },

  async listRecentEvents(options: EventQueryOptions | number = 30): Promise<MemoryEvent[]> {
    const args = normalizeQueryArgs(options);
    if (isTauriRuntime()) return callTauri("list_recent_events", { ...args });
    return localStore.listRecentEvents(options);
  },

  async searchEvents(query: string, options: EventQueryOptions | number = 30): Promise<MemoryEvent[]> {
    const args = normalizeQueryArgs(options);
    if (isTauriRuntime()) return callTauri("search_events", { query, ...args });
    return localStore.searchEvents(query, options);
  },

  async updateEvent(id: string, input: EventUpdateInput): Promise<MemoryEvent> {
    if (isTauriRuntime()) return callTauri("update_event", { id, input });
    return localStore.updateEvent(id, input);
  },

  async togglePinEvent(id: string, pinned: boolean): Promise<MemoryEvent> {
    if (isTauriRuntime()) return callTauri("toggle_pin_event", { id, pinned });
    return localStore.togglePinEvent(id, pinned);
  },

  async deleteEvent(id: string): Promise<void> {
    if (isTauriRuntime()) return callTauri("delete_event", { id });
    return localStore.deleteEvent(id);
  },

  async deleteEvents(ids: string[]): Promise<void> {
    if (isTauriRuntime()) return callTauri("delete_events", { ids });
    return localStore.deleteEvents(ids);
  },

  async generateContextPack(options: ContextPackOptions | number = 30): Promise<string> {
    const args = typeof options === "number" ? { windowMinutes: options } : options;
    if (isTauriRuntime()) return callTauri("generate_context_pack", { ...args });
    return localStore.generateContextPack(options);
  },

  async clearAllEvents(): Promise<void> {
    if (isTauriRuntime()) return callTauri("clear_all_events");
    return localStore.clearAllEvents();
  },

  async clearEvents(options: ClearEventsOptions = {}): Promise<void> {
    if (isTauriRuntime()) return callTauri("clear_events", { ...options });
    return localStore.clearEvents(options);
  },

  async getPrivacyStatus(): Promise<PrivacyStatus> {
    if (isTauriRuntime()) return callTauri("get_privacy_status");
    return localStore.getPrivacyStatus();
  }
};

export const ingestionApi = {
  async ingestExternalEvent(request: ExternalIngestRequest): Promise<MemoryEvent> {
    if (isTauriRuntime()) {
      return tauriExternalIngestionApi.ingestExternalEvent(request);
    }
    return localExternalIngestionApi.ingestExternalEvent(request);
  },

  async ingestDeepLink(value: string): Promise<MemoryEvent> {
    return ingestDeepLink(value, ingestionApi);
  }
};

function normalizeQueryArgs(options: EventQueryOptions | number): EventQueryOptions & { windowMinutes: number } {
  if (typeof options === "number") return { windowMinutes: options };
  return { ...options, windowMinutes: options.windowMinutes ?? 30 };
}

let localWatchedFolders: WatchedFolder[] = [];

export const folderApi = {
  async addWatchedFolder(path: string): Promise<WatchedFolder> {
    if (isTauriRuntime()) return callTauri("add_watched_folder", { path });
    const folder: WatchedFolder = {
      id: crypto.randomUUID(),
      path,
      kind: "screenshot",
      enabled: true,
      createdAt: new Date().toISOString()
    };
    localWatchedFolders = [folder, ...localWatchedFolders];
    return folder;
  },

  async listWatchedFolders(): Promise<WatchedFolder[]> {
    if (isTauriRuntime()) return callTauri("list_watched_folders");
    return localWatchedFolders;
  },

  async removeWatchedFolder(id: string): Promise<void> {
    if (isTauriRuntime()) return callTauri("remove_watched_folder", { id });
    localWatchedFolders = localWatchedFolders.filter((folder) => folder.id !== id);
  }
};
