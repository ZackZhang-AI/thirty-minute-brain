import { describe, expect, it } from "vitest";
import { createSettingsStore } from "./settings";

describe("createSettingsStore", () => {
  it("returns privacy-first defaults", () => {
    const store = createSettingsStore();

    expect(store.get().clipboardEnabled).toBe(true);
    expect(store.get().retentionHours).toBe(24);
    expect(store.get().privacyNoticeAccepted).toBe(false);
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
});

