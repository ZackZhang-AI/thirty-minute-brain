import { describe, expect, it } from "vitest";
import { normalizeCreateEventRequest } from "./ingestion";

describe("normalizeCreateEventRequest", () => {
  it("accepts browser tab events without reading browser history", () => {
    const normalized = normalizeCreateEventRequest({
      type: "browser_tab",
      title: "Stripe docs",
      url: "https://stripe.com/docs",
      source: "browser_extension"
    });

    expect(normalized.type).toBe("browser_tab");
    expect(normalized.url).toBe("https://stripe.com/docs");
    expect(normalized.metadataJson).toContain("browser_extension");
  });

  it("rejects unsupported event types", () => {
    expect(() =>
      normalizeCreateEventRequest({
        // @ts-expect-error runtime validation covers plugin input
        type: "browser_history",
        title: "History dump",
        source: "browser_extension"
      })
    ).toThrow("Unsupported event type");
  });

  it("requires a URL for browser tab events and a path for editor file events", () => {
    expect(() =>
      normalizeCreateEventRequest({
        type: "browser_tab",
        title: "Missing URL",
        source: "browser_extension"
      })
    ).toThrow("requires url");

    expect(() =>
      normalizeCreateEventRequest({
        type: "editor_file",
        title: "Missing path",
        source: "vscode_extension"
      })
    ).toThrow("requires path");
  });
});

