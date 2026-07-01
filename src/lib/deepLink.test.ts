import { describe, expect, it } from "vitest";
import { parseIngestionDeepLink, toDeepLinkPayload } from "./deepLink";

describe("parseIngestionDeepLink", () => {
  it("parses an ingestion deep link into token and CreateEventRequest", () => {
    const payload = toDeepLinkPayload({
      type: "browser_tab",
      title: "Stripe docs",
      url: "https://stripe.com/docs",
      source: "browser_extension",
      metadataJson: JSON.stringify({ browser: "chrome", timestamp: "2026-07-01T02:10:00.000Z" })
    });
    const parsed = parseIngestionDeepLink(`thirty-minute-brain://ingest?token=secret-token&payload=${payload}`);

    expect(parsed.token).toBe("secret-token");
    expect(parsed.event.type).toBe("browser_tab");
    expect(parsed.event.url).toBe("https://stripe.com/docs");
    expect(parsed.event.source).toBe("browser_extension");
  });

  it("rejects non-ingestion URLs", () => {
    expect(() => parseIngestionDeepLink("https://example.com/ingest?token=x")).toThrow("Unsupported deep link");
    expect(() => parseIngestionDeepLink("thirty-minute-brain://settings")).toThrow("Unsupported deep link");
  });

  it("requires token and payload query parameters", () => {
    expect(() => parseIngestionDeepLink("thirty-minute-brain://ingest?payload=abc")).toThrow("requires token");
    expect(() => parseIngestionDeepLink("thirty-minute-brain://ingest?token=abc")).toThrow("requires payload");
  });

  it("rejects payloads that are not event objects", () => {
    const payload = toDeepLinkPayload({ hello: "world" });

    expect(() => parseIngestionDeepLink(`thirty-minute-brain://ingest?token=abc&payload=${payload}`)).toThrow(
      "Invalid deep link payload"
    );
  });
});
