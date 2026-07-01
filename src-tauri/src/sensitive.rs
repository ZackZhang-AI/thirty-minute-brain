use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;

pub struct SensitiveResult {
    pub sensitive: bool,
    pub title: String,
    pub content: Option<String>,
    pub reason: Option<String>,
}

pub const SENSITIVE_CONTENT_PLACEHOLDER: &str = "敏感内容已跳过";

static SECRET_KEYWORD: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\b(password|passwd|secret|token|api[_-]?key)\b\s*[:=]").unwrap());
static JWT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b").unwrap());
static GITHUB: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b").unwrap());
static OPENAI: Lazy<Regex> = Lazy::new(|| Regex::new(r"\bsk-[A-Za-z0-9_-]{20,}\b").unwrap());
static AWS: Lazy<Regex> = Lazy::new(|| Regex::new(r"\bAKIA[0-9A-Z]{16}\b").unwrap());
static CARD_CANDIDATE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?:\d[ -]?){13,19}").unwrap());
static LONG_TOKEN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\b[A-Za-z0-9_-]{33,}\b").unwrap());

pub fn filter_sensitive_content(content: &str) -> SensitiveResult {
    let trimmed = content.trim();
    let reason = detect_reason(trimmed);

    if let Some(reason) = reason {
        return SensitiveResult {
            sensitive: true,
            title: SENSITIVE_CONTENT_PLACEHOLDER.to_string(),
            content: None,
            reason: Some(reason),
        };
    }

    SensitiveResult {
        sensitive: false,
        title: summarize_text(trimmed),
        content: Some(trimmed.to_string()),
        reason: None,
    }
}

pub fn summarize_text(content: &str) -> String {
    let single_line = content.split_whitespace().collect::<Vec<_>>().join(" ");
    if single_line.is_empty() {
        return "Untitled".to_string();
    }
    if single_line.chars().count() > 80 {
        format!("{}...", single_line.chars().take(79).collect::<String>())
    } else {
        single_line
    }
}

fn detect_reason(content: &str) -> Option<String> {
    if SECRET_KEYWORD.is_match(content) {
        return Some("secret-keyword".to_string());
    }
    if JWT.is_match(content) {
        return Some("jwt".to_string());
    }
    if GITHUB.is_match(content) {
        return Some("github-token".to_string());
    }
    if OPENAI.is_match(content) {
        return Some("openai-key".to_string());
    }
    if AWS.is_match(content) {
        return Some("aws-access-key".to_string());
    }
    if CARD_CANDIDATE.find_iter(content).any(|candidate| {
        let digits = candidate
            .as_str()
            .chars()
            .filter(|char| char.is_ascii_digit())
            .collect::<String>();
        digits.len() >= 13 && digits.len() <= 19 && luhn_check(&digits)
    }) {
        return Some("credit-card".to_string());
    }
    if LONG_TOKEN
        .find_iter(content)
        .any(|candidate| estimate_entropy(candidate.as_str()) >= 4.2)
    {
        return Some("high-entropy-token".to_string());
    }
    None
}

fn luhn_check(digits: &str) -> bool {
    let mut sum = 0;
    let mut double_digit = false;
    for char in digits.chars().rev() {
        let mut digit = char.to_digit(10).unwrap_or(0);
        if double_digit {
            digit *= 2;
            if digit > 9 {
                digit -= 9;
            }
        }
        sum += digit;
        double_digit = !double_digit;
    }
    sum > 0 && sum % 10 == 0
}

fn estimate_entropy(value: &str) -> f64 {
    let mut counts: HashMap<char, usize> = HashMap::new();
    for char in value.chars() {
        *counts.entry(char).or_insert(0) += 1;
    }
    let len = value.chars().count() as f64;
    counts
        .values()
        .map(|count| {
            let probability = *count as f64 / len;
            -probability * probability.log2()
        })
        .sum()
}
