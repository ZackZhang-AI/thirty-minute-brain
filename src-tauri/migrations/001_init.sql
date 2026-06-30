CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source TEXT,
  path TEXT,
  url TEXT,
  note TEXT,
  metadata_json TEXT,
  content_hash TEXT,
  sensitive_flag INTEGER NOT NULL DEFAULT 0,
  sensitive_reason TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  pinned_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watched_folders (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_content_hash ON events(content_hash);
CREATE INDEX IF NOT EXISTS idx_events_pinned_at ON events(pinned_at);

CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  title,
  content,
  path,
  url,
  note,
  content='events',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, title, content, path, url, note)
  VALUES (new.rowid, new.title, new.content, new.path, new.url, new.note);
END;

CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, title, content, path, url, note)
  VALUES ('delete', old.rowid, old.title, old.content, old.path, old.url, old.note);
END;

CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, title, content, path, url, note)
  VALUES ('delete', old.rowid, old.title, old.content, old.path, old.url, old.note);
  INSERT INTO events_fts(rowid, title, content, path, url, note)
  VALUES (new.rowid, new.title, new.content, new.path, new.url, new.note);
END;
