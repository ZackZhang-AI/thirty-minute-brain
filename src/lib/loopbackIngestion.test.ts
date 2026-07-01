import { describe, expect, it } from "vitest";
import { handleLoopbackIngestionRequest } from "./loopbackIngestion";
import type { ExternalIngestRequest } from "./ingestionGateway";
import type { MemoryEvent } from "./types";

describe("handleLoopbackIngestionRequest", () => {
  it("routes POST /ingest JSON payloads through the external ingestion API", async () => {
    const requests: ExternalIngestRequest[] = [];

    const response = await handleLoopbackIngestionRequest(
      {
        method: "POST",
        path: "/ingest",
        headers: {
          "content-type": "application/json",
          "x-thirty-minute-brain-token": "secret-token"
        },
        body: JSON.stringify({
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        })
      },
      {
        ingestExternalEvent: async (request) => {
          requests.push(request);
          return sampleEvent();
        }
      }
    );

    expect(response.status).toBe(201);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(response.body).event.id).toBe("loopback-event");
    expect(requests).toEqual([
      {
        token: "secret-token",
        event: {
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        }
      }
    ]);
  });

  it("accepts bearer tokens when extensions cannot set custom headers", async () => {
    const requests: ExternalIngestRequest[] = [];

    const response = await handleLoopbackIngestionRequest(
      {
        method: "POST",
        path: "/ingest",
        headers: {
          authorization: "Bearer bearer-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          type: "command",
          title: "git status",
          content: "git status",
          source: "shell_hook"
        })
      },
      {
        ingestExternalEvent: async (request) => {
          requests.push(request);
          return sampleEvent({ type: "command", source: "shell_hook" });
        }
      }
    );

    expect(response.status).toBe(201);
    expect(requests[0].token).toBe("bearer-token");
  });

  it("responds to CORS preflight without invoking ingestion", async () => {
    const response = await handleLoopbackIngestionRequest(
      {
        method: "OPTIONS",
        path: "/ingest",
        headers: {},
        body: ""
      },
      {
        ingestExternalEvent: async () => {
          throw new Error("should not ingest preflight");
        }
      }
    );

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1");
  });

  it("rejects missing tokens, invalid JSON, and unsupported routes", async () => {
    const target = {
      ingestExternalEvent: async () => sampleEvent()
    };

    await expect(
      handleLoopbackIngestionRequest(
        {
          method: "POST",
          path: "/ingest",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "browser_tab", title: "Docs", url: "https://example.com", source: "browser_extension" })
        },
        target
      )
    ).resolves.toMatchObject({ status: 401 });

    await expect(
      handleLoopbackIngestionRequest(
        {
          method: "POST",
          path: "/ingest",
          headers: { "x-thirty-minute-brain-token": "secret-token" },
          body: "{not-json"
        },
        target
      )
    ).resolves.toMatchObject({ status: 400 });

    await expect(
      handleLoopbackIngestionRequest(
        {
          method: "GET",
          path: "/events",
          headers: {},
          body: ""
        },
        target
      )
    ).resolves.toMatchObject({ status: 404 });
  });

  it("maps ingestion rejections to client-safe error responses", async () => {
    const response = await handleLoopbackIngestionRequest(
      {
        method: "POST",
        path: "/ingest",
        headers: { "x-thirty-minute-brain-token": "secret-token" },
        body: JSON.stringify({
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        })
      },
      {
        ingestExternalEvent: async () => {
          throw new Error("Source browser_extension is disabled");
        }
      }
    );

    expect(response.status).toBe(403);
    expect(JSON.parse(response.body).error).toBe("Source browser_extension is disabled");
  });
});

function sampleEvent(overrides: Partial<MemoryEvent> = {}): MemoryEvent {
  return {
    id: "loopback-event",
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
    createdAt: "2026-07-01T05:00:00.000Z",
    expiresAt: "2026-07-02T05:00:00.000Z",
    pinnedAt: null,
    ...overrides
  };
}
