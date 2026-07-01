import { parseIngestionDeepLink } from "./deepLink";
import type { ExternalIngestRequest } from "./ingestionGateway";
import type { MemoryEvent } from "./types";

export interface DeepLinkIngestionTarget {
  ingestExternalEvent(request: ExternalIngestRequest): Promise<MemoryEvent>;
}

export function ingestDeepLink(value: string, target: DeepLinkIngestionTarget): Promise<MemoryEvent> {
  return target.ingestExternalEvent(parseIngestionDeepLink(value));
}
