import { describe, expect, it } from "vitest";
import { splitHighlightedText } from "./highlight";

describe("splitHighlightedText", () => {
  it("returns the original text when the query is empty", () => {
    expect(splitHighlightedText("Stripe webhook", "")).toEqual([{ text: "Stripe webhook", highlighted: false }]);
  });

  it("highlights query matches case-insensitively", () => {
    expect(splitHighlightedText("Stripe TypeError callback", "typeerror")).toEqual([
      { text: "Stripe ", highlighted: false },
      { text: "TypeError", highlighted: true },
      { text: " callback", highlighted: false }
    ]);
  });

  it("highlights repeated matches", () => {
    expect(splitHighlightedText("error then Error", "error")).toEqual([
      { text: "error", highlighted: true },
      { text: " then ", highlighted: false },
      { text: "Error", highlighted: true }
    ]);
  });

  it("treats regex characters as plain search text", () => {
    expect(splitHighlightedText("Cannot read properties of undefined...", "undefined...")).toEqual([
      { text: "Cannot read properties of ", highlighted: false },
      { text: "undefined...", highlighted: true }
    ]);
  });
});
