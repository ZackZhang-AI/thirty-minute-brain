import { describe, expect, it } from "vitest";
import { filterEventsForQuery, getEventsWithinWindow } from "./search";
import type { MemoryEvent } from "./types";

const makeEvent = (overrides: Partial<MemoryEvent>): MemoryEvent => ({
  id: "event",
  type: "note",
  title: "Untitled",
  content: null,
  source: null,
  path: null,
  url: null,
  note: null,
  metadataJson: null,
  contentHash: null,
  sensitiveFlag: false,
  sensitiveReason: null,
  createdAt: "2026-06-30T10:00:00.000Z",
  expiresAt: "2026-07-01T10:00:00.000Z",
  pinnedAt: null,
  ...overrides
});

describe("event search helpers", () => {
  it("matches title, content, path, url, and notes case-insensitively", () => {
    const events = [
      makeEvent({ id: "title", title: "Checkout Bug" }),
      makeEvent({ id: "content", content: "TypeError on login" }),
      makeEvent({ id: "path", path: "C:\\project\\src\\App.tsx" }),
      makeEvent({ id: "url", url: "https://github.com/acme/issue" }),
      makeEvent({ id: "note", note: "Stripe webhook clue" })
    ];

    expect(filterEventsForQuery(events, "typeerror").map((event) => event.id)).toEqual(["content"]);
    expect(filterEventsForQuery(events, "app.tsx").map((event) => event.id)).toEqual(["path"]);
    expect(filterEventsForQuery(events, "GITHUB").map((event) => event.id)).toEqual(["url"]);
    expect(filterEventsForQuery(events, "stripe").map((event) => event.id)).toEqual(["note"]);
  });

  it("returns all events for an empty query", () => {
    const events = [makeEvent({ id: "a" }), makeEvent({ id: "b" })];

    expect(filterEventsForQuery(events, "")).toHaveLength(2);
  });

  it("keeps only events inside the requested minute window", () => {
    const now = new Date("2026-06-30T10:30:00.000Z");
    const events = [
      makeEvent({ id: "fresh", createdAt: "2026-06-30T10:05:00.000Z" }),
      makeEvent({ id: "old", createdAt: "2026-06-30T09:59:00.000Z" })
    ];

    expect(getEventsWithinWindow(events, now, 30).map((event) => event.id)).toEqual(["fresh"]);
  });

  it("keeps pinned events outside the requested window when includePinned is enabled", () => {
    const now = new Date("2026-06-30T10:30:00.000Z");
    const events = [
      makeEvent({ id: "pinned", createdAt: "2026-06-30T09:00:00.000Z", pinnedAt: "2026-06-30T09:01:00.000Z" }),
      makeEvent({ id: "old", createdAt: "2026-06-30T09:00:00.000Z" })
    ];

    expect(getEventsWithinWindow(events, now, 30, { includePinned: true }).map((event) => event.id)).toEqual(["pinned"]);
  });
});
