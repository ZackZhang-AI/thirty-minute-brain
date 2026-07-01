# Thirty-Minute Brain Browser Extension

This Manifest V3 extension captures only the current active tab.

It does not read full browser history. By default it saves a tab only when the user clicks the extension button. Optional active-tab sync is controlled by `chrome.storage.local.autoSyncActiveTab`.

Expected desktop endpoint:

```text
POST http://127.0.0.1:38330/ingest
```

Payload:

```json
{
  "type": "browser_tab",
  "title": "Stripe docs",
  "url": "https://stripe.com/docs",
  "source": "browser_extension",
  "metadataJson": "{\"browser\":\"chrome\",\"timestamp\":\"2026-07-01T00:00:00.000Z\"}"
}
```
