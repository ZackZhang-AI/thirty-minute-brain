import { createIngestionGateway } from "./ingestionGateway";
import { updateSourcePermission } from "./permissions";
import type { ExternalIngestRequest } from "./ingestionGateway";
import type { EventStore } from "./localStore";
import type { SourceId } from "./permissions";
import type { SettingsStore } from "./settings";
import type { CreateEventRequest, MemoryEvent } from "./types";

export type TauriCommandCaller = (command: string, args?: Record<string, unknown>) => Promise<MemoryEvent>;

export interface TauriIngestionApiOptions {
  settingsStore: SettingsStore;
  callTauri: TauriCommandCaller;
  now?: () => Date;
}

export interface TauriIngestionApi {
  ingestExternalEvent(request: ExternalIngestRequest): Promise<MemoryEvent>;
}

export function createTauriIngestionApi(options: TauriIngestionApiOptions): TauriIngestionApi {
  const gateway = createIngestionGateway({
    store: createCommandBackedStore(options.callTauri),
    now: options.now,
    getSettings: () => {
      const settings = options.settingsStore.get();
      return {
        ingestionToken: settings.ingestionToken,
        permissions: settings.permissions
      };
    },
    onSourceWrite: (source, writtenAt) => updateLastWriteAt(options.settingsStore, source, writtenAt)
  });

  return {
    ingestExternalEvent(request) {
      return gateway.ingest(request);
    }
  };
}

function createCommandBackedStore(callTauri: TauriCommandCaller): EventStore {
  return {
    createEvent(input: CreateEventRequest) {
      return callTauri("ingest_external_event", { input });
    },
    createManualEvent: unsupported,
    createClipboardEvent: unsupported,
    listRecentEvents: unsupported,
    searchEvents: unsupported,
    updateEvent: unsupported,
    togglePinEvent: unsupported,
    deleteEvent: unsupported,
    deleteEvents: unsupported,
    generateContextPack: unsupported,
    clearAllEvents: unsupported,
    clearEvents: unsupported,
    getPrivacyStatus: unsupported
  };
}

function updateLastWriteAt(settingsStore: SettingsStore, source: SourceId, writtenAt: string): void {
  const settings = settingsStore.get();
  settingsStore.update({
    permissions: updateSourcePermission(settings.permissions, source, { lastWriteAt: writtenAt })
  });
}

async function unsupported(): Promise<never> {
  throw new Error("Unsupported command-backed store operation");
}
