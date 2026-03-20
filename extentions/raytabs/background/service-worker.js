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
      theme: "light",
      lastSearch: "",
      recentSearches: []
    });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-search") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search") {
    handleSearch(request.query).then(sendResponse);
    return true;
  }
  if (request.action === "suggest") {
    handleSuggest(request.query, request.category).then(sendResponse);
    return true;
  }
  if (request.action === "open-suggestion") {
    handleOpenSuggestion(request.item, sender).then(sendResponse);
    return true;
  }
  if (request.action === "search-url") {
    chrome.tabs.create({ url: request.url }).then(sendResponse);
    return true;
  }
});

async function handleSearch(query) {
  const { bangs, usageCount } = await chrome.storage.local.get(["bangs", "usageCount"]);
  const normalizedQuery = query.trim();

  if (isLikelyUrl(normalizedQuery)) {
    await chrome.tabs.create({ url: normalizeUrl(normalizedQuery) });
    await chrome.storage.local.set({ usageCount: usageCount + 1, lastSearch: normalizedQuery });
    return { success: true, action: "url" };
  }
  
  const words = normalizedQuery.split(/\s+/);
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  
  if (bangs[firstWord] || bangs[lastWord]) {
    const bangKey = bangs[firstWord] ? firstWord : lastWord;
    const searchTerm = bangKey === firstWord
      ? words.slice(1).join(" ")
      : words.slice(0, -1).join(" ");
    const url = bangs[bangKey] + encodeURIComponent(searchTerm);
    await chrome.tabs.create({ url });
    await chrome.storage.local.set({ usageCount: usageCount + 1, lastSearch: query });
    return { success: true, action: "bang" };
  }
  
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const queryLower = query.toLowerCase();
  
  for (const tab of tabs) {
    const title = tab.title?.toLowerCase() || "";
    const url = tab.url?.toLowerCase() || "";
    
    if (title.includes(queryLower) || url.includes(queryLower)) {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.storage.local.set({ usageCount: usageCount + 1, lastSearch: query });
      return { success: true, action: "tab", tabId: tab.id };
    }
  }
  
  const googleUrl = "https://www.google.com/search?q=" + encodeURIComponent(query);
  await chrome.tabs.create({ url: googleUrl });
  await chrome.storage.local.set({ usageCount: usageCount + 1, lastSearch: query });
  await recordRecentSearch(query);
  return { success: true, action: "google" };
}

