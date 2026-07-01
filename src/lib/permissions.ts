import type { EventType } from "./types";

export type SourceId =
  | "manual"
  | "clipboard"
  | "watched_folder"
  | "browser_extension"
  | "vscode_extension"
  | "shell_hook";

export interface SourceCatalogEntry {
  id: SourceId;
  label: string;
  collects: string[];
  doesNotCollect: string[];
  allowedTypes: EventType[];
}

export interface SourcePermission {
  enabled: boolean;
  lastWriteAt: string | null;
}

export interface PermissionSettings {
  globalPaused: boolean;
  sources: Record<SourceId, SourcePermission>;
}

const SOURCE_CATALOG: Record<SourceId, SourceCatalogEntry> = {
  manual: {
    id: "manual",
    label: "Manual add",
    collects: ["Text, links, and file paths the user explicitly adds"],
    doesNotCollect: ["Automatic app, browser, editor, or terminal activity"],
    allowedTypes: ["file", "link", "note"]
  },
  clipboard: {
    id: "clipboard",
    label: "Clipboard",
    collects: ["Clipboard text changes"],
    doesNotCollect: ["Clipboard images", "Rich text formatting", "Files copied through the OS"],
    allowedTypes: ["clipboard"]
  },
  watched_folder: {
    id: "watched_folder",
    label: "Screenshot folders",
    collects: ["New image file paths in user-selected folders"],
    doesNotCollect: ["Unselected folders", "Image file contents copied into the database"],
    allowedTypes: ["screenshot"]
  },
  browser_extension: {
    id: "browser_extension",
    label: "Browser extension",
    collects: ["Current active tab title and URL"],
    doesNotCollect: ["Full browser history", "Page contents", "Cookies"],
    allowedTypes: ["browser_tab"]
  },
  vscode_extension: {
    id: "vscode_extension",
    label: "VS Code extension",
    collects: ["Current file path", "User-selected text"],
    doesNotCollect: ["Whole workspace scan", "Unopened files"],
    allowedTypes: ["editor_file", "editor_selection"]
  },
  shell_hook: {
    id: "shell_hook",
    label: "Shell hook",
    collects: ["Command text entered after hook installation"],
    doesNotCollect: ["Command output", "Terminal history files", "Environment variables"],
    allowedTypes: ["command"]
  }
};

export function getSourceCatalog(): Record<SourceId, SourceCatalogEntry> {
  return SOURCE_CATALOG;
}

export function createDefaultPermissionSettings(): PermissionSettings {
  return {
    globalPaused: false,
    sources: {
      manual: { enabled: true, lastWriteAt: null },
      clipboard: { enabled: true, lastWriteAt: null },
      watched_folder: { enabled: true, lastWriteAt: null },
      browser_extension: { enabled: false, lastWriteAt: null },
      vscode_extension: { enabled: false, lastWriteAt: null },
      shell_hook: { enabled: false, lastWriteAt: null }
    }
  };
}

export function updateSourcePermission(
  settings: PermissionSettings,
  source: SourceId,
  patch: Partial<SourcePermission>
): PermissionSettings {
  return {
    ...settings,
    sources: {
      ...settings.sources,
      [source]: {
        ...settings.sources[source],
        ...patch
      }
    }
  };
}

export function canSourceIngest(settings: PermissionSettings, source: SourceId, type: EventType): boolean {
  if (settings.globalPaused && source !== "manual") return false;
  const sourceSettings = settings.sources[source];
  if (!sourceSettings?.enabled) return false;
  return SOURCE_CATALOG[source].allowedTypes.includes(type);
}
