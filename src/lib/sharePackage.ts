import { generateContextPack } from "./contextPack";
import type { MemoryEvent } from "./types";

export type SharePackageFormat = "markdown" | "json" | "bug_report";

export interface SharePackageOptions {
  format: SharePackageFormat;
  selectedIds?: string[];
}

export function generateSharePackage(events: MemoryEvent[], options: SharePackageOptions): string {
  const selectedEvents = options.selectedIds?.length
    ? events.filter((event) => options.selectedIds?.includes(event.id))
    : events;
  const safeEvents = selectedEvents.map(redactEvent);

  if (options.format === "json") {
    return JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        events: safeEvents
      },
      null,
      2
    );
  }

  if (options.format === "bug_report") {
    return generateContextPack(safeEvents, { template: "bug_report" });
  }

  return generateContextPack(safeEvents, { template: "ai" });
}

function redactEvent(event: MemoryEvent): MemoryEvent {
  if (!event.sensitiveFlag) return { ...event };

  return {
    ...event,
    title: "敏感内容已跳过",
    content: null,
    note: event.note ? "敏感内容已跳过" : null,
    metadataJson: null,
    contentHash: null
  };
}
