import { describe, expect, it } from "vitest";
import { createLocalEventStore } from "./localStore";

describe("createLocalEventStore", () => {
  it("creates manual text events with a 24 hour expiry", async () => {
    const store = createLocalEventStore({
      now: () => new Date("2026-06-30T10:00:00.000Z")
    });

    const event = await store.createManualEvent({
      type: "note",
      content: "Remember the login callback error"
    });

    expect(event.title).toBe("Remember the login callback error");
    expect(event.expiresAt).toBe("2026-07-01T10:00:00.000Z");
  });

  it("searches created events", async () => {
    const store = createLocalEventStore();

    await store.createManualEvent({ type: "note", content: "Stripe webhook failed" });
    await store.createManualEvent({ type: "link", url: "https://example.com/docs" });

    const results = await store.searchEvents("stripe", 30);

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain("Stripe");
  });

  it("skips sensitive manual text content", async () => {
    const store = createLocalEventStore();

    const event = await store.createManualEvent({ type: "note", content: "token=secret-value" });

    expect(event.sensitiveFlag).toBe(true);
    expect(event.content).toBeNull();
  });

  it("pins events so they remain visible outside the active time window", async () => {
    let current = new Date("2026-06-30T10:00:00.000Z");
    const store = createLocalEventStore({ now: () => current });

    const event = await store.createManualEvent({ type: "note", content: "Pinned debugging clue" });
    await store.togglePinEvent(event.id, true);
    current = new Date("2026-06-30T12:00:00.000Z");

    const recent = await store.listRecentEvents({ windowMinutes: 30 });

    expect(recent.map((item) => item.id)).toContain(event.id);
    expect(recent[0].pinnedAt).toBe("2026-06-30T10:00:00.000Z");
  });

  it("updates event title and note", async () => {
    const store = createLocalEventStore();
    const event = await store.createManualEvent({ type: "note", content: "Old title" });

    const updated = await store.updateEvent(event.id, {
      title: "Checkout callback",
      note: "Send to AI"
    });

    expect(updated.title).toBe("Checkout callback");
    expect(updated.note).toBe("Send to AI");
  });

  it("filters search results by type and sensitive skipped state", async () => {
    const store = createLocalEventStore();
    await store.createManualEvent({ type: "link", url: "https://github.com/acme/issue" });
    await store.createManualEvent({ type: "note", content: "token=secret-value" });

    const linkResults = await store.searchEvents("github", { windowMinutes: 30, types: ["link"] });
    const sensitiveResults = await store.searchEvents("", { windowMinutes: 30, sensitiveOnly: true });

    expect(linkResults).toHaveLength(1);
    expect(linkResults[0].type).toBe("link");
    expect(sensitiveResults).toHaveLength(1);
    expect(sensitiveResults[0].sensitiveFlag).toBe(true);
  });

  it("clears only events inside a requested window and keeps pinned events", async () => {
    let current = new Date("2026-06-30T10:00:00.000Z");
    const store = createLocalEventStore({ now: () => current });
    const old = await store.createManualEvent({ type: "note", content: "Old clue" });

    current = new Date("2026-06-30T10:50:00.000Z");
    const fresh = await store.createManualEvent({ type: "note", content: "Fresh clue" });
    await store.togglePinEvent(fresh.id, true);
    await store.clearEvents({ windowMinutes: 30 });

    const remaining = await store.listRecentEvents({ windowMinutes: 1440 });

    expect(remaining.map((item) => item.id)).toEqual([fresh.id, old.id]);
  });

  it("reports privacy status for local-only capture", async () => {
    const store = createLocalEventStore();
    await store.createManualEvent({ type: "note", content: "hello" });

    const status = await store.getPrivacyStatus();

    expect(status.localOnly).toBe(true);
    expect(status.retentionHours).toBe(24);
    expect(status.eventCount).toBe(1);
    expect(status.disallowedSources).toContain("browser_history");
  });
});
