import { describe, expect, it } from "vitest";
import { generateContextPack } from "./contextPack";
import type { MemoryEvent } from "./types";

const event: MemoryEvent = {
  id: "bug",
  type: "clipboard",
  title: "TypeError copied",
  content: "TypeError: Cannot read properties of undefined",
  source: "clipboard",
  path: null,
  url: null,
  note: null,
  metadataJson: null,
  contentHash: null,
  sensitiveFlag: false,
  sensitiveReason: null,
  createdAt: "2026-06-30T10:21:00.000Z",
  expiresAt: "2026-07-01T10:21:00.000Z",
  pinnedAt: null
};

describe("context pack templates", () => {
  it("generates a bug report template", () => {
    const markdown = generateContextPack([event], { template: "bug_report" });

    expect(markdown).toContain("# Bug Report Context");
    expect(markdown).toContain("## Symptoms");
    expect(markdown).toContain("TypeError copied");
  });

  it("generates a teammate handoff template", () => {
    const markdown = generateContextPack([event], { template: "teammate" });

    expect(markdown).toContain("# Handoff Context");
    expect(markdown).toContain("## What changed recently");
  });
});
