import { describe, expect, it } from "vitest";
import { summarizeRecentActivity } from "./activitySummary";
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

describe("summarizeRecentActivity", () => {
  it("summarizes a payment debugging trail with useful clues", () => {
    const summary = summarizeRecentActivity([
      {
        ...baseEvent,
        id: "1",
        type: "clipboard",
        title: "Stripe webhook TypeError",
        content: "TypeError in Stripe webhook callback",
        createdAt: "2026-06-30T10:21:00.000Z",
        expiresAt: "2026-07-01T10:21:00.000Z"
      },
      {
        ...baseEvent,
        id: "2",
        type: "file",
        title: "app/login/page.tsx",
        path: "C:\\project\\app\\login\\page.tsx",
        createdAt: "2026-06-30T10:23:00.000Z",
        expiresAt: "2026-07-01T10:23:00.000Z"
      },
      {
        ...baseEvent,
        id: "3",
        type: "link",
        title: "Stripe docs",
        url: "https://stripe.com/docs/webhooks",
        createdAt: "2026-06-30T10:27:00.000Z",
        expiresAt: "2026-07-01T10:27:00.000Z"
      }
    ]);

    expect(summary.topic).toBe("支付或结账相关问题");
    expect(summary.markdown).toContain("过去 30 分钟你大概在处理：支付或结账相关问题。");
    expect(summary.markdown).toContain("复制了 1 条剪贴板文本");
    expect(summary.markdown).toContain("打开或添加了 1 个文件");
    expect(summary.markdown).toContain("保存了 1 个链接");
  });

  it("does not leak sensitive event contents", () => {
    const summary = summarizeRecentActivity([
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

    expect(summary.markdown).toContain("敏感内容已跳过");
    expect(summary.markdown).not.toContain("secret-keyword=");
  });
});

