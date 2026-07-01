import { describe, expect, it } from "vitest";
import { createSettingsStore } from "./settings";

describe("createSettingsStore", () => {
  it("returns privacy-first defaults", () => {
    const store = createSettingsStore();

    expect(store.get().clipboardEnabled).toBe(true);
    expect(store.get().retentionHours).toBe(24);
    expect(store.get().privacyNoticeAccepted).toBe(false);
    expect(store.get().cloudSyncEnabled).toBe(false);
    expect(store.get().language).toBe("zh-CN");
    expect(store.get().ingestionToken).toBe("");
    expect(store.get().permissions.sources.browser_extension.enabled).toBe(false);
  });

  it("persists updates through the provided storage", () => {
    const memory = new Map<string, string>();
    const store = createSettingsStore({
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value)
      }
    });

    store.update({ clipboardEnabled: false, privacyNoticeAccepted: true });
    const restored = createSettingsStore({
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value)
      }
    });

    expect(restored.get().clipboardEnabled).toBe(false);
    expect(restored.get().privacyNoticeAccepted).toBe(true);
  });

  it("persists permission center and productization settings", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value)
    };
    const store = createSettingsStore({ storage });

    store.update({
      cloudSyncEnabled: true,
      language: "en-US",
      ingestionToken: "local-token",
      permissions: {
        ...store.get().permissions,
        sources: {
          ...store.get().permissions.sources,
          browser_extension: { enabled: true, lastWriteAt: "2026-07-01T01:00:00.000Z" }
        }
      }
    });

    const restored = createSettingsStore({ storage });

    expect(restored.get().cloudSyncEnabled).toBe(true);
    expect(restored.get().language).toBe("en-US");
    expect(restored.get().ingestionToken).toBe("local-token");
    expect(restored.get().permissions.sources.browser_extension.enabled).toBe(true);
    expect(restored.get().permissions.sources.browser_extension.lastWriteAt).toBe("2026-07-01T01:00:00.000Z");
  });
});

