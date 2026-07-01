import { describe, expect, it } from "vitest";
import { createExternalIngestionApi } from "./externalIngestionApi";
import { createLocalEventStore } from "./localStore";
import { createDefaultPermissionSettings, updateSourcePermission } from "./permissions";
import { createSettingsStore } from "./settings";

describe("createExternalIngestionApi", () => {
  it("ingests through settings-backed token and records source lastWriteAt", async () => {
    const settingsStore = createSettingsStore({ storage: null });
    settingsStore.update({
      ingestionToken: "secret-token",
      permissions: updateSourcePermission(createDefaultPermissionSettings(), "browser_extension", { enabled: true })
    });
    const api = createExternalIngestionApi({
      store: createLocalEventStore(),
      settingsStore,
      now: () => new Date("2026-07-01T03:00:00.000Z")
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

    expect(event.type).toBe("browser_tab");
    expect(settingsStore.get().permissions.sources.browser_extension.lastWriteAt).toBe("2026-07-01T03:00:00.000Z");
  });

  it("does not update lastWriteAt when ingestion is rejected", async () => {
    const settingsStore = createSettingsStore({ storage: null });
    settingsStore.update({
      ingestionToken: "secret-token",
      permissions: createDefaultPermissionSettings()
    });
    const api = createExternalIngestionApi({
      store: createLocalEventStore(),
      settingsStore,
      now: () => new Date("2026-07-01T03:00:00.000Z")
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

    expect(settingsStore.get().permissions.sources.browser_extension.lastWriteAt).toBeNull();
  });
});
