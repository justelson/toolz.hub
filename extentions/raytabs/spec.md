
# RayTabs — Full Build Spec
### AI Developer Prompt & Phase Plan
**Written for:** opencode / minimax2.5 / GPT-4o / Claude 3.5 Sonnet
**Author:** ELSON (Just Elson Development Labs)

### HOW TO READ THIS DOCUMENT
You are building **RayTabs** — a Chrome browser extension that acts as a Spotlight/Raycast-style quick search for the browser. It injects a floating search bar into the active webpage when triggered via a keyboard shortcut, allowing the user to search through open tabs, use "bangs" (like `!yt`) to search specific sites, or fallback to a default Google search.

* **Build strictly by phase.** Do not move to the next phase until ELSON approves the current one.
* Each phase has a GOAL. The goal must be fully met — not partially — before moving on.
* Phase 1 is the only phase that must ship the complete core value: injecting the UI via shortcut and routing the search correctly end-to-end.

### PRODUCT OVERVIEW
* **Name:** RayTabs
* **Type:** Chrome Extension (Manifest V3)
* **Storage:** `chrome.storage.local`. No external databases. Everything is local to the browser.
* **Permissions:** `tabs`, `storage`, `scripting`, `commands`. `host_permissions` set to `<all_urls>` (required to inject the Spotlight UI into any active webpage).
* **Core value (non-negotiable in Phase 1):** Pressing `Alt+S` injects a large, centered search bar into the current webpage. Typing a query instantly searches open tabs (switching to them if found), executes a custom bang (opening a new tab), or falls back to Google.

### DESIGN SYSTEM
**Strict UI Rule:** NO EMOJIS. Use only clean SVG icons (like Lucide) for any visual indicators (e.g., a trash can for delete, an external link arrow for bangs).

Use the following Tailwind CSS/CSS variables exactly. Do not invent a new theme. Ensure your frontend setup utilizes these exact variables. Default theme is **dark**.

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(253, 253, 253);
  --foreground: rgb(0, 0, 0);
  --card: rgb(253, 253, 253);
  --card-foreground: rgb(0, 0, 0);
  --popover: rgb(252, 252, 252);
  --popover-foreground: rgb(0, 0, 0);
  --primary: rgb(112, 51, 255);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(237, 240, 244);
  --secondary-foreground: rgb(8, 8, 8);
  --muted: rgb(245, 245, 245);
  --muted-foreground: rgb(82, 82, 82);
  --accent: rgb(226, 235, 255);
  --accent-foreground: rgb(30, 105, 220);
  --destructive: rgb(229, 75, 79);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(231, 231, 238);
  --input: rgb(235, 235, 235);
  --ring: rgb(0, 0, 0);
  --font-sans: Plus Jakarta Sans, sans-serif;
  --font-serif: Lora, serif;
  --font-mono: IBM Plex Mono, monospace;
  --radius: 0.55rem;
  --tracking-normal: -0.025em;
  --spacing: 0.27rem;
}

.dark {
  --background: rgb(26, 27, 30);
  --foreground: rgb(240, 240, 240);
  --card: rgb(34, 35, 39);
  --card-foreground: rgb(240, 240, 240);
  --popover: rgb(34, 35, 39);
  --popover-foreground: rgb(240, 240, 240);
  --primary: rgb(140, 92, 255);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(42, 44, 51);
  --secondary-foreground: rgb(240, 240, 240);
  --muted: rgb(42, 44, 51);
  --muted-foreground: rgb(160, 160, 160);
  --accent: rgb(30, 41, 59);
  --accent-foreground: rgb(121, 192, 255);
  --destructive: rgb(248, 113, 113);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(51, 53, 58);
  --input: rgb(51, 53, 58);
  --ring: rgb(140, 92, 255);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; letter-spacing: var(--tracking-normal); }
}
```

### DATABASE / STORAGE SCHEMA
Storage: `chrome.storage.local`. 

**Initial Seed (On Install):**
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      bangs: {
        "!yt": "https://www.youtube.com/results?search_query=",
        "!g": "https://www.google.com/search?q=",
        "!r": "https://www.reddit.com/search/?q=",
        "!gpt": "https://chatgpt.com/?q="
      },
      usageCount: 0,
      theme: "dark"
    });
  }
});
```

### CORE SEARCH LOGIC & ROUTING
When the user presses `Enter` in the Spotlight bar, `content.js` sends the query to `service-worker.js`. The background script strictly processes the string in this exact order:

1.  **Check for Bangs (!):**
    * Split query by space. Check if `words[0]` exists in the `bangs` object.
    * If yes: Extract `words.slice(1).join(" ")` as the search term. Execute `chrome.tabs.create()`. End process.
2.  **Search Open Tabs:**
    * If no bang: Call `chrome.tabs.query({ currentWindow: true })`.
    * Filter tabs: Does the query exist (case-insensitive) in `tab.title` OR `tab.url`?
    * If match found: Execute `chrome.tabs.update(match.id, { active: true })`. End process.
3.  **Fallback to Google:**
    * If no tabs match: Execute `chrome.tabs.create({ url: "https://www.google.com/search?q=" + encodeURIComponent(query) })`. End process.

