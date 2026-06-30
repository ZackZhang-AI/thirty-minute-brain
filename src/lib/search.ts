import type { EventQueryOptions, MemoryEvent } from "./types";

const SEARCH_FIELDS: Array<keyof Pick<MemoryEvent, "title" | "content" | "path" | "url" | "note">> = [
  "title",
  "content",
  "path",
  "url",
  "note"
];

export function filterEventsForQuery(events: MemoryEvent[], query: string): MemoryEvent[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return events;

  return events.filter((event) =>
    SEARCH_FIELDS.some((field) => (event[field] ?? "").toLowerCase().includes(normalized))
  );
}

export function getEventsWithinWindow(
  events: MemoryEvent[],
  now: Date,
  windowMinutes: number,
  options: Pick<EventQueryOptions, "includePinned"> = {}
): MemoryEvent[] {
  const cutoffMs = now.getTime() - windowMinutes * 60_000;
  return events.filter((event) => {
    if (options.includePinned && event.pinnedAt) return true;
    return new Date(event.createdAt).getTime() >= cutoffMs;
  });
}

export function applyEventFilters(events: MemoryEvent[], options: EventQueryOptions = {}): MemoryEvent[] {
  return events.filter((event) => {
    if (options.types?.length && !options.types.includes(event.type)) return false;
    if (options.sensitiveOnly && !event.sensitiveFlag) return false;
    return true;
  });
}
