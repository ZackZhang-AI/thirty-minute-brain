import type { ContextPackOptions, MemoryEvent } from "./types";

export function generateContextPack(
  events: MemoryEvent[],
  options: Pick<ContextPackOptions, "template"> = {}
): string {
  const ordered = orderEvents(events);
  if (options.template === "bug_report") return generateBugReportPack(ordered);
  if (options.template === "teammate") return generateTeammatePack(ordered);
  if (options.template === "meeting") return generateMeetingPack(ordered);
  return generateAiPack(ordered);
}

function generateAiPack(events: MemoryEvent[]): string {
  return [
    "# Thirty-Minute Brain Context",
    "",
    "## What I may have been doing",
    "",
    `Based on the last 30 minutes, I may have been working on: ${inferTopic(events)}.`,
    "",
    "## Key clues",
    "",
    ...eventBullets(events),
    "",
    "## Related files",
    "",
    ...resourceBullets(events, "path"),
    "",
    "## Related links",
    "",
    ...resourceBullets(events, "url"),
    "",
    "## Related errors or text",
    "",
    renderTextBlock(events),
    ""
  ].join("\n");
}

function generateBugReportPack(events: MemoryEvent[]): string {
  return [
    "# Bug Report Context",
    "",
    "## Summary",
    "",
    `Likely area: ${inferTopic(events)}.`,
    "",
    "## Symptoms",
    "",
    ...eventBullets(events),
    "",
    "## Relevant evidence",
    "",
    renderTextBlock(events),
    ""
  ].join("\n");
}

function generateTeammatePack(events: MemoryEvent[]): string {
  return [
    "# Handoff Context",
    "",
    "## What changed recently",
    "",
    ...eventBullets(events),
    "",
    "## Links and files",
    "",
    ...resourceBullets(events, "path", "url"),
    ""
  ].join("\n");
}

function generateMeetingPack(events: MemoryEvent[]): string {
  return [
    "# Meeting Context",
    "",
    "## Recent trail",
    "",
    ...eventBullets(events),
    "",
    "## Notes",
    "",
    renderTextBlock(events),
    ""
  ].join("\n");
}

function orderEvents(events: MemoryEvent[]): MemoryEvent[] {
  return [...events].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

function eventBullets(events: MemoryEvent[]): string[] {
  if (events.length === 0) return ["- No recent events."];
  return events.map((event) => `- ${formatTime(event.createdAt)} ${labelForType(event.type)}: ${event.title}`);
}

function resourceBullets(events: MemoryEvent[], ...fields: Array<"path" | "url">): string[] {
  const resources = events.flatMap((event) => fields.map((field) => event[field]).filter(Boolean) as string[]);
  if (resources.length === 0) return ["- None"];
  return [...new Set(resources)].map((resource) => `- ${resource}`);
}

function renderTextBlock(events: MemoryEvent[]): string {
  const snippets = events
    .filter((event) => event.type === "clipboard" || event.type === "note" || event.type === "editor_selection")
    .map((event) => (event.sensitiveFlag ? "Sensitive content skipped" : event.content ?? event.note ?? event.title));
  if (snippets.length === 0) return "- None";
  return ["```text", snippets.join("\n\n---\n\n"), "```"].join("\n");
}

function labelForType(type: MemoryEvent["type"]): string {
  const labels: Record<MemoryEvent["type"], string> = {
    clipboard: "Clipboard",
    screenshot: "Screenshot",
    file: "File",
    link: "Link",
    note: "Note",
    browser_tab: "Browser tab",
    editor_file: "Editor file",
    editor_selection: "Editor selection",
    command: "Command"
  };
  return labels[type];
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function inferTopic(events: MemoryEvent[]): string {
  const corpus = events
    .map((event) => [event.title, event.content, event.path, event.url, event.note].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();

  if (!corpus) return "organizing recent temporary context";
  if (corpus.includes("stripe") || corpus.includes("checkout") || corpus.includes("payment")) {
    return "payment or checkout debugging";
  }
  if (corpus.includes("login") || corpus.includes("auth") || corpus.includes("password")) {
    return "login or authentication work";
  }
  if (corpus.includes("typeerror") || corpus.includes("error") || corpus.includes("exception")) {
    return "debugging a code error";
  }
  if (corpus.includes("invoice") || corpus.includes("pdf")) {
    return "handling files or invoice material";
  }
  return "recovering recent files, links, and text clues";
}
