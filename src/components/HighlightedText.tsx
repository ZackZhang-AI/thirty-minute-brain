import { splitHighlightedText } from "../lib/highlight";

interface HighlightedTextProps {
  text: string;
  query: string;
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  return (
    <>
      {splitHighlightedText(text, query).map((part, index) =>
        part.highlighted ? (
          <mark key={`${part.text}-${index}`} className="rounded bg-amber-300/20 px-0.5 text-amber-100">
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        )
      )}
    </>
  );
}
