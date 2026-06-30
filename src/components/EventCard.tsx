import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  IconClipboardText,
  IconCopy,
  IconDeviceDesktopCode,
  IconEdit,
  IconExternalLink,
  IconFile,
  IconLink,
  IconPhoto,
  IconPin,
  IconPinFilled,
  IconTerminal2,
  IconTrash,
  IconWriting
} from "@tabler/icons-react";
import { formatAgo, formatClock } from "../lib/time";
import type { MemoryEvent } from "../lib/types";

interface EventCardProps {
  event: MemoryEvent;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onUpdate: (id: string, input: { title?: string; note?: string | null }) => void;
}

export function EventCard({ event, onDelete, onPin, onUpdate }: EventCardProps) {
  const Icon = iconForType(event.type);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [note, setNote] = useState(event.note ?? "");
  const preview = event.sensitiveFlag
    ? "Sensitive-looking content was detected and skipped."
    : event.content || event.note || event.path || event.url || "No preview";

  const saveEdit = () => {
    onUpdate(event.id, { title, note: note.trim() || null });
    setIsEditing(false);
  };

  return (
    <article className="group grid gap-3 p-4 transition hover:bg-zinc-800/35 sm:grid-cols-[76px_1fr_auto]">
      <div className="text-sm tabular-nums text-zinc-500">
        <div className="text-zinc-300">{formatClock(event.createdAt)}</div>
        <div className="mt-1">{formatAgo(event.createdAt)}</div>
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-emerald-300">
            <Icon size={17} stroke={1.8} />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">{labelForType(event.type)}</span>
          {event.sensitiveFlag ? (
            <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">Skipped</span>
          ) : null}
          {event.pinnedAt ? (
            <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">Pinned</span>
          ) : null}
        </div>
        {isEditing ? (
          <div className="grid gap-2">
            <input className="field-input" value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} />
            <input className="field-input" value={note} onChange={(inputEvent) => setNote(inputEvent.target.value)} placeholder="Note" />
            <div className="flex gap-2">
              <button className="primary-button" type="button" onClick={saveEdit}>
                Save
              </button>
              <button className="secondary-button" type="button" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="block w-full text-left" type="button" onClick={() => setExpanded((value) => !value)}>
            <h3 className="truncate text-sm font-semibold text-zinc-100">{event.title}</h3>
            <p className={expanded ? "mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-400" : "mt-1 line-clamp-2 text-sm leading-6 text-zinc-400"}>
              {preview}
            </p>
          </button>
        )}
        {expanded && !isEditing ? (
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
            {event.type === "screenshot" && event.path && "__TAURI_INTERNALS__" in window ? (
              <img className="mb-3 max-h-64 rounded-lg border border-zinc-800 object-contain" src={convertFileSrc(event.path)} alt={event.title} />
            ) : null}
            {event.path ? <div className="break-all">Path: {event.path}</div> : null}
            {event.url ? <div className="break-all">URL: {event.url}</div> : null}
            {event.note ? <div className="mt-2 whitespace-pre-wrap">Note: {event.note}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-2">
        {event.url ? (
          <button className="icon-button" type="button" onClick={() => openUrl(event.url!)} title="Open link">
            <IconExternalLink size={17} stroke={1.8} />
          </button>
        ) : null}
        {event.path ? (
          <button className="icon-button" type="button" onClick={() => openPath(event.path!)} title="Open file or screenshot">
            <IconExternalLink size={17} stroke={1.8} />
          </button>
        ) : null}
        {event.content && !event.sensitiveFlag ? (
          <button className="icon-button" type="button" onClick={() => navigator.clipboard.writeText(event.content ?? "")} title="Copy content">
            <IconCopy size={17} stroke={1.8} />
          </button>
        ) : null}
        <button className="icon-button" type="button" onClick={() => onPin(event.id, !event.pinnedAt)} title={event.pinnedAt ? "Unpin event" : "Pin event"}>
          {event.pinnedAt ? <IconPinFilled size={17} stroke={1.8} /> : <IconPin size={17} stroke={1.8} />}
        </button>
        <button className="icon-button" type="button" onClick={() => setIsEditing(true)} title="Edit title and note">
          <IconEdit size={17} stroke={1.8} />
        </button>
        <button className="icon-button" type="button" onClick={() => onDelete(event.id)} title="Delete event">
          <IconTrash size={17} stroke={1.8} />
        </button>
      </div>
    </article>
  );
}

function iconForType(type: MemoryEvent["type"]) {
  return {
    clipboard: IconClipboardText,
    screenshot: IconPhoto,
    file: IconFile,
    link: IconLink,
    note: IconWriting,
    browser_tab: IconLink,
    editor_file: IconDeviceDesktopCode,
    editor_selection: IconDeviceDesktopCode,
    command: IconWriting
  }[type];
}

function labelForType(type: MemoryEvent["type"]): string {
  return {
    clipboard: "Clipboard",
    screenshot: "Screenshot",
    file: "File",
    link: "Link",
    note: "Note",
    browser_tab: "Browser tab",
    editor_file: "Editor file",
    editor_selection: "Editor selection",
    command: "Command"
  }[type];
}

async function openUrl(url: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const opener = await import("@tauri-apps/plugin-opener");
    await opener.openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

async function openPath(path: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const opener = await import("@tauri-apps/plugin-opener");
    await opener.openPath(path);
  }
}
