# togltabs — Full Build Spec
> AI Developer Prompt & Phase Plan
> Written for: opencode / minimax2.5
> Author: ELSON (Just Elson Development Labs)

---

## HOW TO READ THIS DOCUMENT

You are building **togltabs** — a Chrome browser extension + Electron desktop app that tracks time spent on YouTube, Instagram, and X (Twitter), stores everything in a local SQLite database via OPFS, supports multiple profiles, and shows a full analytics dashboard.

**Build strictly by phase. Do not move to the next phase until ELSON approves the current one.**
Each phase has a GOAL. The goal must be fully met — not partially — before moving on.
Phase 1 is the only phase that must ship the complete core value: **tracking + goal warnings working end to end.**

---

## PRODUCT OVERVIEW

**Name:** togltabs
**Type:** Chrome Extension (Manifest V3) + Electron Desktop App (Phase 2)
**Storage:** SQLite via sql.js (WASM) stored in OPFS (Origin Private File System) — sandboxed inside Chrome's internal storage, invisible to the user in File Explorer. No server. No cloud. Everything local.
**Profiles:** Multiple profiles share one database. Each profile has its own sessions, goals, and settings. No login system — just profile switching.
**Core value (non-negotiable in Phase 1):** Track time on YouTube, Instagram, and X per profile. Warn the user visually when they hit a daily goal.

---

## DESIGN SYSTEM

Use the following CSS variables exactly. Do not invent a new theme.

```css
/* LIGHT */
--background: rgb(255, 255, 255);
--foreground: rgb(51, 51, 51);
--card: rgb(255, 255, 255);
--card-foreground: rgb(51, 51, 51);
--primary: rgb(59, 130, 246);
--primary-foreground: rgb(255, 255, 255);
--secondary: rgb(243, 244, 246);
--secondary-foreground: rgb(75, 85, 99);
--muted: rgb(249, 250, 251);
--muted-foreground: rgb(107, 114, 128);
--accent: rgb(224, 242, 254);
--accent-foreground: rgb(30, 58, 138);
--border: rgb(229, 231, 235);
--destructive: rgb(239, 68, 68);

/* DARK */
--background: rgb(23, 23, 23);
--foreground: rgb(229, 229, 229);
--card: rgb(38, 38, 38);
--card-foreground: rgb(229, 229, 229);
--primary: rgb(59, 130, 246);
--muted: rgb(31, 31, 31);
--muted-foreground: rgb(163, 163, 163);
--border: rgb(64, 64, 64);

/* BRAND ACCENT (JEDL) */
--brand: #F26157;  /* Vibrant Coral — use for highlights, active states, goal-hit indicators */

/* TYPOGRAPHY */
--font-sans: "Plus Jakarta Sans", ui-sans-serif, sans-serif;
--font-mono: "JetBrains Mono", monospace;

/* RADIUS */
--radius: 0.375rem;
```

**Default theme: dark.** Light mode is available via settings toggle.
**Site color coding (use consistently everywhere):**
- YouTube → `#FF0000`
- Instagram → `#E1306C`
- X → `#ffffff` (dark bg) / `#000000` (light bg)

---

## ICONS

Never use emojis anywhere in the UI. Use SVG icons only. Two sources — one for brand logos, one for UI chrome.

### Brand Icons — Simple Icons
For YouTube, Instagram, X, and any custom site that has a known brand.
- Library: **Simple Icons** (`https://simpleicons.org/`)
- Usage via CDN (no bundler needed):
  ```html
  <!-- YouTube icon in red -->
  <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" height="16" />

  <!-- Instagram icon in brand pink -->
  <img src="https://cdn.simpleicons.org/instagram/E1306C" width="16" height="16" />

  <!-- X icon in white -->
  <img src="https://cdn.simpleicons.org/x/ffffff" width="16" height="16" />
  ```
- For custom sites: attempt `https://cdn.simpleicons.org/{slug}/{color}` where `slug` is the label lowercased with spaces removed (e.g. `"TikTok"` → `tiktok`). If the `<img>` fires an `onerror`, fall back to the **text fallback icon**.
- Cache fetched icons in `chrome.storage.local` as base64 data URIs keyed by slug so the extension works fully offline after first load. Serve from cache on subsequent uses.

### UI Icons — Lucide (inline SVG)
For all interface chrome: pin, settings, back, remove, add, dashboard link, close, alert.
- Library: **Lucide Icons** (`https://lucide.dev/`)
- Do NOT import the npm package. Copy the specific SVG `<path>` strings from lucide.dev directly into an `icons.js` file as a JS object. This keeps the extension fully self-contained with zero network dependency for UI icons.
- Size: `16px` inline, `20px` for standalone buttons
- Color: always `currentColor` — never hardcoded hex on Lucide icons
- Required icon set:
  ```js
  // icons.js
  export const ICONS = {
    pin:          `<path d="..."/>`,   // lucide: pin
    pinOff:       `<path d="..."/>`,   // lucide: pin-off
    trash:        `<path d="..."/>`,   // lucide: trash-2
    plus:         `<path d="..."/>`,   // lucide: plus
    settings:     `<path d="..."/>`,   // lucide: settings
    arrowLeft:    `<path d="..."/>`,   // lucide: arrow-left
    externalLink: `<path d="..."/>`,   // lucide: external-link
    check:        `<path d="..."/>`,   // lucide: check
    close:        `<path d="..."/>`,   // lucide: x  (close icon — NOT the X brand)
    alert:        `<path d="..."/>`,   // lucide: circle-alert
  };

  export function icon(key, size = 16) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${ICONS[key]}</svg>`;
  }
  ```

### Text Fallback Icon
When a brand icon cannot be resolved (unknown custom site, CDN offline, fetch failed):
- Small square pill showing the first 2 characters of the site label, uppercase
- Background: site color at 20% opacity
- Text: site color at 100%, `--font-mono`, `font-size: 10px`, `font-weight: 600`
- Size: `24px × 24px`, `border-radius: 4px`
- Example: `"Reddit"` with color `#8b5cf6` → pill shows `RE` in purple on a purple-tinted bg

