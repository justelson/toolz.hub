importScripts(
  chrome.runtime.getURL('lib/sql-wasm.js'),
  chrome.runtime.getURL('lib/db-worker.js')
);

const TICK_SECONDS = 5;
const SITE_MAP = {
  'youtube.com': 'youtube',
  'instagram.com': 'instagram',
  'x.com': 'x',
  'twitter.com': 'x'
};

let activeSite = null;
let activeTabId = null;
let focusedWindowId = chrome.windows.WINDOW_ID_NONE;
let isIdle = false;
let customSites = [];
let tabVisibility = {};
let currentSessionSite = null;
let currentSessionStartTime = null;
let sessionStartTimes = {};

function getLocalDateKey(now = Date.now()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSessionKey(site, dateKey = getLocalDateKey()) {
  return `${dateKey}:${site}`;
}

function pruneSessionStartTimes(now = Date.now()) {
  const todayKey = `${getLocalDateKey(now)}:`;
  sessionStartTimes = Object.fromEntries(
    Object.entries(sessionStartTimes).filter(([key]) => key.startsWith(todayKey))
  );
}

async function persistSessionState() {
  await chrome.storage.session.set({
    currentSessionSite,
    currentSessionStartTime,
    sessionStartTimes
  });
}

async function restoreSessionState() {
  const data = await chrome.storage.session.get([
    'currentSessionSite',
    'currentSessionStartTime',
    'sessionStartTimes'
  ]);
  currentSessionSite = data.currentSessionSite || null;
  currentSessionStartTime = data.currentSessionStartTime || null;
  sessionStartTimes = data.sessionStartTimes && typeof data.sessionStartTimes === 'object'
    ? data.sessionStartTimes
    : {};
  pruneSessionStartTimes();
  if (currentSessionSite && currentSessionStartTime) {
    const key = getSessionKey(currentSessionSite);
    if (!sessionStartTimes[key]) sessionStartTimes[key] = currentSessionStartTime;
  }
}

function getSiteFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace('www.', '');
    for (const [domain, site] of Object.entries(SITE_MAP)) {
      if (host === domain || host.endsWith(`.${domain}`)) return site;
    }
    for (const site of customSites) {
      const hostname = site.hostname.replace('www.', '');
      if (host === hostname || host.endsWith(`.${hostname}`)) return site.hostname;
    }
  } catch {}
  return null;
}

async function ensureReady() {
  await self.DB.initDB();
  customSites = self.DB.getCustomSites(self.DB.getActiveProfileId());
}

function setCurrentSession(site) {
  pruneSessionStartTimes();

  if (!site) {
    if (currentSessionSite !== null || currentSessionStartTime !== null) {
      currentSessionSite = null;
      currentSessionStartTime = null;
      persistSessionState();
    }
    return;
  }

  const sessionKey = getSessionKey(site);
  if (!sessionStartTimes[sessionKey]) sessionStartTimes[sessionKey] = Date.now();

  const nextStartTime = sessionStartTimes[sessionKey];
  if (site !== currentSessionSite || currentSessionStartTime !== nextStartTime) {
    currentSessionSite = site;
    currentSessionStartTime = nextStartTime;
    persistSessionState();
  }
}

async function resolveFocusedWindowId() {
  try {
    const focusedWindow = await chrome.windows.getLastFocused();
    if (focusedWindow?.focused && focusedWindow.id != null) return focusedWindow.id;
  } catch {}
  return chrome.windows.WINDOW_ID_NONE;
}

async function updateActiveSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    activeTabId = tab?.id ?? null;
    focusedWindowId = tab?.windowId ?? await resolveFocusedWindowId();
    activeSite = tab ? getSiteFromUrl(tab.url) : null;
    setCurrentSession(activeSite);
  } catch {
    activeTabId = null;
    activeSite = null;
    focusedWindowId = await resolveFocusedWindowId();
    setCurrentSession(null);
  }
}

async function tick() {
  if (isIdle || !activeSite || activeTabId == null) return;
  if (focusedWindowId === chrome.windows.WINDOW_ID_NONE) return;
  if (tabVisibility[activeTabId] === false) return;

  await ensureReady();
  const profileId = self.DB.getActiveProfileId();
  self.DB.upsertSession(profileId, activeSite, TICK_SECONDS);
  await self.DB.persistDB();
}

async function bootstrap() {
  await restoreSessionState();
  await ensureReady();
  await updateActiveSite();
  chrome.alarms.clear('tick', () => {
    chrome.alarms.create('tick', { periodInMinutes: TICK_SECONDS / 60 });
  });
}

chrome.runtime.onInstalled.addListener(bootstrap);
chrome.runtime.onStartup.addListener(bootstrap);
chrome.runtime.onSuspend?.addListener(() => {
  persistSessionState().catch(() => {});
  self.DB.persistDB().catch(() => {});
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'tick') return;
  await tick();
});

chrome.tabs.onActivated.addListener(async () => {
  await updateActiveSite();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    if (tab.active) await updateActiveSite();
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  delete tabVisibility[tabId];
  if (tabId === activeTabId) {
    activeTabId = null;
    activeSite = null;
    setCurrentSession(null);
  }
});

chrome.windows.onFocusChanged.addListener(async windowId => {
  focusedWindowId = windowId;
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    activeTabId = null;
    activeSite = null;
    setCurrentSession(null);
    return;
  }
  await updateActiveSite();
});

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(state => {
  isIdle = state !== 'active';
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    await ensureReady();

    if (message.type === 'PAGE_VISIBILITY') {
      if (sender.tab?.id != null) {
        tabVisibility[sender.tab.id] = !!message.visible;
      }
      sendResponse({ success: true });
      return;
    }

    if (message.type === 'REFRESH_CUSTOM_SITES') {
      await self.DB.persistDB();
      await self.DB.reloadDB();
      customSites = self.DB.getCustomSites(self.DB.getActiveProfileId());
      await updateActiveSite();
      sendResponse({ success: true });
      return;
    }

    if (message.type === 'GET_STATE') {
      const profileId = self.DB.getActiveProfileId();
      sendResponse({
        usage: self.DB.getTodayUsage(profileId),
        goals: self.DB.getGoals(profileId),
        activeSite,
        activeProfile: profileId,
        pins: self.DB.getPinnedSites(profileId),
        customSites: self.DB.getCustomSites(profileId),
        theme: self.DB.getTheme(profileId),
        sessionStartTime: currentSessionStartTime
      });
      return;
    }

    sendResponse({ success: false });
  })();

  return true;
});

bootstrap();
