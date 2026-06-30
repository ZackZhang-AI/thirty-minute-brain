import type { MemoryEvent } from "./types";

export interface ActivitySummary {
  topic: string;
  markdown: string;
  clueLines: string[];
}

export function summarizeRecentActivity(events: MemoryEvent[]): ActivitySummary {
  const sorted = [...events].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const topic = inferTopic(sorted);
  const counts = {
    clipboard: sorted.filter((event) => event.type === "clipboard").length,
    files: sorted.filter((event) => event.type === "file" || event.type === "screenshot" || event.type === "editor_file").length,
    links: sorted.filter((event) => event.type === "link" || event.type === "browser_tab").length,
    notes: sorted.filter((event) => event.type === "note" || event.type === "editor_selection").length,
    commands: sorted.filter((event) => event.type === "command").length,
    sensitive: sorted.filter((event) => event.sensitiveFlag).length
  };

  const clueLines = buildClueLines(counts);
  const eventLines = sorted.slice(0, 12).map(formatEventLine);
  const markdown = [
    `过去 30 分钟你大概在处理：${topic}。`,
    "",
    "相关线索：",
    ...(clueLines.length ? clueLines.map((line) => `- ${line}`) : ["- 暂时还没有足够线索。"]),
    "",
    "最近事件：",
    ...(eventLines.length ? eventLines.map((line) => `- ${line}`) : ["- 暂无事件。"])
  ].join("\n");

  return { topic, markdown, clueLines };
}

function buildClueLines(counts: {
  clipboard: number;
  files: number;
  links: number;
  notes: number;
  commands: number;
  sensitive: number;
}): string[] {
  const lines: string[] = [];

  if (counts.clipboard) lines.push(`复制了 ${counts.clipboard} 条剪贴板文本`);
  if (counts.files) lines.push(`打开或添加了 ${counts.files} 个文件`);
  if (counts.links) lines.push(`保存了 ${counts.links} 个链接`);
  if (counts.notes) lines.push(`记录了 ${counts.notes} 条笔记或选区`);
  if (counts.commands) lines.push(`记录了 ${counts.commands} 条终端命令`);
  if (counts.sensitive) lines.push(`${counts.sensitive} 条疑似敏感内容已跳过`);

  return lines;
}

function inferTopic(events: MemoryEvent[]): string {
  const corpus = events.map((event) => safeEventText(event)).join(" ").toLowerCase();

  if (/\b(stripe|checkout|payment|webhook|pay|billing)\b|支付|结账|付款|账单/.test(corpus)) {
    return "支付或结账相关问题";
  }

  if (/\b(login|signin|auth|oauth|session|password)\b|登录|鉴权|认证|密码/.test(corpus)) {
    return "登录或鉴权相关问题";
  }

  if (/\b(typeerror|error|exception|stacktrace|undefined|null)\b|报错|异常|错误/.test(corpus)) {
    return "排查代码报错";
  }

  if (/\b(invoice|receipt|pdf|contract)\b|发票|票据|合同/.test(corpus)) {
    return "处理文件或票据资料";
  }

  if (!events.length) {
    return "还没有形成明确上下文";
  }

  return "找回最近的工作线索";
}

function formatEventLine(event: MemoryEvent): string {
  const time = formatTime(event.createdAt);
  const type = readableType(event.type);
  const title = event.sensitiveFlag ? "敏感内容已跳过" : event.title;
  return `${time} ${type} · ${title}`;
}

function safeEventText(event: MemoryEvent): string {
  if (event.sensitiveFlag) return event.title;
  return [event.title, event.content, event.path, event.url, event.note].filter(Boolean).join(" ");
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function readableType(type: MemoryEvent["type"]): string {
  switch (type) {
    case "clipboard":
      return "剪贴板";
    case "screenshot":
      return "截图";
    case "file":
    case "editor_file":
      return "文件";
    case "link":
    case "browser_tab":
      return "链接";
    case "note":
    case "editor_selection":
      return "笔记";
    case "command":
      return "命令";
  }
}