### Icon Rules
1. Never use emoji anywhere — not in labels, not in status text, not in placeholders
2. Every site row must lead with its brand icon (or fallback pill) — never a letter or bare text
3. Every UI action button uses a Lucide icon — never text symbols like `×`, `+`, `→`
4. Pinned strip site icons: `14px`
5. All SVG icons must carry `aria-hidden="true"` plus an adjacent visually-hidden `<span>` for screen readers

---

## DATABASE

### Storage: OPFS (Origin Private File System)
The `.db` file is stored inside Chrome's sandboxed filesystem. It is NOT accessible via normal File Explorer. It persists across browser restarts and extension reinstalls unless the user explicitly clears Chrome's file system storage.

Initialize OPFS like this:
```js
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('togltabs.db', { create: true });
```

Use **sql.js** (SQLite compiled to WebAssembly) to read/write the database.
CDN: `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js`
Or install via npm: `npm install sql.js`

### Full Schema

```sql
-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  color       TEXT    NOT NULL DEFAULT '#F26157',
  avatar      TEXT,                                 -- single char or emoji
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ─────────────────────────────────────────
-- SESSIONS
-- One row per profile × site × day
-- On conflict: add new seconds to existing row
-- site column holds 'youtube' | 'instagram' | 'x' | any custom site hostname
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL,
  site        TEXT    NOT NULL,   -- no CHECK constraint — allows custom hostnames
  date        TEXT    NOT NULL,  -- 'YYYY-MM-DD'
  seconds     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, site, date)
);

-- ─────────────────────────────────────────
-- GOALS
-- Max daily time per site per profile
-- 0 = no goal set
-- site column holds 'youtube' | 'instagram' | 'x' | any custom site hostname
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  profile_id  INTEGER NOT NULL,
  site        TEXT    NOT NULL,   -- no CHECK constraint — allows custom hostnames
  daily_max   INTEGER NOT NULL DEFAULT 0,  -- in seconds
  PRIMARY KEY (profile_id, site),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- SETTINGS
-- Per profile preferences
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  profile_id  INTEGER PRIMARY KEY,
  theme       TEXT    NOT NULL DEFAULT 'dark',
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- CUSTOM SITES
-- User-defined sites to track beyond the 3 defaults
-- Max 10 custom sites per profile
-- Default 3 (youtube, instagram, x) are NOT stored here — they are hardcoded
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_sites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL,
  hostname    TEXT    NOT NULL,   -- e.g. 'reddit.com', 'tiktok.com', 'netflix.com'
  label       TEXT    NOT NULL,   -- display name, e.g. 'Reddit', 'TikTok'
  color       TEXT    NOT NULL DEFAULT '#94a3b8',  -- user-picked or auto-assigned
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, hostname)
);

-- ─────────────────────────────────────────
-- PINNED SITES
-- Max 3 pinned sites per profile — shown at top of popup for quick lookup
-- Can be any of the 3 default sites OR any custom site
-- Stored as ordered list: pin_slot 1, 2, 3
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pinned_sites (
  profile_id  INTEGER NOT NULL,
  pin_slot    INTEGER NOT NULL CHECK(pin_slot IN (1, 2, 3)),
  site_key    TEXT    NOT NULL,   -- 'youtube' | 'instagram' | 'x' | hostname of custom site
  PRIMARY KEY (profile_id, pin_slot),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- CONFIG
-- App-level key-value store
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);

INSERT OR IGNORE INTO config (key, value) VALUES
  ('schema_version',      '1'),
  ('active_profile_id',   ''),
  ('idle_threshold',      '60'),    -- seconds before timer pauses
  ('default_daily_max',   '12600'), -- 3.5 hours in seconds (3 × 3600 + 30 × 60)
  ('summary_start_hour',  '20'),    -- 8 PM — daily summary window opens
  ('summary_end_hour',    '23'),    -- 11 PM
  ('summary_end_minute',  '56');    -- 11:56 PM — daily summary window closes

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_profile_date
  ON sessions(profile_id, date);

CREATE INDEX IF NOT EXISTS idx_sessions_date
  ON sessions(date);
```

### First Launch Seed
```sql
INSERT INTO profiles (name, color, avatar) VALUES ('Default', '#F26157', 'D');

-- Default goal is 3.5 hours (12600 seconds) per site
-- This is the out-of-the-box value. User can change per site in popup.
INSERT INTO goals (profile_id, site, daily_max) VALUES
  (1, 'youtube',   12600),
  (1, 'instagram', 12600),
  (1, 'x',         12600);

INSERT INTO settings (profile_id, theme) VALUES (1, 'dark');

-- Default pins: all 3 default sites pinned in order
INSERT INTO pinned_sites (profile_id, pin_slot, site_key) VALUES
  (1, 1, 'youtube'),
  (1, 2, 'instagram'),
  (1, 3, 'x');

UPDATE config SET value = '1' WHERE key = 'active_profile_id';
```

