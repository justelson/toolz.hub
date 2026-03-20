(function() {
  let isOpen = false;
  let host = null;
  let shadowRoot = null;
  let wrapper = null;
  let input = null;
  let panel = null;
  let suggestions = null;
  let footer = null;
  let inputWrap = null;
  let suggestTimer = null;
  let activeIndex = -1;
  let flatItems = [];
  let lastSearch = "";
  let currentCategory = "all";
  let currentTheme = "light";
  let storageListenerBound = false;
  let recentSearchRequestId = 0;
  let contentStylesReady = false;
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
  const extensionIconUrl = chrome.runtime.getURL('assets/icon128.png');
  const contentStylesheetUrl = chrome.runtime.getURL('content/content.css');

  const categories = [
    { id: "all", label: "All", key: "1", icon: iconAll() },
    { id: "tabs", label: "Tabs", key: "2", icon: iconTabs() },
    { id: "history", label: "History", key: "3", icon: iconHistory() },
    { id: "actions", label: "Actions", key: "4", icon: iconBolt() }
  ];

  function createUI() {
    host = document.createElement('div');
    host.id = 'raytabs-host';
    host.style.all = 'initial';
    shadowRoot = host.attachShadow({ mode: 'open' });

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = contentStylesheetUrl;
    const markStylesReady = () => {
      contentStylesReady = true;
      if (wrapper && isOpen) {
        wrapper.style.visibility = 'visible';
      }
    };
    styleLink.addEventListener('load', markStylesReady, { once: true });
    styleLink.addEventListener('error', markStylesReady, { once: true });
    shadowRoot.appendChild(styleLink);

    wrapper = document.createElement('div');
    wrapper.id = 'raytabs-wrapper';
    wrapper.className = 'raytabs-root';
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      display: none;
      visibility: hidden;
    `;
    wrapper.addEventListener('click', (e) => {
      if (e.target === wrapper) closeUI();
    });

    panel = document.createElement('div');
    panel.id = 'raytabs-panel';
    panel.addEventListener('click', (e) => e.stopPropagation());

    inputWrap = document.createElement('div');
    inputWrap.id = 'raytabs-input-wrap';

    const inputIcon = document.createElement('div');
    inputIcon.className = 'raytabs-input-icon';
    inputIcon.innerHTML = iconSearch();

    input = document.createElement('input');
    input.type = 'text';
    input.id = 'raytabs-input';
    input.placeholder = 'Search tabs, bangs, or Google...';
    input.autocomplete = 'off';
    input.spellcheck = false;

    inputWrap.appendChild(inputIcon);
    inputWrap.appendChild(input);

    suggestions = document.createElement('div');
    suggestions.id = 'raytabs-suggestions';
    suggestions.setAttribute('role', 'listbox');

    footer = document.createElement('div');
    footer.className = 'raytabs-footer';
    footer.innerHTML = `
      <div class="raytabs-hint">
        <span class="raytabs-key">&#8593;&#8595;</span> Navigate
        <span class="raytabs-key">Enter</span> Select
        <span class="raytabs-key">Esc</span> Clear
      </div>
      <div class="raytabs-hint">
        <span class="raytabs-key">Tab</span> Filters
      </div>
    `;

    panel.appendChild(inputWrap);
    panel.appendChild(suggestions);
    panel.appendChild(footer);
    wrapper.appendChild(panel);
    shadowRoot.appendChild(wrapper);
    document.documentElement.appendChild(host);

    bindThemeListeners();

    chrome.storage.local.get(["lastSearch", "theme"]).then((data) => {
      lastSearch = data.lastSearch || "";
      applyThemePreference(data.theme || "light");
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        showRecentSearches();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        switchCategory(1);
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && /[1-4]/.test(e.key)) {
        const index = Number(e.key) - 1;
        if (categories[index]) {
          setCategory(categories[index].id);
        }
      }

      if (e.key === 'ArrowUp' && !input.value.trim() && lastSearch) {
        input.value = lastSearch;
        input.setSelectionRange(input.value.length, input.value.length);
        requestSuggest();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }

      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query && isURL(query)) {
          const url = normalizeUrl(query);
          input.value = '';
          showRecentSearches();
          closeUI();
          await chrome.runtime.sendMessage({ action: 'search-url', url });
          return;
        }
        if (activeIndex >= 0 && flatItems[activeIndex]) {
          await openItem(flatItems[activeIndex]);
          return;
        }
        if (query) {
          lastSearch = query;
          input.value = '';
          showRecentSearches();
          try {
            await chrome.runtime.sendMessage({ action: 'search', query });
          } catch (err) {
            console.error('RayTabs search error:', err);
          }
        }
      }
    });

    input.addEventListener('input', () => {
      if (suggestTimer) clearTimeout(suggestTimer);
      const query = input.value.trim();
      if (!query) {
        showRecentSearches();
        return;
      }
      suggestTimer = setTimeout(async () => {
        requestSuggest();
      }, 150);
    });
  }

  function openUI() {
    if (!wrapper) createUI();
    wrapper.style.display = 'flex';
    wrapper.style.visibility = contentStylesReady ? 'visible' : 'hidden';
    input.value = '';
    showRecentSearches();
    focusSearchInput();
    isOpen = true;
  }

  function closeUI() {
    if (wrapper) {
      wrapper.style.display = 'none';
      wrapper.style.visibility = 'hidden';
      input.value = '';
      showRecentSearches();
    }
    isOpen = false;
  }

  function toggleUI() {
    if (isOpen) {
      closeUI();
    } else {
      openUI();
    }
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'toggle') {
      toggleUI();
    }
  });

  function requestSuggest() {
    const query = input.value.trim();
    if (!query) {
      showRecentSearches();
      return;
    }
    if (shouldOfferUrlAction(query)) {
      renderSuggestions({
        urlActions: [{
          type: 'url',
          title: 'Open page',
          subtitle: normalizeUrl(query),
          url: normalizeUrl(query),
          icon: iconGlobe()
        }]
      }, query);
      return;
    }
    if (currentCategory === 'actions') {
      renderSuggestions({ tabs: [], history: [] }, query);
      return;
    }
    chrome.runtime.sendMessage({ action: 'suggest', query, category: currentCategory })
      .then((result) => renderSuggestions(result, query))
      .catch((err) => console.error('RayTabs suggest error:', err));
  }

  function setCategory(id) {
    currentCategory = id;
    activeIndex = -1;
    requestSuggest();
  }

  function bindThemeListeners() {
    if (storageListenerBound || !chrome?.storage?.onChanged) return;
    storageListenerBound = true;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.theme) {
        applyThemePreference(changes.theme.newValue || "light");
      }
    });

    if (prefersDarkMode?.addEventListener) {
      prefersDarkMode.addEventListener('change', () => {
        if (currentTheme === 'system') {
          applyThemePreference('system');
        }
      });
    }
  }

  function applyThemePreference(theme) {
    currentTheme = theme || 'light';
    const resolved = currentTheme === 'system'
      ? (prefersDarkMode.matches ? 'dark' : 'light')
      : currentTheme;
    wrapper?.classList.toggle('dark', resolved === 'dark');
    if (wrapper) {
      wrapper.style.colorScheme = resolved;
    }
  }

  function switchCategory(direction) {
    const index = categories.findIndex((c) => c.id === currentCategory);
    const nextIndex = (index + direction + categories.length) % categories.length;
    setCategory(categories[nextIndex].id);
  }

  function moveSelection(delta) {
    if (!flatItems.length) return;
    const next = (activeIndex + delta + flatItems.length) % flatItems.length;
    setActiveIndex(next);
  }

  function setActiveIndex(index) {
    activeIndex = index;
    const rows = suggestions.querySelectorAll('.raytabs-suggestion');
    rows.forEach((row) => row.classList.remove('active'));
    if (rows[index]) {
      rows[index].classList.add('active');
      rows[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderSuggestions(result = { tabs: [], history: [] }, query = '') {
    if (!suggestions) return;
    if (Array.isArray(result)) {
      result = { tabs: [], history: [] };
    }
    suggestions.innerHTML = '';
    flatItems = [];
    activeIndex = -1;

    const tabs = result.tabs || [];
    const history = result.history || [];
    const urlActions = result.urlActions || [];
    const googleSuggestions = result.googleSuggestions || [];
    const recentSearches = result.recentSearches || [];
    const hasResults = tabs.length || history.length;
    const isEmptyState = !query;
    const googleSearchAction = query
      ? [{
          type: 'action',
          title: `Search Google for "${query}"`,
          subtitle: 'Google Search',
          action: 'google',
          query,
          icon: iconGoogle()
        }]
      : [];
    const browserActions = query
      ? [{
          type: 'action',
          title: `Search YouTube for "${query}"`,
          subtitle: 'YouTube Search',
          action: 'youtube',
          query,
          icon: iconYouTube()
        }]
      : [];

    if (query && urlActions.length) {
      appendSection('Open page', urlActions);
    } else if (isEmptyState && recentSearches.length) {
      appendSection('Recent Google Searches', recentSearches);
    } else {
      if (currentCategory === 'all' && googleSearchAction.length) {
        appendSection('Google Search', googleSearchAction);
      }
      if (currentCategory === 'all' && googleSuggestions.length) {
        appendSection('Search Suggestions', googleSuggestions);
      }
      if (tabs.length) appendSection('Open Tabs', tabs);
      if (history.length) appendSection('Recent History', history);
      if (currentCategory === 'actions' && browserActions.length) appendSection('Actions', browserActions);
      if (!hasResults && currentCategory !== 'actions' && browserActions.length) appendSection('Actions', browserActions);
    }

    suggestions.style.display = flatItems.length ? 'flex' : 'none';
  }

  function appendSection(title, items) {
    const uniqueItems = dedupeSuggestionItems(items);
    if (!uniqueItems.length) return;

    const section = document.createElement('div');
    section.className = 'raytabs-section';
    section.textContent = title;
    suggestions.appendChild(section);

    for (const item of uniqueItems) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'raytabs-suggestion';
      row.setAttribute('role', 'option');

      const iconWrap = document.createElement('div');
      iconWrap.className = 'raytabs-suggestion-icon';
      if (item.type === 'tab' || item.type === 'history') {
        const img = document.createElement('img');
        img.alt = '';
        img.src = item.iconUrl || item.favIconUrl || getFaviconFallbackUrl(item.url) || extensionIconUrl;
        img.onerror = function() {
          this.src = extensionIconUrl;
        };
        iconWrap.appendChild(img);
      } else {
        iconWrap.innerHTML = item.type === 'google-suggestion'
          ? iconGoogle()
          : item.icon || iconBolt();
      }

      const body = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.className = 'raytabs-suggestion-title';
      titleEl.textContent = item.title || item.url || '';
      titleEl.title = item.title || item.url || '';

      const urlEl = document.createElement('div');
      urlEl.className = 'raytabs-suggestion-url';
      urlEl.textContent = getSuggestionSubtitle(item);
      urlEl.title = item.url || item.subtitle || '';

      body.appendChild(titleEl);
      body.appendChild(urlEl);

      const meta = document.createElement('div');
      meta.className = 'raytabs-suggestion-meta';
      meta.textContent = item.type === 'tab'
        ? 'Tab'
        : item.type === 'history'
          ? 'History'
          : item.type === 'url'
            ? 'Open'
          : item.type === 'google-suggestion'
            ? 'Search'
            : item.type === 'recent-search'
              ? 'Search'
          : 'Action';

      row.appendChild(iconWrap);
      row.appendChild(body);
      row.appendChild(meta);

      const index = flatItems.length;
      flatItems.push(item);
      row.dataset.index = String(index);
      row.addEventListener('mouseenter', () => setActiveIndex(index));
      row.addEventListener('click', async () => {
        await openItem(item);
      });

      suggestions.appendChild(row);
    }
  }

  async function openItem(item) {
    closeUI();
    try {
      await chrome.runtime.sendMessage({ action: 'open-suggestion', item });
    } catch (err) {
      console.error('RayTabs open suggestion error:', err);
    }
  }

  function showRecentSearches() {
    const requestId = ++recentSearchRequestId;
    chrome.storage.local.get(["recentSearches"]).then((data) => {
      if (requestId !== recentSearchRequestId) return;
      const uniqueQueries = [...new Set((data.recentSearches || []).map((query) => query.trim()).filter(Boolean))].slice(0, 5);
      const recentSearches = uniqueQueries.map((query) => ({
        type: 'recent-search',
        query,
        title: query,
        subtitle: 'Google Search',
        icon: iconGoogle()
      }));
      renderSuggestions({ recentSearches }, '');
    }).catch((err) => {
      console.error('RayTabs recent search load error:', err);
      renderSuggestions({}, '');
    });
  }

  function focusSearchInput() {
    const focusNow = () => {
      if (!input) return;
      input.focus({ preventScroll: true });
      input.select();
    };

    requestAnimationFrame(() => {
      focusNow();
      requestAnimationFrame(focusNow);
    });

    setTimeout(focusNow, 50);
    setTimeout(focusNow, 150);
  }

  function getSuggestionSubtitle(item) {
    if (!item) return '';
    if (item.type === 'url') return item.subtitle || formatUrlForDisplay(item.url);
    if (item.type === 'recent-search') return item.subtitle || 'Google Search';
    if (item.type === 'command') return item.subtitle || '';
    if (item.type === 'google-suggestion') return item.subtitle || 'Google Suggestion';
    if (item.subtitle) return item.subtitle;
    if (item.url) return formatUrlForDisplay(item.url);
    return '';
  }

  function getFaviconFallbackUrl(url) {
    if (!url) return '';
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=64`;
  }

  function formatUrlForDisplay(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, '');
      const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : '';
      const shortPath = path ? (path.length > 24 ? `${path.slice(0, 24)}...` : path) : '';
      return `${host}${shortPath}`;
    } catch {
      return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    }
  }

  function dedupeSuggestionItems(items) {
    const seen = new Set();
    const output = [];

    for (const item of items || []) {
      const key = getSuggestionKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(item);
    }

    return output;
  }

  function getSuggestionKey(item) {
    if (!item) return 'empty';
    if (item.type === 'tab') return `tab:${item.tabId || item.url || item.title || ''}`;
    if (item.type === 'history') return `history:${item.url || item.title || ''}`;
    if (item.type === 'recent-search') return `recent:${item.query || item.title || ''}`;
    if (item.type === 'google-suggestion') return `google:${item.query || item.title || ''}`;
    if (item.type === 'action') return `action:${item.action || ''}:${item.query || ''}`;
    return `${item.type || 'item'}:${item.url || item.title || item.subtitle || ''}`;
  }

  function isURL(str) {
    const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i;
    const domainPattern = /^[\w-]+(\.[\w-]+)+$/i;

    if (urlPattern.test(str) || domainPattern.test(str)) {
      return true;
    }

    if (str.match(/^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/i)) {
      return true;
    }

    return false;
  }

  function shouldOfferUrlAction(str) {
    const value = (str || '').trim();
    if (!value || /\s/.test(value) || value.startsWith('/')) return false;
    if (isURL(value)) return true;
    if (/^https?:\/?\/?/i.test(value)) return true;
    if (/^localhost(?::\d+)?(?:\/.*)?$/i.test(value)) return true;
    if (/^\d{1,3}(?:\.\d{1,3}){1,3}(?::\d+)?(?:\/.*)?$/i.test(value)) return true;
    return /^[a-z0-9-]+(?:\.[a-z0-9-]*)+$/i.test(value);
  }

  function normalizeUrl(value) {
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  function iconSearch() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  }

  function iconAll() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
  }

  function iconTabs() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h8l4 4v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M4 12V8a2 2 0 0 1 2-2h4"/></svg>';
  }

  function iconHistory() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 3"/></svg>';
  }

  function iconBolt() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></svg>';
  }

  function iconGoogle() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
  }

  function iconYouTube() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/></svg>';
  }

  function iconGlobe() {
    return iconGoogle();
  }

  function iconVideo() {
    return iconYouTube();
  }
})();
