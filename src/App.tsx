import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  IconBrain,
  IconClipboard,
  IconClock,
  IconChecklist,
  IconFilePlus,
  IconFolder,
  IconNotes,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconTrash
} from "@tabler/icons-react";
import { AddContextModal } from "./components/AddContextModal";
import { ContextPackModal } from "./components/ContextPackModal";
import { EmptyState } from "./components/EmptyState";
import { EventCard } from "./components/EventCard";
import { PrivacyNoticeModal } from "./components/PrivacyNoticeModal";
import { SearchBar } from "./components/SearchBar";
import { SettingsView } from "./components/SettingsView";
import { summarizeRecentActivity } from "./lib/activitySummary";
import { eventApi } from "./lib/api";
import {
  clearSelection,
  getSelectionSummary,
  pruneSelection,
  selectAllVisible,
  toggleSelection
} from "./lib/selection";
import { createSettingsStore } from "./lib/settings";
import type { AppSettings } from "./lib/settings";
import type { ContextPackTemplate, EventType, MemoryEvent, NewManualEventInput } from "./lib/types";

const WINDOW_OPTIONS = [30, 1440] as const;
const TYPE_FILTERS: Array<{ value: "all" | EventType; label: string }> = [
  { value: "all", label: "All" },
  { value: "clipboard", label: "Clipboard" },
  { value: "file", label: "Files" },
  { value: "screenshot", label: "Shots" },
  { value: "link", label: "Links" },
  { value: "note", label: "Notes" },
  { value: "command", label: "Commands" }
];
const TEMPLATE_OPTIONS: Array<{ value: ContextPackTemplate; label: string }> = [
  { value: "ai", label: "AI" },
  { value: "bug_report", label: "Bug report" },
  { value: "teammate", label: "Teammate" },
  { value: "meeting", label: "Meeting" }
];