---

### PHASE 1 — Chrome Extension MVP
**GOAL**
A fully working extension where the `Alt+S` shortcut injects the Spotlight UI, takes user input, and correctly routes the search via the background script.

**File Structure**
```text
raytabs-extension/
├── manifest.json
├── background/
│   └── service-worker.js     ← routing logic, keyboard command listener
├── content/
│   ├── content.js            ← injects UI, listens to background toggle
│   └── content.css           ← Tailwind + custom variables
└── assets/
    └── icon128.png
```

**manifest.json rules:**
Must include `"commands": { "toggle-search": { "suggested_key": { "default": "Alt+S", "mac": "Alt+S" } } }`. 

**UI Injection Rules (`content.js`):**
* Wrapper `div` must have `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647;`.
* Wrapper background must use `var(--background)` with an opacity of `0.8` and `backdrop-filter: blur(8px)`.
* Search input must be centered, about 25% down from the top, large text (`text-2xl`), using `--card` for its background and `--border` for its stroke.
* MUST automatically `.focus()` the input when toggled open.
* MUST clear the input value when toggled closed or after `Enter` is pressed.

**Phase 1 Checklist (all must pass before approval)**
* [ ] Extension loads in Chrome without errors (unpacked via `chrome://extensions`).
* [ ] Pressing `Alt+S` on a normal webpage dims the screen and shows the search bar.
* [ ] The search input automatically gains focus when opened.
* [ ] Pressing `Escape` hides the search bar and clears the input.
* [ ] Typing `!yt test` and hitting enter opens a new YouTube search tab.
* [ ] Typing the name of an already open tab switches focus to that tab.
* [ ] Typing a random query opens a new Google search tab.
* [ ] `usageCount` increments in `chrome.storage.local` every time a search is executed.

---

### PHASE 2 — The Dashboard Popup
Wait for ELSON's approval on Phase 1 before starting this phase.

**GOAL**
Create the extension toolbar popup (`popup.html`). A sleek dashboard to view `usageCount` and manage custom bangs.

**File Structure Additions**
```text
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
```

**Popup States & Layout:**
Width: `320px`. Height: `auto`.
* **Header:** Title "RayTabs" and a muted stat: "Total Searches: [count]".
* **Bang List:** A grid/list of active bangs. Each row shows the bang (`!yt`), the domain it searches, and a small SVG trash icon to delete it.
* **Add Bang Form:** Fixed at the bottom. Two inputs (`Trigger`, `URL`) and a simple "Add" button.

**Phase 2 Checklist**
* [ ] Clicking the extension icon opens the popup.
* [ ] `usageCount` displays the correct number from storage.
* [ ] List of current bangs loads correctly.
* [ ] User can successfully add a new bang (saved to storage).
* [ ] Newly added bang immediately works in the Spotlight UI without reloading the extension.
* [ ] User can delete a bang.
* [ ] Popup styling matches the Tailwind Design System.
* [ ] ZERO emojis used in the popup interface. SVG icons only.

---

### PHASE 3 — Polishing
Wait for ELSON's approval on Phase 2 before starting this phase.

**GOAL**
Refine the UX. Make the Spotlight bar feel like a native OS feature.

**Phase 3 Checklist**
* [ ] Update tab search to fuzzy search (e.g., searching "git" matches a tab titled "GitHub").
* [ ] Add a smooth CSS animation to `content.css`: the Spotlight bar scales from `0.95` to `1` and fades in over `150ms` when opened.
* [ ] Add Command Memory: pressing `ArrowUp` inside the empty Spotlight input recalls the last searched term.
* [ ] Ensure the UI handles very long search queries gracefully (no text overflow breaking the input box).

---

### GENERAL RULES FOR THE AI DEVELOPER
* **Phase 1 ships full core value.** The Spotlight injection and search routing must work perfectly before touching the popup dashboard.
* **Use vanilla JS.** No React, Vue, or bundlers (unless absolutely necessary for Tailwind processing, but output to vanilla HTML/CSS/JS). Keep it incredibly lightweight.
* **Use the design system variables exactly.** Do not invent new colors or fonts. 
* **Never use emojis.** Use SVG icons (Lucide or Heroicons).
* **Z-Index is sacred.** The Spotlight wrapper must use `z-index: 2147483647` to ensure it overlays everything on the host site.
* **Do not start Phase 2 until ELSON explicitly approves Phase 1.**
* **Do not start Phase 3 until ELSON explicitly approves Phase 2.**
* **Ask ELSON before making any architectural decisions not covered in this document.**

### QUICK REFERENCE
| Thing | Value |
| :--- | :--- |
| Manifest version | 3 |
| Trigger Shortcut | Alt+S |
| Storage | `chrome.storage.local` |
| Default Bangs | `!yt`, `!g`, `!r`, `!gpt` |
| Font | Plus Jakarta Sans / IBM Plex Mono |
| Default theme | dark |
| Spotlight Z-Index | 2147483647 |
| Strict Rule | Icons only. Zero Emojis. |
| Built by | ELSON — Just Elson Development Labs |