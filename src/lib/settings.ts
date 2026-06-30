export interface AppSettings {
  clipboardEnabled: boolean;
  retentionHours: number;
  privacyNoticeAccepted: boolean;
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
  privacyNoticeAccepted: false
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
  return {
    clipboardEnabled: Boolean(value.clipboardEnabled),
    retentionHours: Number.isFinite(value.retentionHours) && value.retentionHours > 0 ? value.retentionHours : 24,
    privacyNoticeAccepted: Boolean(value.privacyNoticeAccepted)
  };
}

function getBrowserStorage(): SettingsStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
