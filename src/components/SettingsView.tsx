import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { IconDatabase, IconFolderPlus, IconTrash, IconX } from "@tabler/icons-react";
import { eventApi, folderApi } from "../lib/api";
import type { PrivacyStatus, WatchedFolder } from "../lib/types";

interface SettingsViewProps {
  clipboardEnabled: boolean;
  onClipboardEnabledChange: (enabled: boolean) => void;
  onClearAll: () => Promise<void>;
  onClose: () => void;
}

export function SettingsView({ clipboardEnabled, onClipboardEnabledChange, onClearAll, onClose }: SettingsViewProps) {
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus | null>(null);
  const [manualPath, setManualPath] = useState("");

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

        <div className="space-y-3">
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

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
            type="button"
            onClick={onClearAll}
          >
            <IconTrash size={18} stroke={1.8} />
            Clear all events
          </button>
        </div>
      </div>
    </div>
  );
}
