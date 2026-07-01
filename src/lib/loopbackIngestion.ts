import type { DeepLinkIngestionTarget } from "./deepLinkIngestion";
import type { CreateEventRequest, MemoryEvent } from "./types";

export interface LoopbackIngestionRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: string;
}

export interface LoopbackIngestionResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const CORS_HEADERS = {
  "access-control-allow-origin": "http://127.0.0.1",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-thirty-minute-brain-token"
};

export async function handleLoopbackIngestionRequest(
  request: LoopbackIngestionRequest,
  target: DeepLinkIngestionTarget
): Promise<LoopbackIngestionResponse> {
  const method = request.method.toUpperCase();
  if (request.path !== "/ingest") {
    return jsonResponse(404, { error: "Not found" });
  }

  if (method === "OPTIONS") {
    return { status: 204, headers: CORS_HEADERS, body: "" };
  }

  if (method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const token = getIngestionToken(request.headers);
  if (!token) {
    return jsonResponse(401, { error: "Missing ingestion token" });
  }

  const event = parseBody(request.body);
  if (!event) {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  try {
    const ingested = await target.ingestExternalEvent({ token, event });
    return jsonResponse(201, { event: ingested });
  } catch (error) {
    return jsonResponse(errorStatus(error), { error: errorMessage(error) });
  }
}

function getIngestionToken(headers: Record<string, string | undefined>): string {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  const headerToken = normalized["x-thirty-minute-brain-token"]?.trim();
  if (headerToken) return headerToken;

  const authorization = normalized.authorization?.trim();
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function parseBody(body: string): CreateEventRequest | null {
  try {
    const parsed = JSON.parse(body) as Partial<CreateEventRequest>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (typeof parsed.type !== "string" || typeof parsed.title !== "string" || typeof parsed.source !== "string") {
      return null;
    }
    return parsed as CreateEventRequest;
  } catch {
    return null;
  }
}

function jsonResponse(status: number, body: { event?: MemoryEvent; error?: string }): LoopbackIngestionResponse {
  return {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function errorStatus(error: unknown): number {
  const message = errorMessage(error);
  if (message.includes("Invalid ingestion token")) return 401;
  if (message.includes("disabled") || message.includes("paused") || message.includes("cannot create")) return 403;
  if (message.includes("requires") || message.includes("Unsupported") || message.includes("Unauthorized")) return 400;
  return 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ingestion failed";
}
