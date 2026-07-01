const INGEST_URL = "http://127.0.0.1:38330/ingest";

chrome.action.onClicked.addListener(async (tab) => {
  const activeTab = tab?.url ? tab : await getActiveTab();
  if (!activeTab?.url) return;

  const settings = await chrome.storage.local.get({
    autoSyncActiveTab: false,
    ingestionToken: ""
  });

  await sendEvent({
    type: "browser_tab",
    title: activeTab.title || activeTab.url,
    url: activeTab.url,
    source: "browser_extension",
    metadataJson: JSON.stringify({
      browser: "chrome",
      capturedBy: "action_click",
      timestamp: new Date().toISOString()
    })
  }, settings.ingestionToken);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const settings = await chrome.storage.local.get({
    autoSyncActiveTab: false,
    ingestionToken: ""
  });
  if (!settings.autoSyncActiveTab) return;

  const tab = await chrome.tabs.get(tabId);
  if (!tab?.url) return;

  await sendEvent({
    type: "browser_tab",
    title: tab.title || tab.url,
    url: tab.url,
    source: "browser_extension",
    metadataJson: JSON.stringify({
      browser: "chrome",
      capturedBy: "active_tab_sync",
      timestamp: new Date().toISOString()
    })
  }, settings.ingestionToken);
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendEvent(event, token) {
  await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-thirty-minute-brain-token": token || ""
    },
    body: JSON.stringify(event)
  });
}