### Key Queries
```sql
-- Today's usage for one profile
SELECT site, seconds FROM sessions
WHERE profile_id = ? AND date = DATE('now');

-- This week for one profile
SELECT site, date, seconds FROM sessions
WHERE profile_id = ? AND date >= DATE('now', '-6 days')
ORDER BY date;

-- General view — all profiles combined
SELECT site, date, SUM(seconds) AS total FROM sessions
WHERE date >= DATE('now', '-6 days')
GROUP BY site, date;

-- Profile comparison — today
SELECT p.name, s.site, SUM(s.seconds) AS total
FROM sessions s
JOIN profiles p ON s.profile_id = p.id
WHERE s.date = DATE('now')
GROUP BY p.name, s.site;

-- Upsert session tick (called every 5s by service worker)
INSERT INTO sessions (profile_id, site, date, seconds)
VALUES (?, ?, DATE('now'), ?)
ON CONFLICT(profile_id, site, date)
DO UPDATE SET seconds = seconds + excluded.seconds;

-- Check if goal is hit today
SELECT g.daily_max, COALESCE(s.seconds, 0) AS used
FROM goals g
LEFT JOIN sessions s
  ON s.profile_id = g.profile_id
  AND s.site = g.site
  AND s.date = DATE('now')
WHERE g.profile_id = ? AND g.site = ?;

-- Get all custom sites for a profile
SELECT id, hostname, label, color FROM custom_sites
WHERE profile_id = ? ORDER BY created_at;

-- Get count of custom sites (enforce max 10)
SELECT COUNT(*) FROM custom_sites WHERE profile_id = ?;

-- Add a custom site (call count check before this)
INSERT INTO custom_sites (profile_id, hostname, label, color)
VALUES (?, ?, ?, ?);

-- Remove a custom site (also cleans up sessions, goals, pins via CASCADE or manually)
DELETE FROM custom_sites WHERE profile_id = ? AND hostname = ?;
DELETE FROM goals WHERE profile_id = ? AND site = ?;
DELETE FROM pinned_sites WHERE profile_id = ? AND site_key = ?;

-- Get pinned sites for a profile (ordered by slot)
SELECT pin_slot, site_key FROM pinned_sites
WHERE profile_id = ? ORDER BY pin_slot;

-- Set a pin slot (upsert)
INSERT INTO pinned_sites (profile_id, pin_slot, site_key) VALUES (?, ?, ?)
ON CONFLICT(profile_id, pin_slot) DO UPDATE SET site_key = excluded.site_key;

-- Clear a pin slot
DELETE FROM pinned_sites WHERE profile_id = ? AND pin_slot = ?;
```

---

## TRACKED SITES

### Default Sites (hardcoded, always tracked, cannot be removed)

| Site | Key | URL patterns |
|---|---|---|
| YouTube | `youtube` | `*://*.youtube.com/*` |
| Instagram | `instagram` | `*://*.instagram.com/*` |
| X | `x` | `*://*.x.com/*`, `*://*.twitter.com/*` |

### Custom Sites (user-defined, max 10 per profile)

Custom sites are stored in the `custom_sites` table. The service worker loads them from the DB on startup and on any change.

**Adding a custom site:**
- User enters a URL or domain name (e.g. `reddit.com`, `https://www.tiktok.com`, `netflix.com`)
- Extension normalizes to bare hostname: strip `https://`, `www.`, trailing slashes
- Check `custom_sites` count — if already 10, show error: `"you've reached the 10 site limit"`
- Check for duplicates — hostname must be unique per profile
- Assign a label (user can type one, or auto-capitalize from hostname: `reddit.com` → `Reddit`)
- Assign a color — cycle through a preset palette if user doesn't pick one:
  ```js
  const AUTO_COLORS = [
    '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
    '#f97316', '#ec4899', '#14b8a6', '#a855f7',
    '#6366f1', '#84cc16'
  ];
  // pick by index: AUTO_COLORS[customSiteCount % AUTO_COLORS.length]
  ```

**Service worker site resolution — `getSiteFromUrl(url)`:**
```js
const DEFAULT_SITE_MAP = {
  'youtube.com':  'youtube',
  'instagram.com': 'instagram',
  'x.com':        'x',
  'twitter.com':  'x'
};

// customSites is loaded from DB on init and refreshed on storage change
// shape: [{ hostname: 'reddit.com', label: 'Reddit', color: '#8b5cf6' }, ...]
let customSites = [];

function getSiteFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace('www.', '');
    // Check defaults first
    for (const [domain, key] of Object.entries(DEFAULT_SITE_MAP)) {
      if (host === domain || host.endsWith('.' + domain)) return key;
    }
    // Check custom sites
    for (const cs of customSites) {
      const clean = cs.hostname.replace('www.', '');
      if (host === clean || host.endsWith('.' + clean)) return cs.hostname;
    }
  } catch (_) {}
  return null;
}
```

**`manifest.json` host_permissions** must be `<all_urls>` to support any user-added site:
```json
"host_permissions": ["<all_urls>"]
```

And `content_scripts` must also use `<all_urls>`:
```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content/content.js"],
  "run_at": "document_idle"
}]
```

---

## PHASE 1 — Chrome Extension MVP

### GOAL
**A fully working extension where tracking runs in the background, time is saved to the SQLite DB via OPFS, the popup shows today's time per site, and a soft visual warning appears when a daily goal is exceeded. Nothing more. Nothing less.**

ELSON must be able to install it in Chrome as an unpacked extension, open YouTube, spend time there, open the popup and see the time ticking, set a goal, hit it, and see the warning. That is the complete definition of done for Phase 1.

---

### File Structure

```
togltabs-extension/
├── manifest.json
├── package.json                  ← only if using npm build
├── lib/
│   ├── sql-wasm.js               ← sql.js WASM bundle
│   ├── sql-wasm.wasm             ← WASM binary
│   └── db.js                     ← DB wrapper (init, read, write)
├── background/
│   └── service-worker.js         ← tracking engine
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── content.js                ← injected into tracked sites
└── assets/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "togltabs",
  "version": "1.0.0",
  "description": "Track your time on YouTube, Instagram, and X.",
  "permissions": [
    "tabs",
    "idle",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "*://*.youtube.com/*",
    "*://*.instagram.com/*",
    "*://*.x.com/*",
    "*://*.twitter.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.youtube.com/*",
        "*://*.instagram.com/*",
        "*://*.x.com/*",
        "*://*.twitter.com/*"
      ],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icon16.png",
      "32": "assets/icon32.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  },
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["lib/sql-wasm.wasm"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

### db.js — Database Wrapper

This module handles all DB access. It must:
1. Initialize OPFS and load/create `togltabs.db`
2. Initialize the schema on first run
3. Seed the default profile on first run
4. Export helper functions used by the service worker and popup

```js
// lib/db.js
// Runs inside service worker context — use importScripts or ES module import

