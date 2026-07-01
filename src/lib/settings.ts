import { createDefaultPermissionSettings } from "./permissions";
import type { PermissionSettings } from "./permissions";

export interface AppSettings {
  clipboardEnabled: boolean;
  retentionHours: number;
  privacyNoticeAccepted: boolean;
  ingestionToken: string;
  permissions: PermissionSettings;
  cloudSyncEnabled: boolean;
  language: "zh-CN" | "en-US";
}

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

export interface SettingsStore {
  get(): AppSettings;
  update(next: Partial<AppSettings>): AppSettings;
}

interface SettingsStoreOptions {
  storage?: SettingsStorage | null;
  key?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  clipboardEnabled: true,
  retentionHours: 24,
  privacyNoticeAccepted: false,
  ingestionToken: "",
  permissions: createDefaultPermissionSettings(),
  cloudSyncEnabled: false,
  language: "zh-CN"
};

const DEFAULT_KEY = "thirty-minute-brain.settings";

export function createSettingsStore(options: SettingsStoreOptions = {}): SettingsStore {
  const key = options.key ?? DEFAULT_KEY;
  const storage = options.storage ?? getBrowserStorage();
  let settings = readSettings(storage, key);

  return {
    get() {
      return { ...settings };
    },
    update(next) {
      settings = sanitizeSettings({ ...settings, ...next });
      storage?.setItem(key, JSON.stringify(settings));
      return { ...settings };
    }
  };
}

function readSettings(storage: SettingsStorage | null, key: string): AppSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };

  try {
    const raw = storage.getItem(key);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function sanitizeSettings(value: AppSettings): AppSettings {
  const defaults = createDefaultPermissionSettings();
  return {
    clipboardEnabled: Boolean(value.clipboardEnabled),
    retentionHours: Number.isFinite(value.retentionHours) && value.retentionHours > 0 ? value.retentionHours : 24,
    privacyNoticeAccepted: Boolean(value.privacyNoticeAccepted),
    ingestionToken: typeof value.ingestionToken === "string" ? value.ingestionToken : "",
    permissions: {
      globalPaused: Boolean(value.permissions?.globalPaused),
      sources: {
        ...defaults.sources,
        ...(value.permissions?.sources ?? {})
      }
    },
    cloudSyncEnabled: Boolean(value.cloudSyncEnabled),
    language: value.language === "en-US" ? "en-US" : "zh-CN"
  };
}

function getBrowserStorage(): SettingsStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
