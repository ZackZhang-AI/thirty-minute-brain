export interface SensitiveFilterResult {
  sensitive: boolean;
  title: string;
  content: string | null;
  reason: string | null;
}

export const SENSITIVE_CONTENT_PLACEHOLDER = "敏感内容已跳过";

const SECRET_KEYWORD_PATTERN = /\b(password|passwd|secret|token|api[_-]?key)\b\s*[:=]/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const GITHUB_TOKEN_PATTERN = /\b(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/;
const OPENAI_KEY_PATTERN = /\bsk-[A-Za-z0-9_-]{20,}\b/;
const AWS_ACCESS_KEY_PATTERN = /\bAKIA[0-9A-Z]{16}\b/;

export function filterSensitiveContent(content: string): SensitiveFilterResult {
  const trimmed = content.trim();

  const reason = matchSensitiveReason(trimmed) ?? matchCreditCard(trimmed) ?? matchHighEntropyString(trimmed);

  if (reason) {
    return {
      sensitive: true,
      title: SENSITIVE_CONTENT_PLACEHOLDER,
      content: null,
      reason
    };
  }

  return {
    sensitive: false,
    title: summarizeText(trimmed),
    content: trimmed,
    reason: null
  };
}

export function summarizeText(text: string, maxLength = 80): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (!singleLine) return "Untitled";
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 1)}...` : singleLine;
}

function matchSensitiveReason(content: string): string | null {
  if (SECRET_KEYWORD_PATTERN.test(content)) return "secret-keyword";
  if (JWT_PATTERN.test(content)) return "jwt";
  if (GITHUB_TOKEN_PATTERN.test(content)) return "github-token";
  if (OPENAI_KEY_PATTERN.test(content)) return "openai-key";
  if (AWS_ACCESS_KEY_PATTERN.test(content)) return "aws-access-key";
  return null;
}

function matchCreditCard(content: string): string | null {
  const candidates = content.match(/(?:\d[ -]?){13,19}/g) ?? [];
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
  })
    ? "credit-card"
    : null;
}

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let doubleDigit = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum > 0 && sum % 10 === 0;
}

function matchHighEntropyString(content: string): string | null {
  const tokens = content.match(/\b[A-Za-z0-9_-]{33,}\b/g) ?? [];
  return tokens.some((token) => estimateEntropy(token) >= 4.2) ? "high-entropy-token" : null;
}

function estimateEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