let db = null;

export async function initDB() {
  // Load sql.js
  const SQL = await initSqlJs({
    locateFile: file => chrome.runtime.getURL(`lib/${file}`)
  });

  // Access OPFS
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle('togltabs.db', { create: true });

  // Try to load existing DB bytes
  let dbBytes = null;
  try {
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > 0) dbBytes = new Uint8Array(buffer);
  } catch (_) {}

  db = dbBytes ? new SQL.Database(dbBytes) : new SQL.Database();

  // Run schema
  db.run(SCHEMA);

  // Seed if first time
  const profileCount = db.exec("SELECT COUNT(*) as c FROM profiles")[0]?.values[0][0];
  if (!profileCount || profileCount === 0) {
    seedDefaults();
  }

  return db;
}

export async function persistDB() {
  // Write DB bytes back to OPFS
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle('togltabs.db', { create: true });
  const writable = await fileHandle.createWritable();
  const data = db.export();
  await writable.write(data);
  await writable.close();
}

export function getActiveProfileId() {
  const result = db.exec("SELECT value FROM config WHERE key = 'active_profile_id'");
  return parseInt(result[0]?.values[0][0]) || 1;
}

export function setActiveProfileId(id) {
  db.run("UPDATE config SET value = ? WHERE key = 'active_profile_id'", [id]);
}

export function upsertSession(profileId, site, seconds) {
  db.run(`
    INSERT INTO sessions (profile_id, site, date, seconds)
    VALUES (?, ?, DATE('now'), ?)
    ON CONFLICT(profile_id, site, date)
    DO UPDATE SET seconds = seconds + excluded.seconds
  `, [profileId, site, seconds]);
}

export function getTodayUsage(profileId) {
  const result = db.exec(
    "SELECT site, seconds FROM sessions WHERE profile_id = ? AND date = DATE('now')",
    [profileId]
  );
  const rows = result[0]?.values || [];
  const usage = { youtube: 0, instagram: 0, x: 0 };
  rows.forEach(([site, seconds]) => { usage[site] = seconds; });
  return usage;
}

export function getGoals(profileId) {
  const result = db.exec(
    "SELECT site, daily_max FROM goals WHERE profile_id = ?",
    [profileId]
  );
  const rows = result[0]?.values || [];
  const goals = { youtube: 0, instagram: 0, x: 0 };
  rows.forEach(([site, max]) => { goals[site] = max; });
  return goals;
}

export function setGoal(profileId, site, dailyMaxSeconds) {
  db.run(`
    INSERT INTO goals (profile_id, site, daily_max) VALUES (?, ?, ?)
    ON CONFLICT(profile_id, site) DO UPDATE SET daily_max = excluded.daily_max
  `, [profileId, site, dailyMaxSeconds]);
}

export function getAllProfiles() {
  const result = db.exec("SELECT id, name, color, avatar FROM profiles ORDER BY id");
  return (result[0]?.values || []).map(([id, name, color, avatar]) => ({ id, name, color, avatar }));
}

export function createProfile(name, color = '#F26157', avatar = '') {
  db.run("INSERT INTO profiles (name, color, avatar) VALUES (?, ?, ?)", [name, color, avatar || name[0].toUpperCase()]);
  const newId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  db.run("INSERT INTO goals (profile_id, site, daily_max) VALUES (?, 'youtube', 0), (?, 'instagram', 0), (?, 'x', 0)", [newId, newId, newId]);
  db.run("INSERT INTO settings (profile_id, theme) VALUES (?, 'dark')", [newId]);
  return newId;
}

export function getWeeklyData(profileId) {
  const result = db.exec(`
    SELECT site, date, seconds FROM sessions
    WHERE profile_id = ? AND date >= DATE('now', '-6 days')
    ORDER BY date
  `, [profileId]);
  return result[0]?.values || [];
}
```

---

### service-worker.js — Tracking Engine

Rules:
- Timer ticks every **5 seconds** using `chrome.alarms` (repeating alarm named `"tick"`)
- Only counts time when the tracked tab is the **active tab** in the **focused window**
- Pauses when Chrome reports idle state (threshold: 60 seconds from config)
- Writes to DB every tick, persists DB to OPFS every **30 seconds**
- On startup, re-initializes DB from OPFS

```js
// background/service-worker.js
import { initDB, persistDB, upsertSession, getActiveProfileId, getTodayUsage, getGoals } from '../lib/db.js';

let activeSite = null;         // 'youtube' | 'instagram' | 'x' | null
let isIdle = false;
let ticksSinceLastPersist = 0;
const TICK_SECONDS = 5;
const PERSIST_EVERY_N_TICKS = 6; // every 30s

const SITE_MAP = {
  'youtube.com': 'youtube',
  'instagram.com': 'instagram',
  'x.com': 'x',
  'twitter.com': 'x'
};

function getSiteFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace('www.', '');
    for (const [domain, site] of Object.entries(SITE_MAP)) {
      if (host.includes(domain)) return site;
    }
  } catch (_) {}
  return null;
}

async function updateActiveSite() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  activeSite = tab ? getSiteFromUrl(tab.url) : null;
}

chrome.runtime.onInstalled.addListener(async () => {
  await initDB();
  chrome.alarms.create('tick', { periodInMinutes: TICK_SECONDS / 60 });
});

