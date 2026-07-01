import { describe, expect, it } from "vitest";
import { filterSensitiveContent, SENSITIVE_CONTENT_PLACEHOLDER } from "./sensitive";

describe("filterSensitiveContent", () => {
  it("allows ordinary copied error text", () => {
    const result = filterSensitiveContent("TypeError: Cannot read properties of undefined (reading 'id')");

    expect(result.sensitive).toBe(false);
    expect(result.content).toContain("TypeError");
    expect(result.title).toContain("TypeError");
  });

  it("skips password-like key value content without preserving the secret", () => {
    const result = filterSensitiveContent("password=correct-horse-battery-staple");

    expect(result.sensitive).toBe(true);
    expect(result.content).toBeNull();
    expect(result.title).toBe(SENSITIVE_CONTENT_PLACEHOLDER);
    expect(result.reason).toBe("secret-keyword");
  });

  it("skips valid credit card candidates using Luhn validation", () => {
    const result = filterSensitiveContent("card 4111 1111 1111 1111");

    expect(result.sensitive).toBe(true);
    expect(result.reason).toBe("credit-card");
    expect(result.content).toBeNull();
  });

  it("does not flag random short numbers as credit cards", () => {
    const result = filterSensitiveContent("invoice 12345 total 88");

    expect(result.sensitive).toBe(false);
    expect(result.content).toBe("invoice 12345 total 88");
  });
});
