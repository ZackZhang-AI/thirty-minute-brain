export interface HighlightPart {
  text: string;
  highlighted: boolean;
}

export function splitHighlightedText(value: string, query: string): HighlightPart[] {
  const needle = query.trim();
  if (!needle) return [{ text: value, highlighted: false }];

  const lowerValue = value.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: HighlightPart[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const index = lowerValue.indexOf(lowerNeedle, cursor);
    if (index === -1) break;

    if (index > cursor) {
      parts.push({ text: value.slice(cursor, index), highlighted: false });
    }

    parts.push({ text: value.slice(index, index + needle.length), highlighted: true });
    cursor = index + needle.length;
  }

  if (cursor < value.length) {
    parts.push({ text: value.slice(cursor), highlighted: false });
  }

  return parts.length ? parts : [{ text: value, highlighted: false }];
}
