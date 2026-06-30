use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: String,
    pub content: Option<String>,
    pub source: Option<String>,
    pub path: Option<String>,
    pub url: Option<String>,
    pub note: Option<String>,
    pub metadata_json: Option<String>,
    pub content_hash: Option<String>,
    pub sensitive_flag: bool,
    pub sensitive_reason: Option<String>,
    pub created_at: String,
    pub expires_at: String,
    pub pinned_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewManualEventInput {
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub path: Option<String>,
    pub url: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEventRequest {
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: String,
    pub content: Option<String>,
    pub path: Option<String>,
    pub url: Option<String>,
    pub note: Option<String>,
    pub source: String,
    pub metadata_json: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventUpdateInput {
    pub title: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyStatus {
    pub local_only: bool,
    pub retention_hours: i64,
    pub database_path: String,
    pub event_count: i64,
    pub enabled_sources: Vec<String>,
    pub disallowed_sources: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchedFolder {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct NewEvent {
    pub event_type: String,
    pub title: String,
    pub content: Option<String>,
    pub source: Option<String>,
    pub path: Option<String>,
    pub url: Option<String>,
    pub note: Option<String>,
    pub metadata_json: Option<String>,
    pub content_hash: Option<String>,
    pub sensitive_flag: bool,
    pub sensitive_reason: Option<String>,
}