export default function App() {
  const settingsStore = useMemo(() => createSettingsStore(), []);
  const [settings, setSettings] = useState<AppSettings>(() => settingsStore.get());
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [query, setQuery] = useState("");
  const [windowMinutes, setWindowMinutes] = useState<(typeof WINDOW_OPTIONS)[number]>(30);
  const [typeFilter, setTypeFilter] = useState<"all" | EventType>("all");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [contextTemplate, setContextTemplate] = useState<ContextPackTemplate>("ai");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextPack, setContextPack] = useState<string | null>(null);
  const [contextPackMeta, setContextPackMeta] = useState({
    title: "Context pack",
    description: "Markdown ready for AI, teammates, or your own notes.",
    defaultFilename: "thirty-minute-brain-context.md"
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clipboardEnabled = settings.clipboardEnabled;
  const [lastClipboardText, setLastClipboardText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateSettings = useCallback(
    (next: Partial<AppSettings>) => {
      setSettings(settingsStore.update(next));
    },
    [settingsStore]
  );

  const setClipboardEnabled = useCallback(
    (enabled: boolean | ((value: boolean) => boolean)) => {
      const nextValue = typeof enabled === "function" ? enabled(settingsStore.get().clipboardEnabled) : enabled;
      updateSettings({ clipboardEnabled: nextValue });
    },
    [settingsStore, updateSettings]
  );

  const refreshEvents = useCallback(async () => {
    const options = {
      windowMinutes,
      types: typeFilter === "all" ? undefined : [typeFilter],
      sensitiveOnly
    };
    const nextEvents = query.trim() ? await eventApi.searchEvents(query, options) : await eventApi.listRecentEvents(options);
    setEvents(nextEvents);
  }, [query, sensitiveOnly, typeFilter, windowMinutes]);

  useEffect(() => {
    refreshEvents().catch((caught) => setError(String(caught)));
  }, [refreshEvents]);

  const visibleEventIds = useMemo(() => events.map((event) => event.id), [events]);

  useEffect(() => {
    setSelectedIds((current) => pruneSelection(current, visibleEventIds));
  }, [visibleEventIds]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const unlistenPromises = [
      listen("focus-search", () => {
        document.querySelector<HTMLInputElement>('input[placeholder="Search your last 30 minutes..."]')?.focus();
      }),
      listen("toggle-clipboard-capture", () => {
        setClipboardEnabled((value) => !value);
      }),
      listen("events-changed", () => {
        refreshEvents().catch((caught) => setError(String(caught)));
      })
    ];

    return () => {
      for (const promise of unlistenPromises) {
        promise.then((unlisten) => unlisten()).catch(() => undefined);
      }
    };
  }, [refreshEvents]);

  useEffect(() => {
    if (!clipboardEnabled) return;

    const timer = window.setInterval(async () => {
      try {
        const text = await readClipboardText();
        if (!text || text === lastClipboardText) return;
        setLastClipboardText(text);
        await eventApi.createClipboardEvent(text);
        await refreshEvents();
      } catch {
        // Clipboard access is best effort in browser preview and fully available in Tauri.
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [clipboardEnabled, lastClipboardText, refreshEvents]);

  const handleCreateManualEvent = async (input: NewManualEventInput) => {
    await eventApi.createManualEvent(input);
    setIsAddOpen(false);
    await refreshEvents();
  };

  const handleDelete = async (id: string) => {
    await eventApi.deleteEvent(id);
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
    await refreshEvents();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    await eventApi.deleteEvents(selectedIds);
    setSelectedIds(clearSelection());
    await refreshEvents();
  };

  const handlePin = async (id: string, pinned: boolean) => {
    await eventApi.togglePinEvent(id, pinned);
    await refreshEvents();
  };

  const handleUpdate = async (id: string, input: { title?: string; note?: string | null }) => {
    await eventApi.updateEvent(id, input);
    await refreshEvents();
  };

  const handleContextPack = async () => {
    setContextPackMeta({
      title: "Context pack",
      description: "Markdown ready for AI, teammates, or your own notes.",
      defaultFilename: "thirty-minute-brain-context.md"
    });
    setContextPack(
      await eventApi.generateContextPack({
        windowMinutes,
        template: contextTemplate,
        selectedIds: selectedIds.length ? selectedIds : undefined,
        types: typeFilter === "all" ? undefined : [typeFilter],
        sensitiveOnly
      })
    );
  };

  const handleActivitySummary = () => {
    const summary = summarizeRecentActivity(events);
    setContextPackMeta({
      title: "我刚才在干嘛",
      description: "A local, rule-based summary of the visible recent timeline.",
      defaultFilename: "thirty-minute-brain-activity-summary.md"
    });
    setContextPack(summary.markdown);
  };

  const stats = useMemo(
    () => ({
      clipboard: events.filter((event) => event.type === "clipboard").length,
      files: events.filter((event) => event.type === "file" || event.type === "screenshot").length,
      notes: events.filter((event) => event.type === "note" || event.type === "link").length
    }),
    [events]
  );

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <IconBrain size={24} stroke={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">Thirty-Minute Brain</h1>
              <p className="text-sm text-zinc-400">Local recently seen search for your last working context.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="toolbar-button"
              type="button"
              onClick={() => setClipboardEnabled((value) => !value)}
              title="Toggle clipboard capture"
            >
              <IconClipboard size={18} stroke={1.8} />
              {clipboardEnabled ? "Clipboard on" : "Clipboard off"}
            </button>
            <button className="toolbar-button" type="button" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <IconSettings size={18} stroke={1.8} />
              Settings
            </button>
          </div>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[1fr_280px]">
          <div className="flex min-w-0 flex-col gap-4">
            <SearchBar value={query} onChange={setQuery} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                {WINDOW_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    className={minutes === windowMinutes ? "segment segment-active" : "segment"}
                    type="button"
                    onClick={() => setWindowMinutes(minutes)}
                  >
                    {minutes === 30 ? "30 min" : "24 h"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="field-input min-h-10 w-auto"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as "all" | EventType)}
                  title="Filter event type"
                >
                  {TYPE_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="toolbar-button">
                  <input
                    className="h-4 w-4 accent-emerald-400"
                    type="checkbox"
                    checked={sensitiveOnly}
                    onChange={(event) => setSensitiveOnly(event.target.checked)}
                  />
                  Skipped only
                </label>
                <select
                  className="field-input min-h-10 w-auto"
                  value={contextTemplate}
                  onChange={(event) => setContextTemplate(event.target.value as ContextPackTemplate)}
                  title="Context pack template"
                >
                  {TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="primary-button" type="button" onClick={() => setIsAddOpen(true)}>
                  <IconFilePlus size={18} stroke={1.8} />
                  Add context
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSelectedIds((current) => selectAllVisible(current, visibleEventIds))}
                  disabled={visibleEventIds.length === 0}
                >
                  <IconChecklist size={18} stroke={1.8} />
                  Select visible
                </button>
                <button className="secondary-button" type="button" onClick={handleContextPack}>
                  <IconSparkles size={18} stroke={1.8} />
                  {selectedIds.length ? "Pack selected" : "Context pack"}
                </button>
                <button className="secondary-button" type="button" onClick={handleActivitySummary}>
                  <IconBrain size={18} stroke={1.8} />
                  我刚才在干嘛
                </button>
                <button className="icon-button" type="button" onClick={refreshEvents} title="Refresh">
                  <IconRefresh size={18} stroke={1.8} />
                </button>
              </div>
            </div>

            {error ? <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

            {selectedIds.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                <span className="text-sm font-medium text-emerald-100">{getSelectionSummary(selectedIds)}</span>
                <div className="flex flex-wrap gap-2">
                  <button className="secondary-button" type="button" onClick={() => setSelectedIds(clearSelection())}>
                    Clear selection
                  </button>
                  <button className="secondary-button" type="button" onClick={handleContextPack}>
                    <IconSparkles size={18} stroke={1.8} />
                    Context from selected
                  </button>
                  <button
                    className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                    type="button"
                    onClick={handleDeleteSelected}
                  >
                    <IconTrash size={18} stroke={1.8} />
                    Delete selected
                  </button>
                </div>
              </div>
            ) : null}

            <div className="min-h-[420px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
              {events.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-zinc-800">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      selected={selectedIds.includes(event.id)}
                      onSelectedChange={(id) => setSelectedIds((current) => toggleSelection(current, id))}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-3">
            <Metric icon={<IconClock size={18} stroke={1.8} />} label="Window" value={windowMinutes === 30 ? "30 min" : "24 h"} />
            <Metric icon={<IconClipboard size={18} stroke={1.8} />} label="Clipboard" value={String(stats.clipboard)} />
            <Metric icon={<IconFolder size={18} stroke={1.8} />} label="Files & shots" value={String(stats.files)} />
            <Metric icon={<IconNotes size={18} stroke={1.8} />} label="Notes & links" value={String(stats.notes)} />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
              <p className="font-medium text-zinc-200">Privacy line</p>
              <p className="mt-2 leading-6">
                MVP stores data locally, skips detected secrets, and expires events after 24 hours.
              </p>
            </div>
          </aside>
        </section>
      </div>

      {isAddOpen ? <AddContextModal onClose={() => setIsAddOpen(false)} onSubmit={handleCreateManualEvent} /> : null}
      {contextPack ? <ContextPackModal markdown={contextPack} onClose={() => setContextPack(null)} {...contextPackMeta} /> : null}
      {!settings.privacyNoticeAccepted ? (
        <PrivacyNoticeModal onAccept={() => updateSettings({ privacyNoticeAccepted: true })} />
      ) : null}
      {isSettingsOpen ? (
        <SettingsView
          clipboardEnabled={clipboardEnabled}
          onClipboardEnabledChange={setClipboardEnabled}
          onClose={() => setIsSettingsOpen(false)}
          onClearAll={async () => {
            await eventApi.clearAllEvents();
            await refreshEvents();
          }}
        />
      ) : null}
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="text-emerald-300">{icon}</span>
          {label}
        </div>
        <span className="text-lg font-semibold text-zinc-50">{value}</span>
      </div>
    </div>
  );
}

async function readClipboardText(): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const clipboard = await import("@tauri-apps/plugin-clipboard-manager");
    return clipboard.readText();
  }

  if (navigator.clipboard?.readText && document.hasFocus()) {
    return navigator.clipboard.readText();
  }

  return "";
}
