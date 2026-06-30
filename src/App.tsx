import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  IconBrain,
  IconClipboard,
  IconClock,
  IconFilePlus,
  IconFolder,
  IconNotes,
  IconRefresh,
  IconSettings,
  IconSparkles
} from "@tabler/icons-react";
import { AddContextModal } from "./components/AddContextModal";
import { ContextPackModal } from "./components/ContextPackModal";
import { EmptyState } from "./components/EmptyState";
import { EventCard } from "./components/EventCard";
import { SearchBar } from "./components/SearchBar";
import { SettingsView } from "./components/SettingsView";
import { eventApi } from "./lib/api";
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
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [query, setQuery] = useState("");
  const [windowMinutes, setWindowMinutes] = useState<(typeof WINDOW_OPTIONS)[number]>(30);
  const [typeFilter, setTypeFilter] = useState<"all" | EventType>("all");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [contextTemplate, setContextTemplate] = useState<ContextPackTemplate>("ai");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextPack, setContextPack] = useState<string | null>(null);
  const [clipboardEnabled, setClipboardEnabled] = useState(true);
  const [lastClipboardText, setLastClipboardText] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    setContextPack(
      await eventApi.generateContextPack({
        windowMinutes,
        template: contextTemplate,
        types: typeFilter === "all" ? undefined : [typeFilter],
        sensitiveOnly
      })
    );
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
                <button className="secondary-button" type="button" onClick={handleContextPack}>
                  <IconSparkles size={18} stroke={1.8} />
                  Context pack
                </button>
                <button className="icon-button" type="button" onClick={refreshEvents} title="Refresh">
                  <IconRefresh size={18} stroke={1.8} />
                </button>
              </div>
            </div>

            {error ? <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

            <div className="min-h-[420px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
              {events.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-zinc-800">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} onDelete={handleDelete} onPin={handlePin} onUpdate={handleUpdate} />
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
      {contextPack ? <ContextPackModal markdown={contextPack} onClose={() => setContextPack(null)} /> : null}
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