chrome.runtime.onStartup.addListener(async () => {
  await initDB();
  chrome.alarms.create('tick', { periodInMinutes: TICK_SECONDS / 60 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'tick') return;
  if (isIdle || !activeSite) return;

  const profileId = getActiveProfileId();
  upsertSession(profileId, activeSite, TICK_SECONDS);

  ticksSinceLastPersist++;
  if (ticksSinceLastPersist >= PERSIST_EVERY_N_TICKS) {
    await persistDB();
    ticksSinceLastPersist = 0;
  }
});

chrome.tabs.onActivated.addListener(updateActiveSite);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') updateActiveSite();
});
chrome.windows.onFocusChanged.addListener(updateActiveSite);

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((state) => {
  isIdle = state !== 'active';
});
```

---

### POPUP STATES

The popup has **three distinct states** depending on context. The service worker detects which state applies and the popup renders accordingly. All three states share the same `width: 340px` container and the same header (profile pill + "Open Dashboard" button).

---

#### STATE 1 — Safe State (user is on a non-tracked site)

Triggered when: the current tab is NOT YouTube, Instagram, or X.

```
┌─────────────────────────────────────┐
│  [D] Default          [Dashboard →] │
├─────────────────────────────────────┤
│                                     │
│       you are safe for now          │  ← muted-foreground, small caps
│                                     │
│  YouTube                    1h 12m  │
│  [████████░░░░░░░░░░░░░░░░]  34%    │  ← sharp corners (border-radius: 0)
│                                     │
│  Instagram                    22m   │
│  [███░░░░░░░░░░░░░░░░░░░░░]  10%    │
│                                     │
│  X                            45m   │
│  [█████░░░░░░░░░░░░░░░░░░░]  21%    │
│                                     │
│  total today: 2h 19m                │  ← sum of all three
└─────────────────────────────────────┘
```

**Progress bar rules:**
- `border-radius: 0` — sharp corners, no rounding at all
- Bar width = `(seconds_used / daily_max) * 100%`, capped at 100%
- Bar color: site color (YouTube red / Instagram pink / X white|black)
- Background track color: `--muted`
- Bar height: `6px`
- If `used >= daily_max`: bar color switches to `#F26157` (brand coral) and a tiny `"goal reached"` chip appears to the right of the time

---

#### STATE 2 — Active State (user is ON a tracked site)

Triggered when: the current tab IS YouTube, Instagram, or X.

```
┌─────────────────────────────────────┐
│  [D] Default          [Dashboard →] │
├─────────────────────────────────────┤
│                                     │
│   ❝ Every minute you spend here     │  ← random quote, italic
│     is a minute not spent           │
│     becoming who you want to be. ❞  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │       YOUTUBE                 │  │  ← active site name
│  │                               │  │
│  │      [donut chart]            │  │  ← SVG donut
│  │         34%                   │  │  ← % of daily goal used
│  │     1h 12m / 3h 30m           │  │  ← used / goal
│  │                               │  │
│  │   ⏱  00:04:32  (live clock)   │  │  ← time on site THIS SESSION
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Donut chart rules:**
- Pure SVG, no library
- Circle stroke = site color (YouTube red / Instagram pink / X white)
- Track stroke = `--muted`
- Percentage label in center: large, `--font-mono`
- If `used >= daily_max`: stroke switches to `#F26157`, label says `"goal reached"`

