import { describe, expect, it } from "vitest";
import { generateContextPack } from "./contextPack";
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

describe("generateContextPack", () => {
  it("groups recent files, links, screenshots, and copied errors into markdown", () => {
    const markdown = generateContextPack([
      {
        ...baseEvent,
        id: "1",
        type: "clipboard",
        title: "TypeError copied",
        content: "TypeError: Cannot read properties of undefined",
        createdAt: "2026-06-30T10:21:00.000Z",
        expiresAt: "2026-07-01T10:21:00.000Z"
      },
      {
        ...baseEvent,
        id: "2",
        type: "file",
        title: "App.tsx",
        path: "C:\\project\\src\\App.tsx",
        createdAt: "2026-06-30T10:23:00.000Z",
        expiresAt: "2026-07-01T10:23:00.000Z"
      },
      {
        ...baseEvent,
        id: "3",
        type: "link",
        title: "StackOverflow",
        url: "https://stackoverflow.com/questions/1",
        createdAt: "2026-06-30T10:27:00.000Z",
        expiresAt: "2026-07-01T10:27:00.000Z"
      },
      {
        ...baseEvent,
        id: "4",
        type: "screenshot",
        title: "checkout bug.png",
        path: "C:\\shots\\checkout bug.png",
        createdAt: "2026-06-30T10:31:00.000Z",
        expiresAt: "2026-07-01T10:31:00.000Z"
      }
    ]);

    expect(markdown).toContain("# Thirty-Minute Brain Context");
    expect(markdown).toContain("TypeError copied");
    expect(markdown).toContain("C:\\project\\src\\App.tsx");
    expect(markdown).toContain("https://stackoverflow.com/questions/1");
    expect(markdown).toContain("checkout bug.png");
  });

  it("does not leak content for sensitive events", () => {
    const markdown = generateContextPack([
      {
        ...baseEvent,
        id: "secret",
        type: "clipboard",
        title: "敏感内容已跳过",
        content: null,
        sensitiveFlag: true,
        sensitiveReason: "secret-keyword",
        createdAt: "2026-06-30T10:21:00.000Z",
        expiresAt: "2026-07-01T10:21:00.000Z"
      }
    ]);

    expect(markdown).toContain("敏感内容已跳过");
    expect(markdown).not.toContain("correct-horse");
  });
});
