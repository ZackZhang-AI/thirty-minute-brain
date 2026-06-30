import { formatDistanceToNowStrict } from "date-fns";
import { zhCN } from "date-fns/locale";

export function formatClock(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatAgo(value: string): string {
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: zhCN
  });
}