**Live clock rules:**
- Shows time elapsed on the current site **this session** (since the tab was first activated today — not total daily time, that's the donut)
- Counts up every second using `setInterval` inside `popup.js`
- Format: `HH:MM:SS`
- Resets to `00:00:00` if user navigates away and comes back (session clock, not daily clock)
- The service worker tracks `sessionStartTime` per site per day in memory (not DB) — popup reads it via message

**Quote rules:**
- Pulled from a hardcoded array in `popup.js`
- One random quote per popup open — does NOT change while popup is open
- Italic, muted-foreground color, slightly smaller font
- 20 quotes minimum in the array (see quote list below)

---

#### STATE 3 — End of Day Summary (8:00 PM – 11:56 PM)

Triggered when: local time is between 20:00 and 23:56 AND the user opens the popup on ANY site (tracked or not). This state overrides STATE 1 and STATE 2 during the window.

```
┌─────────────────────────────────────┐
│  [D] Default          [Dashboard →] │
├─────────────────────────────────────┤
│                                     │
│   today's recap                     │  ← section label, small caps
│                                     │
│   total time on platforms           │
│          4h 19m                     │  ← big, centered, --font-mono
│                                     │
│  YouTube      1h 12m   [████░░]     │
│  Instagram      22m    [█░░░░░]     │
│  X              45m    [██░░░░]     │
│                                     │
│  ─────────────────────────────────  │
│  you spent 4h 19m today.            │  ← soft summary sentence
│  your goal was 3h 30m per site.     │
│                                     │
└─────────────────────────────────────┘
```

**Rules:**
- Sharp-cornered bars same as STATE 1
- Total time = sum of all 3 sites for today
- Summary sentence uses actual numbers
- If total < combined goal: sentence ends with `"not bad."` in brand coral
- If total >= combined goal: sentence ends with `"tomorrow is a new day."` in muted-foreground
- End of day state does NOT block — user can still browse normally

---

### popup/popup.js — State Detection Logic

```js
// On popup load:
// 1. Get current tab URL from chrome.tabs.query
// 2. Get current local hour + minute
// 3. Determine state:

const hour = new Date().getHours();
const minute = new Date().getMinutes();
const isEndOfDay = (hour >= 20) && !(hour === 23 && minute > 56);
const isTrackedSite = getSiteFromUrl(currentTab.url) !== null;

if (isEndOfDay) {
  renderEndOfDaySummary();
} else if (isTrackedSite) {
  renderActiveSiteView();
} else {
  renderSafeView();
}
```

---

### Quotes — Two Separate Arrays

There are two quote arrays. They are never mixed.

- `QUOTES_ACTIVE` — shown in **STATE 2** (user is on YouTube, Instagram, or X). Tone: direct, a little confrontational, honest. Designed to make the user aware of what they're doing without being preachy.
- `QUOTES_SAFE` — shown in **STATE 1** (user is on a non-tracked site). Tone: encouraging, forward-looking, motivational. Designed to affirm that being away from the platforms is the right move.

One random quote per popup open. Does not change while the popup is open.

---

```js
// STATE 2 — shown when user is actively on YouTube, Instagram, or X
const QUOTES_ACTIVE = [
  "Every minute here is borrowed from something that actually matters.",
  "You opened this tab. You can close it too.",
  "The algorithm is designed to outlast your willpower.",
  "Awareness is the first step. Closing the tab is the second.",
  "Your attention is the most valuable thing you own.",
  "This feed will still be here. Your goals might not wait.",
  "You're not bored. You're avoiding something.",
  "The best creators spend more time making than consuming.",
  "Scrolling is the illusion of doing something.",
  "One more minute here is one less minute on what you said mattered.",
  "They optimized this app to keep you. Don't let them win.",
  "You came here for one thing. You're still here for another reason.",
  "Rest is valid. Mindless consumption is different from rest.",
  "Your future self is watching how you spend today.",
  "The person you want to become doesn't live on this screen.",
  "Discipline is choosing your future self over your present mood.",
  "Distraction is not relaxation. Know the difference.",
  "Time spent here is a vote for who you're becoming.",
  "Close this tab. Go build something.",
  "You already know what you should be doing.",
  "The scroll never ends. But your day does.",
  "Awareness without action is just guilt. Act.",
  "Every great person you admire has one thing in common: they stopped scrolling.",
  "You've seen this content before. It just has a new face.",
  "The app is free because your time is the product.",
  "Nothing on this feed is as urgent as it feels.",
  "You didn't come here to feel better. You came here to feel nothing.",
  "The version of you that wins is not on this page.",
  "They have a thousand engineers making sure you don't leave. Leave.",
  "What were you supposed to be doing right now?",
  "This is the most expensive free app you'll ever use.",
  "You are not relaxing. You are postponing.",
  "The algorithm knows your weaknesses better than you do. That's the problem.",
  "In ten years you will not remember a single thing you saw here today.",
  "Curiosity should drive you to build things, not just consume them.",
  "You are the product. Act accordingly.",
  "The content is infinite. Your twenties are not.",
  "Someone out there is building the thing you keep saying you'll build.",
  "Close this. Open something you're proud to have open.",
  "Every scroll is a small surrender.",
  "You said five more minutes an hour ago.",
  "The feed was designed by someone who doesn't use it themselves.",
  "There is no finish line here. That's the point.",
  "Time is the only currency that can't be earned back.",
  "What would the version of you from five years ago think of this moment?",
];

// STATE 1 — shown when user is on a safe (non-tracked) site
const QUOTES_SAFE = [
  "You're not there. That already counts for something.",
  "The best thing you did today might be this — staying away.",
  "You gave your attention to something worth having it.",
  "Every hour off the feed is an hour that belonged to you.",
  "Being here instead of there is a small act of discipline.",
  "Focus is rare. You're practicing it right now.",
  "The work you do when nobody's watching is the work that builds you.",
  "You chose the harder thing. That's the whole game.",
  "Less noise, more signal. You're on the right side of that.",
  "Your best ideas don't come from a feed. They come from moments like this.",
  "Momentum is quiet. Keep going.",
  "The version of you that exists in ten years is being built right now.",
  "Staying off is not willpower. It's wisdom.",
  "Real rest looks like presence. You're present.",
  "You're building something. Even if it doesn't feel like it yet.",
  "Every distraction you ignored today compounded into something.",
  "The discipline to stay away is the same discipline that makes great work.",
  "Your attention is somewhere meaningful. Don't waste it.",
  "Being bored without reaching for the phone is a superpower.",
  "The people who change things spend less time watching and more time doing.",
  "This is what it feels like to be in control.",
  "The gap between who you are and who you want to be closes here, not there.",
  "Deep work requires deep quiet. You're in it.",
  "You can't pour from an empty cup. But you can't fill it from a feed either.",
  "The most productive thing you can do is stay exactly where you are.",
  "Right now someone is scrolling through what they should be building.",
  "Your brain is clearer than it would have been. Use it.",
  "Creation and consumption can't happen at the same time.",
  "The best day you'll ever have will not start with a scroll.",
  "Presence is a practice. You're practicing.",
  "You are not missing anything. You are building something.",
  "Silence is not emptiness. It is space for thought.",
  "The people you admire most have mastered this exact moment.",
  "Not every hour needs to be productive. But this one can be.",
  "You gave your time to something real today.",
  "Progress is not always visible. It's always real.",
  "The algorithm can't reach you here. Good.",
  "Every moment of focus is a brick. Keep laying them.",
  "You don't need to be inspired. You need to keep going.",
  "The hardest part is always staying. You stayed.",
  "Small choices made consistently become who you are.",
  "You are practicing the life you want to have.",
  "Less time on there means more time for this. And this matters.",
  "Your future self will thank you for this hour.",
  "Nothing about a feed will ever feel as good as finishing something.",
];
```

---

### PINNED SITES — Quick Lookup Strip

Pinned sites appear as a compact strip at the **very top of the popup**, above everything else, visible in ALL THREE states. It is always there — a one-glance check without opening the full popup or going to the dashboard.

```
┌─────────────────────────────────────┐
│  [YT] 1h 12m  [IG] 22m  [X] 45m    │  ← pinned strip — always visible
├─────────────────────────────────────┤
│  [D] Default          [Dashboard →] │  ← profile header
│  ...rest of state content...        │
└─────────────────────────────────────┘
```

**Pinned strip rules:**
- 3 slots. Each slot shows: site icon/emoji or first 2 chars of label + today's time for that site
- Tapping a pinned slot does nothing (it's read-only display, not a link)
- If a slot is empty (user removed a pin), it shows a `[+]` placeholder that opens the manage sites screen
- Strip uses `--muted` background, `--muted-foreground` text, no border
- When a site has exceeded its goal: its time label turns `#F26157`

**Managing pins:**
- In the popup's "Manage Sites" screen, each site row (default or custom) has a pin toggle
- Max 3 pins enforced in UI — if 3 are already pinned, other toggles are disabled with tooltip: `"unpin one to add another"`
- Pin order = the order the user pinned them (slot 1 = first pinned, etc.)
- User can drag to reorder pins inside the manage screen (simple up/down arrows are fine if drag is complex)

---

### MANAGE SITES SCREEN

A sub-screen inside the popup (not a new tab). Accessed via a `"Manage sites"` link at the bottom of STATE 1 and STATE 3, or via a settings icon.

```
┌─────────────────────────────────────┐
│  ← Manage Sites                     │
├─────────────────────────────────────┤
│  DEFAULT                            │
│  ● YouTube     📌 pinned  [slot 1]  │
│  ● Instagram   📌 pinned  [slot 2]  │
│  ● X           📌 pinned  [slot 3]  │
├─────────────────────────────────────┤
│  CUSTOM  (2 / 10)                   │
│  ● Reddit      📌 [pin]   [remove]  │
│  ● TikTok      📌 [pin]   [remove]  │
├─────────────────────────────────────┤
│  [+ Add a site]                     │  ← input appears inline below
└─────────────────────────────────────┘
```

**Add site flow (inline, no new screen):**
1. User clicks `[+ Add a site]`
2. A small input row appears: `[ domain input ] [ label input ] [ Add ]`
3. On submit: normalize hostname → validate → check count → insert to DB → refresh list
4. If count is already 10: button is replaced with `"10/10 — remove a site to add more"` in muted text
5. Error states (inline, small): `"already tracking this site"` / `"invalid domain"` / `"limit reached"`

**Remove site flow:**
1. User clicks `[remove]` on a custom site
2. Inline confirm appears: `"remove reddit.com? its data stays." [confirm] [cancel]`
3. On confirm: delete from `custom_sites`, `goals`, `pinned_sites` for this profile
4. Note in confirm: `"its data stays"` — session history is NOT deleted, only the tracking rule is removed

**Popup dimensions:** `width: 340px`. Height is auto. Max-height: `480px` with internal scroll if needed.

**Shared header (always visible):**
- Left: profile avatar pill (single char in a circle, profile color as background)
- Right: "Dashboard →" text button

**Time format rule (global):** Always `Xh Ym` or just `Ym` if under 1 hour. Never raw seconds.

---

### content/content.js

Minimal. Only purpose: detect when user becomes active/inactive on the page and notify service worker.

```js
// Send focus/blur events to service worker so it can pause/resume
document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: 'PAGE_VISIBILITY',
    visible: document.visibilityState === 'visible'
  });
});
```

---

### Phase 1 Checklist (all must pass before approval)

- [ ] Extension loads in Chrome without errors (unpacked via `chrome://extensions`)
- [ ] Opening YouTube, Instagram, or X increments time in the DB
- [ ] Opening a custom tracked site increments time correctly
- [ ] Popup on non-tracked site shows STATE 1 — "you are safe for now" with sharp-cornered bars
- [ ] Popup on tracked site shows STATE 2 — quote + donut chart + live session clock
- [ ] Popup between 8 PM and 11:56 PM shows STATE 3 — end of day recap with total time
- [ ] Pinned strip shows at top of popup in ALL three states
- [ ] Pinned strip time label turns coral when goal is exceeded for that site
- [ ] Default daily goal is 3h 30m (12600 seconds) per site out of the box
- [ ] Donut chart renders correctly in SVG with correct percentage
- [ ] Live session clock counts up every second while popup is open
- [ ] Random quote changes each time popup is opened (not while open)
- [ ] Sharp-cornered bars (border-radius: 0) render with correct fill percentage
- [ ] Bar and donut switch to brand coral `#F26157` when goal is exceeded
- [ ] Goals can be changed per site in popup
- [ ] Manage Sites screen opens correctly from popup
- [ ] User can add a custom site (hostname + label) — max 10 enforced
- [ ] Adding a duplicate hostname shows inline error
- [ ] User can remove a custom site with inline confirmation
- [ ] Removed custom site stops being tracked immediately
- [ ] Pins can be set and cleared per slot — max 3 enforced
- [ ] Pin strip updates immediately when pins are changed
- [ ] Timer pauses when Chrome is idle
- [ ] Timer pauses when tab is not focused
- [ ] DB persists after Chrome restart (data survives, custom sites survive)
- [ ] No console errors during normal use

---

## PHASE 2 — Electron Desktop App

**Wait for ELSON's approval on Phase 1 before starting this phase.**

### GOAL
A lightweight Electron desktop app that reads the **same OPFS database** as the extension and shows the full analytics dashboard with profile switching, weekly charts, a monthly heatmap, and profile comparison. The Electron app is read-only in v1 — it does not write to the DB, it only reads and visualizes.

> Note: OPFS is browser-native. The Electron app will access the data via a different path. The recommended approach is to **export the DB** from the extension as a file (JSON or `.db` dump) to a known location, and the Electron app reads from there. Alternatively, the extension can be configured to also write a shadow copy to a user-chosen folder that the Electron app watches. Discuss with ELSON which approach to implement.

---

### File Structure

```
togltabs-electron/
├── package.json
├── electron/
│   ├── main.js             ← Electron main process
│   └── preload.js          ← context bridge
├── renderer/
│   ├── index.html          ← dashboard shell
│   ├── dashboard.js        ← dashboard logic
│   └── dashboard.css
└── lib/
    └── db-reader.js        ← reads from exported DB file
```

---

### Dashboard Views

All views respect the active profile filter (dropdown at top) plus a "All Profiles" aggregate option.

#### View 1 — Today
- Horizontal progress bars per site (YouTube / Instagram / X)
- Bar fills to `used/daily_max`. If no goal set, bar fills relative to highest usage
- `"goal reached"` label in brand coral when exceeded
- Total time today at the top

#### View 2 — This Week
- Grouped bar chart (7 days × 3 sites)
- X axis: Mon–Sun
- Y axis: hours
- Each site has its color (red/pink/white|black)
- Use Chart.js or a lightweight canvas solution

#### View 3 — Monthly Heatmap
- Calendar grid for current month
- Each day cell is colored by total time that day
- Intensity scale: `0 → light muted`, `high → brand coral`
- Clicking a day shows a tooltip with per-site breakdown

#### View 4 — Profile Comparison
- Side-by-side bar chart: one group per profile
- Shows today's or this week's usage per site per profile
- Only visible when "All Profiles" is selected in the filter

---

### Phase 2 Checklist

- [ ] Electron app opens without errors
- [ ] Dashboard loads and shows data from the exported DB
- [ ] Profile dropdown works (filters all charts)
- [ ] "All Profiles" aggregate view works
- [ ] Today view renders correctly
- [ ] Weekly bar chart renders correctly
- [ ] Monthly heatmap renders correctly
- [ ] Profile comparison view renders correctly
- [ ] App window is resizable and minimum size is `900×600`
- [ ] Dark mode default, light mode toggle works

---

## PHASE 3 — Polishing

**Wait for ELSON's approval on Phase 2 before starting this phase.**

### GOAL
Make both the extension and the Electron app feel finished, fast, and visually sharp. No new core features — only refinement.

---

### Extension Polish
- Smooth animated time counter in popup (counts up in real-time)
- Profile switcher as avatar pills in popup header (click to switch)
- Create new profile flow inside popup (name + color picker + avatar char)
- Delete profile with confirmation
- Settings page inside popup: idle threshold, theme toggle
- Export data button (downloads JSON of all sessions for active profile)
- Tooltip on goal input explaining the format (`e.g. 1h 30m or 90m`)

### Electron App Polish
- Sidebar navigation (Today / Week / Month / Profiles / Settings)
- Smooth chart animations on load and on filter change
- Keyboard shortcut `Ctrl+R` to refresh data
- Auto-refresh every 60 seconds if app is open
- Export to CSV per profile per date range
- About page with version, JEDL branding, and DB file path display
- App icon in taskbar (use togltabs icon)
- Minimize to system tray option

### Phase 3 Checklist
- [ ] All extension flows are smooth with no janky reloads
- [ ] Profile management fully works (create, switch, delete)
- [ ] Export works and produces valid JSON/CSV
- [ ] Electron app has sidebar navigation
- [ ] Charts animate on load
- [ ] Auto-refresh works in Electron
- [ ] No visual regressions from Phase 1 or Phase 2
- [ ] Both apps feel cohesive — same design language

---

## GENERAL RULES FOR THE AI DEVELOPER

1. **Phase 1 ships full core value.** Tracking + DB + popup + goal warnings must all work together before anything else is touched.
2. **Use vanilla JS** for the extension (no React, no bundler unless absolutely necessary for sql.js). Keep it simple.
3. **Use the design system variables exactly.** Do not invent new colors or fonts.
4. **Default theme is dark.**
5. **Never use localStorage.** All persistence goes through OPFS + sql.js.
6. **Never block the user.** Goals are soft — warning only, never locks or interruptions.
7. **Always use `chrome.alarms`** for the tick loop, not `setInterval` (service workers can be suspended).
8. **Persist to OPFS every 30 seconds**, not every tick — to avoid excessive disk writes.
9. **Time format is always human-readable:** `1h 32m` not `5520 seconds`.
10. **Do not start Phase 2 until ELSON explicitly approves Phase 1.**
11. **Do not start Phase 3 until ELSON explicitly approves Phase 2.**
12. **Ask ELSON before making any architectural decisions not covered in this document.**

---

## QUICK REFERENCE

| Thing | Value |
|---|---|
| Manifest version | 3 |
| Tick interval | 5 seconds |
| Persist interval | 30 seconds |
| Idle threshold | 60 seconds |
| Default daily goal | 12600 seconds (3h 30m) per site |
| End of day window | 8:00 PM – 11:56 PM local time |
| DB file name | `togltabs.db` |
| DB location | OPFS (Chrome internal sandbox) |
| sql.js version | 1.10.2 |
| Default theme | dark |
| Brand color | `#F26157` |
| Primary blue | `rgb(59, 130, 246)` |
| Font | Plus Jakarta Sans |
| Tracked sites (default) | youtube.com, instagram.com, x.com, twitter.com |
| Custom sites | max 10 per profile, stored in `custom_sites` table |
| Pinned sites | max 3, stored in `pinned_sites` table, visible in all popup states |
| host_permissions | `<all_urls>` (required for custom site support) |
| Popup width | 340px |
| Popup states | 3: safe / active site / end of day |
| Progress bar radius | 0 (sharp corners everywhere) |
| Donut chart | Pure SVG, no library |
| Quotes (active site) | 45 in `QUOTES_ACTIVE`, random per open |
| Quotes (safe site) | 45 in `QUOTES_SAFE`, random per open |

---

*Built by ELSON — Just Elson Development Labs*