async function handleSuggest(query, category = "all") {
  const trimmed = query.trim();
  if (!trimmed) return { tabs: [], history: [] };

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const queryLower = trimmed.toLowerCase();

  const tabMatches = category === "history"
    ? []
    : tabs
        .map((tab) => {
          const title = tab.title || "";
          const url = tab.url || "";
          const score = Math.max(
            fuzzyScore(title.toLowerCase(), queryLower),
            fuzzyScore(url.toLowerCase(), queryLower)
          );
          return {
            type: "tab",
            title: title || url || "(untitled)",
            url,
            tabId: tab.id,
            iconUrl: tab.favIconUrl || getFaviconUrl(url),
            score
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

  const historyItems = category === "tabs"
    ? []
    : (await chrome.history.search({ text: trimmed, maxResults: 12 }))
        .map((item) => {
          const title = item.title || "";
          const url = item.url || "";
          const score = Math.max(
            fuzzyScore(title.toLowerCase(), queryLower),
            fuzzyScore(url.toLowerCase(), queryLower)
          );
          return {
            type: "history",
            title: title || url || "(untitled)",
            url,
            iconUrl: getFaviconUrl(url),
            score
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

  const deduped = dedupeByUrl(tabMatches, historyItems);
  const googleSuggestions = category === "all"
    ? await fetchGoogleSuggestions(trimmed)
    : [];

  return {
    tabs: category === "history" ? [] : deduped.tabs,
    history: category === "tabs" ? [] : deduped.history,
    googleSuggestions
  };
}

async function handleOpenSuggestion(item, sender) {
  const { usageCount } = await chrome.storage.local.get(["usageCount"]);

  if (item?.type === "tab" && item.tabId) {
    await chrome.tabs.update(item.tabId, { active: true });
  } else if (item?.type === "command") {
    await executeCommand(item, sender);
  } else if (item?.type === "google-suggestion" && item.query) {
    const url = "https://www.google.com/search?q=" + encodeURIComponent(item.query);
    await chrome.tabs.create({ url });
    await recordRecentSearch(item.query);
  } else if (item?.type === "action" && item.action && item.query) {
    const url = item.action === "youtube"
      ? "https://www.youtube.com/results?search_query=" + encodeURIComponent(item.query)
      : "https://www.google.com/search?q=" + encodeURIComponent(item.query);
    await chrome.tabs.create({ url });
    await recordRecentSearch(item.query);
  } else if (item?.type === "recent-search" && item.query) {
    const url = "https://www.google.com/search?q=" + encodeURIComponent(item.query);
    await chrome.tabs.create({ url });
    await recordRecentSearch(item.query);
  } else if (item?.url) {
    await chrome.tabs.create({ url: item.url });
  }

  await chrome.storage.local.set({ usageCount: usageCount + 1 });
  return { success: true };
}

async function recordRecentSearch(query) {
  const trimmed = (query || "").trim();
  if (!trimmed) return;

  const { recentSearches = [] } = await chrome.storage.local.get(["recentSearches"]);
  const next = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(0, 5);
  await chrome.storage.local.set({ recentSearches: next });
}

async function fetchGoogleSuggestions(query) {
  const trimmed = (query || "").trim();
  if (!trimmed || isLikelyUrl(trimmed)) return [];

  try {
    const endpoints = [
      "https://www.google.com/complete/search?client=firefox&hl=en&q=" + encodeURIComponent(trimmed),
      "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=" + encodeURIComponent(trimmed)
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const payload = await response.json();
        const suggestions = Array.isArray(payload?.[1]) ? payload[1] : [];
        const mapped = suggestions
          .filter((item) => typeof item === "string" && item.trim())
          .slice(0, 8)
          .map((text) => ({
            type: "google-suggestion",
            query: text,
            title: text,
            subtitle: "Google Suggestion"
          }));

        if (mapped.length) return mapped;
      } catch {
        continue;
      }
    }

    return [];
  } catch {
    return [];
  }
}

function isLikelyUrl(value) {
  if (!value) return false;
  const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i;
  const domainPattern = /^[\w-]+(\.[\w-]+)+$/i;
  if (urlPattern.test(value) || domainPattern.test(value)) {
    return true;
  }
  return /^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/i.test(value);
}

function normalizeUrl(value) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

async function executeCommand(item, sender) {
  switch (item.command) {
    case "open-new-tab":
      await chrome.tabs.create({});
      if (sender?.tab?.id) {
        await chrome.tabs.remove(sender.tab.id);
      }
      break;
    case "open-youtube":
      await chrome.tabs.create({ url: "https://www.youtube.com" });
      break;
    case "open-github":
      await chrome.tabs.create({ url: "https://github.com" });
      break;
    case "open-google":
      await chrome.tabs.create({ url: "https://www.google.com" });
      break;
    case "open-reddit":
      await chrome.tabs.create({ url: "https://www.reddit.com" });
      break;
    case "open-chatgpt":
      await chrome.tabs.create({ url: "https://chatgpt.com" });
      break;
    case "close-tab": {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.remove(tab.id);
      }
      break;
    }
    case "theme-light":
      await chrome.storage.local.set({ theme: "light" });
      break;
    case "theme-dark":
      await chrome.storage.local.set({ theme: "dark" });
      break;
    case "theme-system":
      await chrome.storage.local.set({ theme: "system" });
      break;
    default:
      break;
  }
}

function fuzzyScore(text, query) {
  if (!query) return 0;
  let score = 0;
  let tIndex = 0;
  let qIndex = 0;
  let streak = 0;

  while (tIndex < text.length && qIndex < query.length) {
    if (text[tIndex] === query[qIndex]) {
      streak += 1;
      score += 1 + streak;
      qIndex += 1;
    } else {
      streak = 0;
    }
    tIndex += 1;
  }

  return qIndex === query.length ? score : 0;
}

function getFaviconUrl(url) {
  if (!url) return "";
  return "https://www.google.com/s2/favicons?domain_url=" + encodeURIComponent(url) + "&sz=64";
}

function dedupeByUrl(tabs, history) {
  const seen = new Set();
  const dedupedTabs = [];
  const dedupedHistory = [];

  for (const item of tabs) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    dedupedTabs.push(item);
  }

  for (const item of history) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    dedupedHistory.push(item);
  }

  return { tabs: dedupedTabs, history: dedupedHistory };
}
