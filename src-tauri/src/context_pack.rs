use crate::models::MemoryEvent;

pub fn generate_context_pack(events: &[MemoryEvent]) -> String {
    let mut ordered = events.to_vec();
    ordered.sort_by(|left, right| left.created_at.cmp(&right.created_at));

    let mut lines = vec![
        "# Thirty-Minute Brain Context".to_string(),
        String::new(),
        "## 我刚才可能在做什么".to_string(),
        String::new(),
        format!("基于最近 30 分钟的线索，用户可能正在处理：{}。", infer_topic(&ordered)),
        String::new(),
        "## 关键线索".to_string(),
        String::new(),
    ];

    if ordered.is_empty() {
        lines.push("- 最近 30 分钟没有记录到上下文事件。".to_string());
    } else {
        for event in &ordered {
            lines.push(format!("- {} {}: {}", format_time(&event.created_at), event.event_type, event.title));
        }
    }

    append_section(
        &mut lines,
        "相关文件",
        ordered.iter().filter_map(|event| event.path.clone()).collect(),
    );
    append_section(
        &mut lines,
        "相关链接",
        ordered.iter().filter_map(|event| event.url.clone()).collect(),
    );

    lines.push(String::new());
    lines.push("## 相关报错或文本".to_string());
    lines.push(String::new());
    let snippets: Vec<String> = ordered
        .iter()
        .filter(|event| event.event_type == "clipboard" || event.event_type == "note")
        .map(|event| {
            if event.sensitive_flag {
                "敏感内容已跳过".to_string()
            } else {
                event
                    .content
                    .clone()
                    .or_else(|| event.note.clone())
                    .unwrap_or_else(|| event.title.clone())
            }
        })
        .collect();

    if snippets.is_empty() {
        lines.push("- 无".to_string());
    } else {
        lines.push("```text".to_string());
        lines.push(snippets.join("\n\n---\n\n"));
        lines.push("```".to_string());
    }

    format!("{}\n", lines.join("\n"))
}

fn append_section(lines: &mut Vec<String>, title: &str, values: Vec<String>) {
    lines.push(String::new());
    lines.push(format!("## {}", title));
    lines.push(String::new());
    if values.is_empty() {
        lines.push("- 无".to_string());
    } else {
        for value in values {
            lines.push(format!("- {}", value));
        }
    }
}

fn infer_topic(events: &[MemoryEvent]) -> &'static str {
    let corpus = events
        .iter()
        .map(|event| {
            [
                Some(event.title.as_str()),
                event.content.as_deref(),
                event.path.as_deref(),
                event.url.as_deref(),
                event.note.as_deref(),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(" ")
        })
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase();

    if corpus.contains("stripe") || corpus.contains("checkout") || corpus.contains("payment") {
        "支付或结账相关问题"
    } else if corpus.contains("login") || corpus.contains("auth") {
        "登录或鉴权相关问题"
    } else if corpus.contains("typeerror") || corpus.contains("error") || corpus.contains("exception") {
        "排查代码报错"
    } else if corpus.contains("invoice") || corpus.contains("pdf") {
        "处理文件或票据资料"
    } else {
        "找回刚刚出现过的文件、链接和文本线索"
    }
}

fn format_time(value: &str) -> String {
    value
        .split('T')
        .nth(1)
        .and_then(|time| time.get(0..5))
        .unwrap_or("--:--")
        .to_string()
}
