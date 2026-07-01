import type { CreateEventRequest } from "./types";

export interface ParsedIngestionDeepLink {
  token: string;
  event: CreateEventRequest;
}

export function parseIngestionDeepLink(value: string): ParsedIngestionDeepLink {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Unsupported deep link");
  }

  if (url.protocol !== "thirty-minute-brain:" || url.hostname !== "ingest") {
    throw new Error("Unsupported deep link");
  }

  const token = url.searchParams.get("token")?.trim();
  if (!token) throw new Error("Deep link requires token");

  const payload = url.searchParams.get("payload")?.trim();
  if (!payload) throw new Error("Deep link requires payload");

  const event = fromDeepLinkPayload(payload);
  if (!isCreateEventRequestLike(event)) {
    throw new Error("Invalid deep link payload");
  }

  return { token, event };
}

export function toDeepLinkPayload(value: unknown): string {
  return base64UrlEncode(JSON.stringify(value));
}

function fromDeepLinkPayload(payload: string): unknown {
  try {
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    throw new Error("Invalid deep link payload");
  }
}

function isCreateEventRequestLike(value: unknown): value is CreateEventRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Partial<CreateEventRequest>;
  return typeof input.type === "string" && typeof input.title === "string" && typeof input.source === "string";
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
