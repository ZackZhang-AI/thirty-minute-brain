import { createIngestionGateway } from "./ingestionGateway";
import { updateSourcePermission } from "./permissions";
import type { ExternalIngestRequest } from "./ingestionGateway";
import type { EventStore } from "./localStore";
import type { SourceId } from "./permissions";
import type { SettingsStore } from "./settings";
import type { MemoryEvent } from "./types";

export interface ExternalIngestionApi {
  ingestExternalEvent(request: ExternalIngestRequest): Promise<MemoryEvent>;
}

export interface ExternalIngestionApiOptions {
  store: EventStore;
  settingsStore: SettingsStore;
  now?: () => Date;
}

export function createExternalIngestionApi(options: ExternalIngestionApiOptions): ExternalIngestionApi {
  const gateway = createIngestionGateway({
    store: options.store,
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

function updateLastWriteAt(settingsStore: SettingsStore, source: SourceId, writtenAt: string): void {
  const settings = settingsStore.get();
  settingsStore.update({
    permissions: updateSourcePermission(settings.permissions, source, { lastWriteAt: writtenAt })
  });
}
