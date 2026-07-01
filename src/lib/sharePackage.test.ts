import { describe, expect, it } from "vitest";
import { generateSharePackage } from "./sharePackage";
import type { MemoryEvent } from "./types";

const baseEvent: Omit<MemoryEvent, "id" | "type" | "title" | "createdAt" | "expiresAt"> = {
  content: null,
  source: null,
  path: null,
  url: null,
  note: null,
  metadataJson: null,
  contentHash: null,
  sensitiveFlag: false,
  sensitiveReason: null,
  pinnedAt: null
};

describe("generateSharePackage", () => {
  it("exports selected events as JSON", () => {
    const output = generateSharePackage(
      [
        {
          ...baseEvent,
          id: "a",
          type: "link",
          title: "Stripe docs",
          url: "https://stripe.com/docs",
          createdAt: "2026-07-01T01:00:00.000Z",
          expiresAt: "2026-07-02T01:00:00.000Z"
        },
        {
          ...baseEvent,
          id: "b",
          type: "note",
          title: "Hidden",
          content: "not selected",
          createdAt: "2026-07-01T01:01:00.000Z",
          expiresAt: "2026-07-02T01:01:00.000Z"
        }
      ],
      { format: "json", selectedIds: ["a"] }
    );

    const parsed = JSON.parse(output);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].title).toBe("Stripe docs");
  });

  it("redacts sensitive content in every export format", () => {
    const events: MemoryEvent[] = [
      {
        ...baseEvent,
        id: "secret",
        type: "clipboard",
        title: "敏感内容已跳过",
        content: "token=secret-value",
        sensitiveFlag: true,
        sensitiveReason: "secret-keyword",
        createdAt: "2026-07-01T01:00:00.000Z",
        expiresAt: "2026-07-02T01:00:00.000Z"
      }
    ];

    expect(generateSharePackage(events, { format: "json" })).not.toContain("secret-value");
    expect(generateSharePackage(events, { format: "markdown" })).not.toContain("secret-value");
    expect(generateSharePackage(events, { format: "bug_report" })).not.toContain("secret-value");
    expect(generateSharePackage(events, { format: "markdown" })).toContain("敏感内容已跳过");
  });
});
