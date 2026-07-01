import { describe, expect, it } from "vitest";
import { createDefaultPermissionSettings, updateSourcePermission } from "./permissions";
import { createSettingsStore } from "./settings";
import { createTauriIngestionApi } from "./tauriIngestionApi";
import type { MemoryEvent } from "./types";

describe("createTauriIngestionApi", () => {
  it("rejects invalid tokens before invoking native commands", async () => {
    const settingsStore = createSettingsStore({ storage: null });
    settingsStore.update({
      ingestionToken: "secret-token",
      permissions: updateSourcePermission(createDefaultPermissionSettings(), "browser_extension", { enabled: true })
    });
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const api = createTauriIngestionApi({
      settingsStore,
      callTauri: async (command, args) => {
        calls.push({ command, args });
        return sampleEvent();
      }
    });

    await expect(
      api.ingestExternalEvent({
        token: "wrong-token",
        event: {
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        }
      })
    ).rejects.toThrow("Invalid ingestion token");

    expect(calls).toHaveLength(0);
  });

  it("invokes native ingestion and updates source lastWriteAt when enabled", async () => {
    const settingsStore = createSettingsStore({ storage: null });
    settingsStore.update({
      ingestionToken: "secret-token",
      permissions: updateSourcePermission(createDefaultPermissionSettings(), "browser_extension", { enabled: true })
    });
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const api = createTauriIngestionApi({
      settingsStore,
      now: () => new Date("2026-07-01T04:00:00.000Z"),
      callTauri: async (command, args) => {
        calls.push({ command, args });
        return sampleEvent();
      }
    });

    const event = await api.ingestExternalEvent({
      token: "secret-token",
      event: {
        type: "browser_tab",
        title: "Docs",
        url: "https://example.com",
        source: "browser_extension"
      }
    });

    expect(event.id).toBe("native-event");
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("ingest_external_event");
    expect(calls[0].args).toMatchObject({
      input: {
        type: "browser_tab",
        title: "Docs",
        url: "https://example.com",
        source: "browser_extension"
      }
    });
    expect(settingsStore.get().permissions.sources.browser_extension.lastWriteAt).toBe("2026-07-01T04:00:00.000Z");
  });

  it("does not invoke native ingestion for disabled sources", async () => {
    const settingsStore = createSettingsStore({ storage: null });
    settingsStore.update({
      ingestionToken: "secret-token",
      permissions: createDefaultPermissionSettings()
    });
    const calls: string[] = [];
    const api = createTauriIngestionApi({
      settingsStore,
      callTauri: async (command) => {
        calls.push(command);
        return sampleEvent();
      }
    });

    await expect(
      api.ingestExternalEvent({
        token: "secret-token",
        event: {
          type: "browser_tab",
          title: "Docs",
          url: "https://example.com",
          source: "browser_extension"
        }
      })
    ).rejects.toThrow("Source browser_extension is disabled");

    expect(calls).toHaveLength(0);
  });
});

function sampleEvent(): MemoryEvent {
  return {
    id: "native-event",
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
