import { normalizeCreateEventRequest } from "./ingestion";
import { canSourceIngest } from "./permissions";
import type { EventStore } from "./localStore";
import type { PermissionSettings, SourceId } from "./permissions";
import type { CreateEventRequest, MemoryEvent } from "./types";

export interface IngestionGatewaySettings {
  ingestionToken: string;
  permissions: PermissionSettings;
}

export interface IngestionGatewayOptions {
  store: EventStore;
  getSettings: () => IngestionGatewaySettings;
  now?: () => Date;
  onSourceWrite?: (source: SourceId, writtenAt: string) => void;
}

export interface ExternalIngestRequest {
  token: string;
  event: CreateEventRequest;
}

export interface IngestionGateway {
  ingest(request: ExternalIngestRequest): Promise<MemoryEvent>;
}

export function createIngestionGateway(options: IngestionGatewayOptions): IngestionGateway {
  const now = options.now ?? (() => new Date());

  return {
    async ingest(request) {
      const settings = options.getSettings();
      if (!settings.ingestionToken || request.token !== settings.ingestionToken) {
        throw new Error("Invalid ingestion token");
      }

      const normalized = normalizeCreateEventRequest(request.event);
      const source = normalized.source as SourceId;
      const sourcePermission = settings.permissions.sources[source];
      if (!sourcePermission?.enabled) {
        throw new Error(`Source ${normalized.source} is disabled`);
      }

      if (settings.permissions.globalPaused && source !== "manual") {
        throw new Error("Ingestion is paused");
      }

      if (!canSourceIngest(settings.permissions, source, normalized.type)) {
        throw new Error(`${normalized.source} cannot create ${normalized.type} events`);
      }

      const event = await options.store.createEvent(normalized);
      options.onSourceWrite?.(source, now().toISOString());
      return event;
    }
  };
}
