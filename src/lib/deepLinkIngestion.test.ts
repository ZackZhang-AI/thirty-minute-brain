import { describe, expect, it } from "vitest";
import { toDeepLinkPayload } from "./deepLink";
import { ingestDeepLink } from "./deepLinkIngestion";
import type { ExternalIngestRequest } from "./ingestionGateway";
import type { MemoryEvent } from "./types";

describe("ingestDeepLink", () => {
  it("parses a deep link and routes it to the provided ingestion API", async () => {
    const requests: ExternalIngestRequest[] = [];
    const payload = toDeepLinkPayload({
      type: "browser_tab",
      title: "Docs",
      url: "https://example.com",
      source: "browser_extension"
    });

    const event = await ingestDeepLink(`thirty-minute-brain://ingest?token=secret-token&payload=${payload}`, {
      ingestExternalEvent: async (request) => {
        requests.push(request);
        return sampleEvent();
      }
    });

    expect(event.id).toBe("deep-link-event");
    expect(requests).toHaveLength(1);
    expect(requests[0].token).toBe("secret-token");
    expect(requests[0].event.type).toBe("browser_tab");
  });
});

function sampleEvent(): MemoryEvent {
  return {
    id: "deep-link-event",
    type: "browser_tab",
    title: "Docs",
    content: null,
    source: "browser_extension",
    path: null,
    url: "https://example.com",
    note: null,
    metadataJson: null,
    contentHash: "hash",
    sensitiveFlag: false,
    sensitiveReason: null,
    createdAt: "2026-07-01T04:00:00.000Z",
    expiresAt: "2026-07-02T04:00:00.000Z",
    pinnedAt: null
  };
}
