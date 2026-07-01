import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { IconDatabase, IconFolderPlus, IconKey, IconPlayerPause, IconTrash, IconX } from "@tabler/icons-react";
import { eventApi, folderApi } from "../lib/api";
import { getSourceCatalog } from "../lib/permissions";
import type { SourceId } from "../lib/permissions";
import type { AppSettings } from "../lib/settings";
import type { PrivacyStatus, WatchedFolder } from "../lib/types";

interface SettingsViewProps {
  settings: AppSettings;
  clipboardEnabled: boolean;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onClipboardEnabledChange: (enabled: boolean) => void;
  onClearWindow: (windowMinutes: number) => Promise<void>;
  onClearAll: () => Promise<void>;
  onClose: () => void;
}

export function SettingsView({
  settings,
  clipboardEnabled,
  onSettingsChange,
  onClipboardEnabledChange,
  onClearWindow,
  onClearAll,
  onClose
}: SettingsViewProps) {
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus | null>(null);
  const [manualPath, setManualPath] = useState("");
  const sourceCatalog = getSourceCatalog();

  const refreshFolders = async () => {
    setFolders(await folderApi.listWatchedFolders());
  };

  useEffect(() => {
    refreshFolders().catch(() => setFolders([]));
    eventApi.getPrivacyStatus().then(setPrivacyStatus).catch(() => setPrivacyStatus(null));
  }, []);

  const addFolder = async () => {
    let selectedPath = manualPath.trim();

    if (!selectedPath && "__TAURI_INTERNALS__" in window) {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") selectedPath = selected;
    }

    if (!selectedPath) return;
    await folderApi.addWatchedFolder(selectedPath);
    setManualPath("");
    await refreshFolders();
  };

  const removeFolder = async (id: string) => {
    await folderApi.removeWatchedFolder(id);
    await refreshFolders();
  };

  const updateSource = (source: SourceId, enabled: boolean) => {
    onSettingsChange({
      permissions: {
        ...settings.permissions,
        sources: {
          ...settings.permissions.sources,
          [source]: {
            ...settings.permissions.sources[source],
            enabled
          }
        }
      }
    });
  };

  const setGlobalPaused = (globalPaused: boolean) => {
    onSettingsChange({
      permissions: {
        ...settings.permissions,
        globalPaused
      }
    });
  };

  const generateToken = () => {
    onSettingsChange({ ingestionToken: crypto.randomUUID() });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal-panel max-w-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-zinc-400">Transparent controls for local capture.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <IconX size={18} stroke={1.8} />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-3 overflow-auto pr-1">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <span>
              <span className="block text-sm font-medium text-zinc-100">Clipboard listener</span>
              <span className="mt-1 block text-sm text-zinc-500">Polls text changes locally and skips detected secrets.</span>
            </span>
            <input
              className="h-5 w-5 accent-emerald-400"
              type="checkbox"
              checked={clipboardEnabled}
              onChange={(event) => onClipboardEnabledChange(event.target.checked)}
            />
          </label>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-100">Permission center</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Each source declares what it collects and what it does not collect.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <IconPlayerPause size={18} stroke={1.8} />
                <input
                  className="h-4 w-4 accent-emerald-400"
                  type="checkbox"
                  checked={settings.permissions.globalPaused}
                  onChange={(event) => setGlobalPaused(event.target.checked)}
                />
                Pause all
              </label>
            </div>
            <div className="space-y-2">
              {(Object.keys(sourceCatalog) as SourceId[]).map((source) => {
                const entry = sourceCatalog[source];
                const permission = settings.permissions.sources[source];
                return (
                  <div key={source} className="rounded-lg border border-zinc-800 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{entry.label}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">Collects: {entry.collects.join("; ")}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">Does not collect: {entry.doesNotCollect.join("; ")}</p>
                        {permission.lastWriteAt ? <p className="mt-1 text-xs text-zinc-500">Last write: {permission.lastWriteAt}</p> : null}
                      </div>
                      <input
                        className="mt-1 h-5 w-5 accent-emerald-400"
                        type="checkbox"
                        checked={permission.enabled}
                        disabled={source === "manual"}
                        onChange={(event) => updateSource(source, event.target.checked)}
                        aria-label={`Toggle ${entry.label}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start gap-3">
              <IconKey className="mt-0.5 text-emerald-300" size={20} stroke={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">Local ingestion token</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">Used by browser, editor, and shell integrations. Keep it local.</p>
                <div className="mt-3 flex gap-2">
                  <input className="field-input font-mono text-xs" readOnly value={settings.ingestionToken || "Not generated"} />
                  <button className="secondary-button" type="button" onClick={generateToken}>
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start gap-3">
              <IconDatabase className="mt-0.5 text-emerald-300" size={20} stroke={1.8} />
              <div>
                <p className="text-sm font-medium text-zinc-100">Storage</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {privacyStatus?.databasePath ??
                    "Tauri builds use a local SQLite database in the app data directory. Browser preview uses in-memory storage."}
                </p>
                {privacyStatus ? (
                  <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                    <div>Local only: {privacyStatus.localOnly ? "Yes" : "No"}</div>
                    <div>Retention: {privacyStatus.retentionHours} hours</div>
                    <div>Events: {privacyStatus.eventCount}</div>
                    <div>Disabled sources: {privacyStatus.disallowedSources.join(", ")}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">Screenshot folders</p>
                <p className="mt-1 text-sm text-zinc-500">New images in these folders become screenshot events.</p>
              </div>
              <button className="icon-button" type="button" onClick={addFolder} title="Add screenshot folder">
                <IconFolderPlus size={18} stroke={1.8} />
              </button>
            </div>
            <input
              className="field-input"
              value={manualPath}
              onChange={(event) => setManualPath(event.target.value)}
              placeholder="Paste a folder path, or click the folder button in Tauri"
            />
            <div className="mt-3 space-y-2">
              {folders.length === 0 ? (
                <p className="text-sm text-zinc-500">No screenshot folder selected.</p>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2">
                    <span className="truncate text-sm text-zinc-300">{folder.path}</span>
                    <button className="icon-button min-h-8 min-w-8" type="button" onClick={() => removeFolder(folder.id)} title="Remove folder">
                      <IconX size={16} stroke={1.8} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm font-medium text-zinc-100">Data cleanup</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">Pinned events are kept when clearing a time window.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button className="secondary-button" type="button" onClick={() => onClearWindow(30)}>
                <IconTrash size={18} stroke={1.8} />
                Clear 30 min
              </button>
              <button className="secondary-button" type="button" onClick={() => onClearWindow(1440)}>
                <IconTrash size={18} stroke={1.8} />
                Clear 24 h
              </button>
              <button
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                type="button"
                onClick={onClearAll}
              >
                <IconTrash size={18} stroke={1.8} />
                Clear all
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm font-medium text-zinc-100">v1.0 product settings</p>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center justify-between gap-4 text-sm text-zinc-300">
                <span>Encrypted cloud sync</span>
                <input
                  className="h-5 w-5 accent-emerald-400"
                  type="checkbox"
                  checked={settings.cloudSyncEnabled}
                  onChange={(event) => onSettingsChange({ cloudSyncEnabled: event.target.checked })}
                />
              </label>
              <label className="grid gap-1 text-sm text-zinc-300">
                Language
                <select
                  className="field-input"
                  value={settings.language}
                  onChange={(event) => onSettingsChange({ language: event.target.value as AppSettings["language"] })}
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
