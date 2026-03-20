(() => {
  const chromeApi = typeof chrome !== 'undefined' ? chrome : null;
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
  const UNSPLASH_STORAGE_KEY = "unsplashSettings";
  const UNSPLASH_CACHE_STORAGE_KEY = "unsplashCache";
  const UNSPLASH_CACHE_MINIMUM = 6;
  const SETTINGS_ACCORDION_STORAGE_KEY = "settingsAccordionState";
  const CLOCK_SETTINGS_STORAGE_KEY = "clockSettings";
  const CLOCK_APPEARANCE_STORAGE_KEY = "clockAppearance";
  const SETTINGS_ACTIVE_TAB_STORAGE_KEY = "settingsActiveTab";
  const UNSPLASH_ACCESS_KEY = "zDzz4DIDfyYuKcx1tR0MqgvkCXQJfJp83OtiL8dJAi4";
  const UNSPLASH_MODE_QUERIES = {
    nature: "nature landscape outdoors",
    city: "city skyline architecture",
    abstract: "abstract texture pattern",
    minimal: "minimal clean simple",
    dark: "dark moody night",
    random: ""
  };
  const UNSPLASH_DEFAULT_SETTINGS = {
    enabled: true,
    mode: "nature",
    accessKey: UNSPLASH_ACCESS_KEY,
    rotationMode: "every-tab",
    selectedPhotoId: ""
  };
  const CLOCK_FONT_OPTIONS = [
    { value: "sans", label: "Sans" },
    { value: "mono", label: "Mono" },
    { value: "serif", label: "Serif" }
  ];
  const CLOCK_COLOR_OPTIONS = [
    { value: "auto", label: "Auto" },
    { value: "muted", label: "Muted" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ];
  const CLOCK_APPEARANCE_DEFAULTS = {
    time: { font: "sans", size: 7.2, color: "auto" },
    day: { font: "sans", size: 0.94, color: "auto" },
    date: { font: "sans", size: 0.94, color: "muted" }
  };
  const CLOCK_SETTINGS_DEFAULTS = {
    format: "12h",
    showSeconds: false
  };
  let wrapper = null;
  let backgroundLayer = null;
  let backgroundImage = null;
  let backgroundShade = null;
  let backgroundVignette = null;
  let backgroundCredit = null;
  let settingsToggle = null;
  let settingsBackdrop = null;
  let settingsDrawer = null;
  let settingsCloseButton = null;
  let settingsAccessInput = null;
  let settingsStatus = null;
  let settingsModeButtons = [];
  let settingsSections = {};
  let settingsTabButtons = [];
  let settingsTabPanels = {};
  let settingsActiveTab = "backgrounds";
  let timeFormatButtons = [];
  let clockAppearanceControls = { time: {}, day: {}, date: {} };
  let timeSecondsSwitch = null;
  let backgroundCategoryButtons = [];
  let backgroundCategoryModal = null;
  let backgroundCategoryModalTitle = null;
  let backgroundCategoryModalCopy = null;
  let backgroundCategoryModalRandomButton = null;
  let backgroundCategoryModalSingleButton = null;
  let backgroundCategoryModalStatus = null;
  let backgroundCategoryPinnedPreview = null;
  let backgroundGalleryPrevButton = null;
  let backgroundGalleryNextButton = null;
  let backgroundGalleryPageLabel = null;
  let backgroundGallery = null;
  let backgroundGalleryEmpty = null;
  let panelEl = null;
  let footerEl = null;
  let input = null;
  let suggestions = null;
  let suggestTimer = null;
  let activeIndex = -1;
  let flatItems = [];
  let lastSearch = "";
  let currentCategory = "all";
  let currentTheme = "light";
  let searchCollapsed = false;
  let storageListenerBound = false;
  let recentSearchRequestId = 0;
  let clockEl = null;
  let clockTimer = null;
  let clockFormat = "12h";
  let clockShowSeconds = false;
  let clockAppearance = cloneClockAppearanceDefaults();
  let unsplashSettings = { ...UNSPLASH_DEFAULT_SETTINGS };
  let unsplashCache = createEmptyUnsplashCache();
  let unsplashRequestToken = 0;
  let unsplashStatusText = "Unsplash ready";
  let activeBackgroundCategory = UNSPLASH_DEFAULT_SETTINGS.mode;
  let backgroundGalleryPage = 0;
  const BACKGROUND_GALLERY_PAGE_SIZE = 6;

  const categories = [
    { id: "all", label: "All", key: "1", icon: iconAll() },
    { id: "tabs", label: "Tabs", key: "2", icon: iconTabs() },
    { id: "history", label: "History", key: "3", icon: iconHistory() },
    { id: "actions", label: "Actions", key: "4", icon: iconBolt() }
  ];

  const slashCommands = [
    {
      id: "open-new-tab",
      title: "Open New Tab",
      subtitle: "Open another RayTabs page",
      aliases: ["new", "new tab", "tab"],
      icon: iconPlusSquare()
    },
    {
      id: "open-youtube",
      title: "Open YouTube",
      subtitle: "Jump to YouTube",
      aliases: ["yt", "youtube"],
      icon: iconYouTube()
    },
    {
      id: "open-github",
      title: "Open GitHub",
      subtitle: "Jump to GitHub",
      aliases: ["git", "github"],
      icon: iconGitHub()
    },
    {
      id: "open-google",
      title: "Open Google",
      subtitle: "Open Google Search",
      aliases: ["g", "google"],
      icon: iconGoogle()
    },
    {
      id: "open-reddit",
      title: "Open Reddit",
      subtitle: "Jump to Reddit",
      aliases: ["r", "reddit"],
      icon: iconReddit()
    },
    {
      id: "open-chatgpt",
      title: "Open ChatGPT",
      subtitle: "Jump to ChatGPT",
      aliases: ["gpt", "chatgpt"],
      icon: iconSpark()
    },
    {
      id: "close-tab",
      title: "Close Current Tab",
      subtitle: "Close the active tab",
      aliases: ["close", "close tab", "quit"],
      icon: iconX()
    },
    {
      id: "theme-light",
      title: "Switch to Light Theme",
      subtitle: "Set the homepage to light mode",
      aliases: ["light", "day"],
      icon: iconSun()
    },
    {
      id: "theme-dark",
      title: "Switch to Dark Theme",
      subtitle: "Set the homepage to dark mode",
      aliases: ["dark", "night"],
      icon: iconMoon()
    },
    {
      id: "theme-system",
      title: "Match System Theme",
      subtitle: "Follow your operating system",
      aliases: ["system", "auto"],
      icon: iconMonitor()
    }
  ];

  function buildUI() {
    wrapper = document.createElement('div');
    wrapper.id = 'raytabs-wrapper';
    wrapper.dataset.newtab = 'true';

    backgroundLayer = document.createElement('div');
    backgroundLayer.id = 'raytabs-unsplash-layer';
    backgroundLayer.setAttribute('aria-hidden', 'true');

    backgroundImage = document.createElement('img');
    backgroundImage.id = 'raytabs-unsplash-image';
    backgroundImage.alt = '';
    backgroundImage.decoding = 'async';
    backgroundImage.loading = 'eager';
    backgroundImage.referrerPolicy = 'no-referrer';

    backgroundShade = document.createElement('div');
    backgroundShade.id = 'raytabs-unsplash-shade';

    backgroundVignette = document.createElement('div');
    backgroundVignette.id = 'raytabs-unsplash-vignette';

    backgroundCredit = document.createElement('div');
    backgroundCredit.id = 'raytabs-unsplash-credit';

    backgroundLayer.appendChild(backgroundImage);
    backgroundLayer.appendChild(backgroundShade);
    backgroundLayer.appendChild(backgroundVignette);
    backgroundLayer.appendChild(backgroundCredit);

    settingsToggle = document.createElement('button');
    settingsToggle.id = 'raytabs-settings-toggle';
    settingsToggle.type = 'button';
    settingsToggle.setAttribute('aria-label', 'Open settings');
    settingsToggle.title = 'Open settings';
    settingsToggle.innerHTML = `<span class="raytabs-settings-toggle-icon">${iconSettings()}</span>`;
    settingsToggle.addEventListener('click', () => toggleSettingsDrawer());

    settingsBackdrop = document.createElement('div');
    settingsBackdrop.id = 'raytabs-settings-backdrop';
    settingsBackdrop.addEventListener('click', () => closeSettingsDrawer());

    settingsDrawer = document.createElement('aside');
    settingsDrawer.id = 'raytabs-settings-drawer';
    settingsDrawer.setAttribute('aria-label', 'Background settings');

    const drawerHeader = document.createElement('div');
    drawerHeader.className = 'raytabs-settings-header';
    const headerMain = document.createElement('div');
    headerMain.className = 'raytabs-settings-header-main';
    headerMain.innerHTML = `
      <div class="raytabs-settings-eyebrow">Customization</div>
      <div class="raytabs-settings-title">Backgrounds and styling</div>
    `;

    const tabBar = document.createElement('div');
    tabBar.className = 'raytabs-settings-tabs';
    settingsTabButtons = [
      { key: 'backgrounds', label: 'Backgrounds' },
      { key: 'time', label: 'Time' }
    ].map(({ key, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'raytabs-settings-tab';
      button.dataset.tab = key;
      button.textContent = label;
      button.addEventListener('click', () => setSettingsTab(key));
      tabBar.appendChild(button);
      return button;
    });
    headerMain.appendChild(tabBar);

    settingsCloseButton = document.createElement('button');
    settingsCloseButton.type = 'button';
    settingsCloseButton.className = 'raytabs-settings-close';
    settingsCloseButton.setAttribute('aria-label', 'Close settings');
    settingsCloseButton.innerHTML = iconChevronLeft();
    settingsCloseButton.addEventListener('click', () => closeSettingsDrawer());
    drawerHeader.appendChild(headerMain);
    drawerHeader.appendChild(settingsCloseButton);

    const drawerBody = document.createElement('div');
    drawerBody.className = 'raytabs-settings-body';
    const backgroundsPanel = document.createElement('section');
    backgroundsPanel.className = 'raytabs-settings-tab-panel';
    backgroundsPanel.dataset.tabPanel = 'backgrounds';
    const backgroundBody = backgroundsPanel;

    const enabledRow = document.createElement('button');
    enabledRow.type = 'button';
    enabledRow.className = 'raytabs-settings-row';
    enabledRow.innerHTML = `
      <div>
        <div class="raytabs-settings-row-title">Enable background</div>
        <div class="raytabs-settings-row-copy">Show curated Unsplash photos on the new tab page.</div>
      </div>
      <span class="raytabs-settings-switch" data-setting="enabled"></span>
    `;
    enabledRow.addEventListener('click', () => {
      updateUnsplashSettings({ enabled: !unsplashSettings.enabled });
    });

    const modeSection = document.createElement('div');
    modeSection.className = 'raytabs-settings-section';
    modeSection.innerHTML = `
      <div class="raytabs-settings-section-title">Background categories</div>
      <div class="raytabs-settings-section-copy">Pick a category first, then choose random rotation or a single pinned image from that same category.</div>
    `;

    const modeGrid = document.createElement('div');
    modeGrid.className = 'raytabs-background-category-grid';
    settingsModeButtons = [];
    backgroundCategoryButtons = Object.keys(UNSPLASH_MODE_QUERIES).map((mode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'raytabs-background-category-card';
      button.dataset.mode = mode;
      button.innerHTML = `
        <strong>${mode === 'random' ? 'Random' : mode.charAt(0).toUpperCase() + mode.slice(1)}</strong>
        <span>Open category options</span>
      `;
      button.addEventListener('click', () => openBackgroundCategoryModal(mode));
      modeGrid.appendChild(button);
      return button;
    });

    const accessKeySection = document.createElement('div');
    accessKeySection.className = 'raytabs-settings-section';
    accessKeySection.innerHTML = `
      <div class="raytabs-settings-section-title">Access key</div>
      <div class="raytabs-settings-section-copy">The access key is used locally to load and cache photos.</div>
    `;

    settingsAccessInput = document.createElement('input');
    settingsAccessInput.className = 'raytabs-settings-input';
    settingsAccessInput.type = 'password';
    settingsAccessInput.placeholder = 'Unsplash access key';
    settingsAccessInput.spellcheck = false;
    settingsAccessInput.autocomplete = 'off';

    const buttonRow = document.createElement('div');
    buttonRow.className = 'raytabs-settings-actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'raytabs-settings-primary';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => saveUnsplashAccessKey());

    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'raytabs-settings-secondary';
    refreshButton.textContent = 'Next photo';
    refreshButton.addEventListener('click', () => refreshUnsplashBackground());

    buttonRow.appendChild(saveButton);
    buttonRow.appendChild(refreshButton);

    settingsStatus = document.createElement('div');
    settingsStatus.className = 'raytabs-settings-note';

    const timePanel = document.createElement('section');
    timePanel.className = 'raytabs-settings-tab-panel';
    timePanel.dataset.tabPanel = 'time';
    const timeBody = timePanel;
    const formatSection = document.createElement('div');
    formatSection.className = 'raytabs-settings-section';
    formatSection.innerHTML = `
      <div class="raytabs-settings-section-title">Clock format</div>
      <div class="raytabs-settings-section-copy">12h or 24h.</div>
    `;

    const formatGrid = document.createElement('div');
    formatGrid.className = 'raytabs-settings-mode-grid time-grid';
    timeFormatButtons = [
      { value: '12h', label: '12 Hour' },
      { value: '24h', label: '24 Hour' }
    ].map(({ value, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'raytabs-settings-mode';
      button.dataset.timeFormat = value;
      button.textContent = label;
      button.addEventListener('click', () => setClockFormat(value));
      formatGrid.appendChild(button);
      return button;
    });

    const secondsRow = document.createElement('button');
    secondsRow.type = 'button';
    secondsRow.className = 'raytabs-settings-row';
    secondsRow.innerHTML = `
      <div>
        <div class="raytabs-settings-row-title">Show seconds</div>
        <div class="raytabs-settings-row-copy">Display seconds in the main clock.</div>
      </div>
      <span class="raytabs-settings-switch" data-setting="seconds"></span>
    `;
    secondsRow.addEventListener('click', () => setClockShowSeconds(!clockShowSeconds));
    timeSecondsSwitch = secondsRow.querySelector('.raytabs-settings-switch');

    const resetClockStyleButton = document.createElement('button');
    resetClockStyleButton.type = 'button';
    resetClockStyleButton.className = 'raytabs-settings-inline-action';
    resetClockStyleButton.textContent = 'Reset clock styling';
    resetClockStyleButton.addEventListener('click', () => resetClockAppearance());

    const customStyleHeader = document.createElement('div');
    customStyleHeader.className = 'raytabs-settings-toolbar';
    customStyleHeader.innerHTML = `
      <div>
        <div class="raytabs-settings-section-title">Clock styling</div>
        <div class="raytabs-settings-toolbar-copy">Adjust weekday, date, and time separately.</div>
      </div>
    `;
    customStyleHeader.appendChild(resetClockStyleButton);

    const customStyleStack = document.createElement('div');
    customStyleStack.className = 'raytabs-settings-stack';
    customStyleStack.appendChild(createClockAppearanceSection('time', 'Time text', 'Main clock display.', 4.8, 9.2, 0.1));
    customStyleStack.appendChild(createClockAppearanceSection('day', 'Weekday text', 'Day label above the clock.', 0.8, 1.4, 0.02));
    customStyleStack.appendChild(createClockAppearanceSection('date', 'Date text', 'Date label above the clock.', 0.8, 1.4, 0.02));

    const timeQuickPanel = document.createElement('div');
    timeQuickPanel.className = 'raytabs-settings-time-quick';
    timeQuickPanel.appendChild(formatSection);
    timeQuickPanel.appendChild(formatGrid);
    timeQuickPanel.appendChild(secondsRow);

    settingsAccessInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveUnsplashAccessKey();
      }
    });

    backgroundBody.appendChild(enabledRow);
    backgroundBody.appendChild(modeSection);
    backgroundBody.appendChild(modeGrid);
    backgroundBody.appendChild(accessKeySection);
    backgroundBody.appendChild(settingsAccessInput);
    backgroundBody.appendChild(buttonRow);
    backgroundBody.appendChild(settingsStatus);

    timeBody.appendChild(timeQuickPanel);
    timeBody.appendChild(customStyleHeader);
    timeBody.appendChild(customStyleStack);

    settingsTabPanels = {
      backgrounds: backgroundsPanel,
      time: timePanel
    };

    drawerBody.appendChild(backgroundsPanel);
    drawerBody.appendChild(timePanel);

    settingsDrawer.appendChild(drawerHeader);
    settingsDrawer.appendChild(drawerBody);

    backgroundCategoryModal = document.createElement('div');
    backgroundCategoryModal.className = 'raytabs-category-modal';
    backgroundCategoryModal.hidden = true;
    backgroundCategoryModal.addEventListener('click', (event) => {
      if (event.target === backgroundCategoryModal) {
        closeBackgroundCategoryModal();
      }
    });

    const modalCard = document.createElement('div');
    modalCard.className = 'raytabs-category-modal-card';

    const modalSettingsPanel = document.createElement('div');
    modalSettingsPanel.className = 'raytabs-category-modal-settings';

    const modalImagesPanel = document.createElement('div');
    modalImagesPanel.className = 'raytabs-category-modal-images';

    const modalHeader = document.createElement('div');
    modalHeader.className = 'raytabs-category-modal-header';

    const modalHeaderCopy = document.createElement('div');
    modalHeaderCopy.className = 'raytabs-category-modal-copy';
    backgroundCategoryModalTitle = document.createElement('div');
    backgroundCategoryModalTitle.className = 'raytabs-settings-section-title';
    backgroundCategoryModalCopy = document.createElement('div');
    backgroundCategoryModalCopy.className = 'raytabs-settings-section-copy';
    modalHeaderCopy.appendChild(backgroundCategoryModalTitle);
    modalHeaderCopy.appendChild(backgroundCategoryModalCopy);

    const modalCloseButton = document.createElement('button');
    modalCloseButton.type = 'button';
    modalCloseButton.className = 'raytabs-settings-close';
    modalCloseButton.setAttribute('aria-label', 'Close category options');
    modalCloseButton.innerHTML = iconX();
    modalCloseButton.addEventListener('click', () => closeBackgroundCategoryModal());

    modalHeader.appendChild(modalHeaderCopy);
    modalHeader.appendChild(modalCloseButton);

    const modalModeGrid = document.createElement('div');
    modalModeGrid.className = 'raytabs-settings-mode-grid';

    backgroundCategoryModalRandomButton = document.createElement('button');
    backgroundCategoryModalRandomButton.type = 'button';
    backgroundCategoryModalRandomButton.className = 'raytabs-settings-mode';
    backgroundCategoryModalRandomButton.textContent = 'Random in category';
    backgroundCategoryModalRandomButton.addEventListener('click', () => setCategoryRotationMode('every-tab'));

    backgroundCategoryModalSingleButton = document.createElement('button');
    backgroundCategoryModalSingleButton.type = 'button';
    backgroundCategoryModalSingleButton.className = 'raytabs-settings-mode';
    backgroundCategoryModalSingleButton.textContent = 'Single image';
    backgroundCategoryModalSingleButton.addEventListener('click', () => setCategoryRotationMode('fixed'));

    modalModeGrid.appendChild(backgroundCategoryModalRandomButton);
    modalModeGrid.appendChild(backgroundCategoryModalSingleButton);

    const modalActionRow = document.createElement('div');
    modalActionRow.className = 'raytabs-settings-actions';

    const modalRefreshButton = document.createElement('button');
    modalRefreshButton.type = 'button';
    modalRefreshButton.className = 'raytabs-settings-secondary';
    modalRefreshButton.textContent = 'Change background';
    modalRefreshButton.addEventListener('click', () => refreshUnsplashBackground());

    const modalFetchButton = document.createElement('button');
    modalFetchButton.type = 'button';
    modalFetchButton.className = 'raytabs-settings-secondary';
    modalFetchButton.textContent = 'Fetch more';
    modalFetchButton.addEventListener('click', () => fetchMoreUnsplashPhotos());

    modalActionRow.appendChild(modalRefreshButton);
    modalActionRow.appendChild(modalFetchButton);

    backgroundGallery = document.createElement('div');
    backgroundGallery.className = 'raytabs-background-grid';

    backgroundGalleryEmpty = document.createElement('div');
    backgroundGalleryEmpty.className = 'raytabs-settings-note';
    backgroundGalleryEmpty.textContent = 'No photos cached yet. Fetch a few to build your library.';

    const modalImagesHeader = document.createElement('div');
    modalImagesHeader.className = 'raytabs-category-modal-images-header';
    modalImagesHeader.innerHTML = `
      <div>
        <div class="raytabs-settings-section-title">Images</div>
        <div class="raytabs-settings-section-copy">Move page by page. New images load as you go, with the photo details visible on each card.</div>
      </div>
    `;

    const modalImagesPager = document.createElement('div');
    modalImagesPager.className = 'raytabs-background-pager';

    backgroundGalleryPrevButton = document.createElement('button');
    backgroundGalleryPrevButton.type = 'button';
    backgroundGalleryPrevButton.className = 'raytabs-settings-inline-action';
    backgroundGalleryPrevButton.textContent = 'Previous';
    backgroundGalleryPrevButton.addEventListener('click', () => changeBackgroundGalleryPage(-1));

    backgroundGalleryPageLabel = document.createElement('div');
    backgroundGalleryPageLabel.className = 'raytabs-background-pager-label';

    backgroundGalleryNextButton = document.createElement('button');
    backgroundGalleryNextButton.type = 'button';
    backgroundGalleryNextButton.className = 'raytabs-settings-inline-action';
    backgroundGalleryNextButton.textContent = 'Next';
    backgroundGalleryNextButton.addEventListener('click', () => changeBackgroundGalleryPage(1));

    modalImagesPager.appendChild(backgroundGalleryPrevButton);
    modalImagesPager.appendChild(backgroundGalleryPageLabel);
    modalImagesPager.appendChild(backgroundGalleryNextButton);
    modalImagesHeader.appendChild(modalImagesPager);

    backgroundCategoryModalStatus = document.createElement('div');
    backgroundCategoryModalStatus.className = 'raytabs-settings-note';

    backgroundCategoryPinnedPreview = document.createElement('div');
    backgroundCategoryPinnedPreview.className = 'raytabs-selected-image-card';

    modalSettingsPanel.appendChild(modalHeader);
    modalSettingsPanel.appendChild(modalModeGrid);
    modalSettingsPanel.appendChild(modalActionRow);
    modalSettingsPanel.appendChild(backgroundCategoryModalStatus);
    modalSettingsPanel.appendChild(backgroundCategoryPinnedPreview);

    modalImagesPanel.appendChild(modalImagesHeader);
    modalImagesPanel.appendChild(backgroundGallery);
    modalImagesPanel.appendChild(backgroundGalleryEmpty);

    modalCard.appendChild(modalSettingsPanel);
    modalCard.appendChild(modalImagesPanel);
    backgroundCategoryModal.appendChild(modalCard);

    panelEl = document.createElement('div');
    panelEl.id = 'raytabs-panel';

    clockEl = document.createElement('div');
    clockEl.className = 'raytabs-clock';

    const inputWrap = document.createElement('div');
    inputWrap.id = 'raytabs-input-wrap';

    const inputIcon = document.createElement('div');
    inputIcon.className = 'raytabs-input-icon';
    inputIcon.innerHTML = iconSearch();

    input = document.createElement('input');
    input.id = 'raytabs-input';
    input.type = 'text';
    input.placeholder = 'Search tabs, history, or type / for commands...';
    input.autocomplete = 'off';
    input.spellcheck = false;

    inputWrap.appendChild(inputIcon);
    inputWrap.appendChild(input);

    suggestions = document.createElement('div');
    suggestions.id = 'raytabs-suggestions';
    suggestions.setAttribute('role', 'listbox');

    footerEl = document.createElement('div');
    footerEl.className = 'raytabs-footer';
    footerEl.innerHTML = `
      <div class="raytabs-hint">
        <span class="raytabs-key">&#8593;&#8595;</span> Navigate
        <span class="raytabs-key">Enter</span> Select
        <span class="raytabs-key">Esc</span> Clear
      </div>
      <div class="raytabs-hint">
        <span class="raytabs-key">Tab</span> Filters
      </div>
    `;

    wrapper.appendChild(backgroundLayer);
    wrapper.appendChild(settingsToggle);
    wrapper.appendChild(settingsBackdrop);
    wrapper.appendChild(settingsDrawer);
    wrapper.appendChild(backgroundCategoryModal);
    wrapper.appendChild(clockEl);
    panelEl.appendChild(inputWrap);
    panelEl.appendChild(suggestions);
    panelEl.appendChild(footerEl);
    wrapper.appendChild(panelEl);
    document.body.appendChild(wrapper);

    bindStorageListeners();
    updateClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(updateClock, 1000);
    window.addEventListener('beforeunload', () => {
      if (clockTimer) clearInterval(clockTimer);
    }, { once: true });

    chromeApi?.storage?.local?.get(["lastSearch", "theme"])?.then((data) => {
      lastSearch = data.lastSearch || "";
      applyThemePreference(data.theme || "light");
    });

    chromeApi?.storage?.local?.get([CLOCK_SETTINGS_STORAGE_KEY, "clockFormat", "clockShowSeconds"])?.then((data) => {
      const migrated = normalizeClockSettings(
        data?.[CLOCK_SETTINGS_STORAGE_KEY] || {
          format: data?.clockFormat,
          showSeconds: data?.clockShowSeconds
        }
      );
      clockFormat = migrated.format;
      clockShowSeconds = migrated.showSeconds;
      chromeApi?.storage?.local?.set({ [CLOCK_SETTINGS_STORAGE_KEY]: migrated });
      updateClock();
      syncClockSettings();
    });

    chromeApi?.storage?.local?.get([CLOCK_APPEARANCE_STORAGE_KEY, SETTINGS_ACCORDION_STORAGE_KEY, SETTINGS_ACTIVE_TAB_STORAGE_KEY])?.then((data) => {
      clockAppearance = normalizeClockAppearance(data?.[CLOCK_APPEARANCE_STORAGE_KEY]);
      syncClockSettings();
      applyAccordionState(data?.[SETTINGS_ACCORDION_STORAGE_KEY]);
      setSettingsTab(data?.[SETTINGS_ACTIVE_TAB_STORAGE_KEY] === 'time' ? 'time' : 'backgrounds', false);
      updateClock();
    });

    void loadUnsplashSettings();

    focusSearchInput();
    setSearchCollapsed(true);

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape' && isBackgroundCategoryModalOpen()) {
        e.preventDefault();
        closeBackgroundCategoryModal();
        return;
      }
      if (e.key === 'Escape' && isSettingsDrawerOpen()) {
        e.preventDefault();
        closeSettingsDrawer();
        return;
      }
      if (e.key === 'Escape') {
        input.value = '';
        setSearchCollapsed(true);
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
          setSearchCollapsed(true);
          await chromeApi?.tabs?.create({ url });
          chromeApi?.tabs?.getCurrent?.((tab) => {
            if (tab?.id) {
              chromeApi.tabs.remove(tab.id);
            }
          });
          return;
        }
        if (activeIndex >= 0 && flatItems[activeIndex]) {
          await openItem(flatItems[activeIndex]);
          return;
        }
        if (isCommandQuery(query)) {
          const commandItem = flatItems[0];
          if (commandItem) {
            await openItem(commandItem);
          }
          return;
        }
        if (query) {
          lastSearch = query;
          input.value = '';
          setSearchCollapsed(true);
          try {
            await chromeApi?.runtime?.sendMessage({ action: 'search', query });
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
        setSearchCollapsed(true);
        return;
      }
      if (searchCollapsed) {
        setSearchCollapsed(false);
      }
      if (isCommandQuery(query)) {
        renderSuggestions({ commands: getSlashCommandItems(query.slice(1)) }, query);
        return;
      }
      suggestTimer = setTimeout(() => {
        requestSuggest();
      }, 150);
    });
  }

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
    if (isCommandQuery(query)) {
      renderSuggestions({ commands: getSlashCommandItems(query.slice(1)) }, query);
      return;
    }
    if (currentCategory === 'actions') {
      renderSuggestions({ tabs: [], history: [] }, query);
      return;
    }
    const request = chromeApi?.runtime?.sendMessage({ action: 'suggest', query, category: currentCategory });
    if (request?.then) {
      request
        .then((result) => renderSuggestions(result, query))
        .catch((err) => console.error('RayTabs suggest error:', err));
    }
  }

  function setCategory(id) {
    currentCategory = id;
    activeIndex = -1;
    requestSuggest();
  }

  function isCommandQuery(query) {
    return query.startsWith('/');
  }

  function getSlashCommandItems(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    return slashCommands
      .filter((command) => {
        if (!query) return true;
        const haystack = [
          command.id,
          command.title,
          command.subtitle,
          ...(command.aliases || [])
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (!query) return 0;
        const aText = [a.id, a.title, a.subtitle, ...(a.aliases || [])].join(' ').toLowerCase();
        const bText = [b.id, b.title, b.subtitle, ...(b.aliases || [])].join(' ').toLowerCase();
        const aExact = aText.includes(`/${query}`) || a.aliases?.some((alias) => alias.toLowerCase() === query);
        const bExact = bText.includes(`/${query}`) || b.aliases?.some((alias) => alias.toLowerCase() === query);
        if (aExact !== bExact) return aExact ? -1 : 1;
        const aPrefix = aText.startsWith(query);
        const bPrefix = bText.startsWith(query);
        if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
        return a.title.localeCompare(b.title);
      })
      .map((command) => ({
        type: 'command',
        command: command.id,
        title: command.title,
        subtitle: command.subtitle,
        icon: command.icon
      }))
      .slice(0, 8);
  }

  function bindStorageListeners() {
    if (storageListenerBound || !chromeApi?.storage?.onChanged) return;
    storageListenerBound = true;
    chromeApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.lastSearch) {
        lastSearch = changes.lastSearch.newValue || "";
      }
      if (changes.theme) {
        applyThemePreference(changes.theme.newValue || "light");
      }
      if (changes[CLOCK_SETTINGS_STORAGE_KEY]) {
        const nextClockSettings = normalizeClockSettings(changes[CLOCK_SETTINGS_STORAGE_KEY].newValue);
        clockFormat = nextClockSettings.format;
        clockShowSeconds = nextClockSettings.showSeconds;
        syncClockSettings();
        updateClock();
      }
      if (changes[CLOCK_APPEARANCE_STORAGE_KEY]) {
        clockAppearance = normalizeClockAppearance(changes[CLOCK_APPEARANCE_STORAGE_KEY].newValue);
        syncClockSettings();
        updateClock();
      }
      if (changes[SETTINGS_ACTIVE_TAB_STORAGE_KEY]) {
        setSettingsTab(changes[SETTINGS_ACTIVE_TAB_STORAGE_KEY].newValue === 'time' ? 'time' : 'backgrounds', false);
      }
      if (changes[SETTINGS_ACCORDION_STORAGE_KEY]) {
        applyAccordionState(changes[SETTINGS_ACCORDION_STORAGE_KEY].newValue);
      }
      if (changes.unsplashSettings) {
        unsplashSettings = normalizeUnsplashSettings(changes.unsplashSettings.newValue);
        if (!isBackgroundCategoryModalOpen()) {
          activeBackgroundCategory = unsplashSettings.mode;
        }
        syncUnsplashDrawer();
        void renderUnsplashBackground({ force: true });
      }
      if (changes[UNSPLASH_CACHE_STORAGE_KEY]) {
        unsplashCache = normalizeUnsplashCache(changes[UNSPLASH_CACHE_STORAGE_KEY].newValue);
        syncUnsplashDrawer();
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
    document.body.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
    if (wrapper) {
      wrapper.dataset.theme = resolved;
    }
  }

  async function loadUnsplashSettings() {
    try {
      const data = await chromeApi?.storage?.local?.get([UNSPLASH_STORAGE_KEY, UNSPLASH_CACHE_STORAGE_KEY]);
      const storedSettings = normalizeUnsplashSettings(data?.[UNSPLASH_STORAGE_KEY]);
      unsplashCache = normalizeUnsplashCache(data?.[UNSPLASH_CACHE_STORAGE_KEY]);
      unsplashSettings = storedSettings;
      activeBackgroundCategory = storedSettings.mode;
      syncUnsplashDrawer();
      if (!data?.[UNSPLASH_STORAGE_KEY]) {
        await chromeApi?.storage?.local?.set({ [UNSPLASH_STORAGE_KEY]: storedSettings });
      }
      if (!data?.[UNSPLASH_CACHE_STORAGE_KEY]) {
        chromeApi?.storage?.local?.set({ [UNSPLASH_CACHE_STORAGE_KEY]: unsplashCache });
      }
      void primeUnsplashCache();
      applyClockContrast(null);
      await renderUnsplashBackground({ force: true });
    } catch (err) {
      console.error('RayTabs Unsplash settings load error:', err);
      syncUnsplashDrawer();
      applyClockContrast(null);
      void primeUnsplashCache();
      await renderUnsplashBackground({ force: true });
    }
  }

  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
    const time = formatClockTime(now);
    const date = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(now);

    clockEl.innerHTML = `
      <div class="raytabs-clock-meta">
        <div class="raytabs-clock-day">${weekday}</div>
        <div class="raytabs-clock-date">${date}</div>
      </div>
      <div class="raytabs-clock-time">${time}</div>
    `;
  }

  function applyClockContrast(color) {
    if (!clockEl) return;
    const contrast = getContrastModeFromColor(color);
    clockEl.dataset.contrast = contrast;
    if (wrapper) {
      wrapper.dataset.contrast = contrast;
    }
    if (backgroundLayer) {
      backgroundLayer.dataset.contrast = contrast;
    }
    applyClockAppearance();
  }

  function syncClockSettings() {
    if (!timeFormatButtons.length) return;
    timeFormatButtons.forEach((button) => {
      const active = button.dataset.timeFormat === clockFormat;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (clockEl) {
      clockEl.dataset.format = clockFormat;
      clockEl.dataset.seconds = clockShowSeconds ? 'true' : 'false';
    }
    if (timeSecondsSwitch) {
      timeSecondsSwitch.classList.toggle('on', clockShowSeconds);
    }
    syncClockAppearanceControls();
    applyClockAppearance();
  }

  function formatClockTime(date) {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    if (clockFormat === '24h') {
      return clockShowSeconds
        ? `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
        : `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHour = hours % 12 || 12;
    return clockShowSeconds
      ? `${normalizedHour}:${minutes}:${seconds} ${suffix}`
      : `${normalizedHour}:${minutes} ${suffix}`;
  }

  function setClockFormat(value) {
    clockFormat = value === "24h" ? "24h" : "12h";
    saveClockSettings();
    syncClockSettings();
    updateClock();
  }

  function setClockShowSeconds(value) {
    clockShowSeconds = Boolean(value);
    saveClockSettings();
    syncClockSettings();
    updateClock();
  }

  function cloneClockAppearanceDefaults() {
    return JSON.parse(JSON.stringify(CLOCK_APPEARANCE_DEFAULTS));
  }

  function normalizeClockAppearance(value) {
    const defaults = cloneClockAppearanceDefaults();
    const source = value && typeof value === 'object' ? value : {};

    for (const part of Object.keys(defaults)) {
      const entry = source[part] && typeof source[part] === 'object' ? source[part] : {};
      const defaultEntry = defaults[part];
      const size = Number(entry.size);
      defaults[part] = {
        font: CLOCK_FONT_OPTIONS.some((option) => option.value === entry.font) ? entry.font : defaultEntry.font,
        size: Number.isFinite(size) ? size : defaultEntry.size,
        color: CLOCK_COLOR_OPTIONS.some((option) => option.value === entry.color) ? entry.color : defaultEntry.color
      };
    }

    return defaults;
  }

  function normalizeClockSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      format: source.format === '24h' ? '24h' : CLOCK_SETTINGS_DEFAULTS.format,
      showSeconds: typeof source.showSeconds === 'boolean' ? source.showSeconds : CLOCK_SETTINGS_DEFAULTS.showSeconds
    };
  }

  function saveClockSettings() {
    chromeApi?.storage?.local?.set({
      [CLOCK_SETTINGS_STORAGE_KEY]: normalizeClockSettings({
        format: clockFormat,
        showSeconds: clockShowSeconds
      })
    });
  }

  function getClockFontVariable(font) {
    if (font === 'mono') return 'var(--font-mono)';
    if (font === 'serif') return 'var(--font-serif)';
    return 'var(--font-sans)';
  }

  function resolveClockColor(mode, contrast, part) {
    const isDark = contrast === 'dark';
    if (mode === 'light') {
      return part === 'time' ? '#ffffff' : 'rgba(255, 255, 255, 0.92)';
    }
    if (mode === 'dark') {
      return part === 'time' ? '#121216' : 'rgba(18, 18, 22, 0.9)';
    }
    if (mode === 'muted') {
      return isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 18, 22, 0.62)';
    }
    if (part === 'date') {
      return isDark ? 'rgba(255, 255, 255, 0.78)' : 'rgba(18, 18, 22, 0.68)';
    }
    if (part === 'day') {
      return isDark ? 'rgba(255, 255, 255, 0.96)' : 'rgba(18, 18, 22, 0.9)';
    }
    return isDark ? '#ffffff' : '#121216';
  }

  function applyClockAppearance() {
    if (!clockEl) return;
    const contrast = clockEl.dataset.contrast || 'light';
    const timeAppearance = clockAppearance.time;
    const dayAppearance = clockAppearance.day;
    const dateAppearance = clockAppearance.date;

    clockEl.style.setProperty('--clock-time-font', getClockFontVariable(timeAppearance.font));
    clockEl.style.setProperty('--clock-day-font', getClockFontVariable(dayAppearance.font));
    clockEl.style.setProperty('--clock-date-font', getClockFontVariable(dateAppearance.font));
    clockEl.style.setProperty('--clock-time-size', `${timeAppearance.size}rem`);
    clockEl.style.setProperty('--clock-day-size', `${dayAppearance.size}rem`);
    clockEl.style.setProperty('--clock-date-size', `${dateAppearance.size}rem`);
    clockEl.style.setProperty('--clock-time-color', resolveClockColor(timeAppearance.color, contrast, 'time'));
    clockEl.style.setProperty('--clock-day-color', resolveClockColor(dayAppearance.color, contrast, 'day'));
    clockEl.style.setProperty('--clock-date-color', resolveClockColor(dateAppearance.color, contrast, 'date'));
    clockEl.style.setProperty(
      '--clock-time-shadow',
      contrast === 'dark' && timeAppearance.color !== 'dark' ? '0 2px 18px rgba(0, 0, 0, 0.4)' : 'none'
    );
  }

  function syncClockAppearanceControls() {
    for (const part of Object.keys(clockAppearanceControls)) {
      const controls = clockAppearanceControls[part];
      const appearance = clockAppearance[part];
      if (!controls || !appearance) continue;
      if (controls.font) controls.font.value = appearance.font;
      if (controls.size) controls.size.value = String(appearance.size);
      if (controls.sizeValue) controls.sizeValue.textContent = `${appearance.size.toFixed(appearance.size >= 2 ? 1 : 2)}rem`;
      if (controls.color) controls.color.value = appearance.color;
    }
  }

  function updateClockAppearance(part, patch) {
    clockAppearance = normalizeClockAppearance({
      ...clockAppearance,
      [part]: {
        ...(clockAppearance[part] || {}),
        ...patch
      }
    });
    chromeApi?.storage?.local?.set({ [CLOCK_APPEARANCE_STORAGE_KEY]: clockAppearance });
    syncClockSettings();
    updateClock();
  }

  function resetClockAppearance() {
    clockAppearance = cloneClockAppearanceDefaults();
    chromeApi?.storage?.local?.set({ [CLOCK_APPEARANCE_STORAGE_KEY]: clockAppearance });
    syncClockSettings();
    updateClock();
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
    if (searchCollapsed && !query) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      flatItems = [];
      activeIndex = -1;
      if (panelEl) {
        panelEl.dataset.collapsed = 'true';
      }
      return;
    }
    if (Array.isArray(result)) {
      result = { tabs: [], history: [] };
    }
    suggestions.innerHTML = '';
    flatItems = [];
    activeIndex = -1;

    const tabs = result.tabs || [];
    const history = result.history || [];
    const commands = result.commands || [];
    const urlActions = result.urlActions || [];
    const googleSuggestions = result.googleSuggestions || [];
    const recentSearches = result.recentSearches || [];
    const hasResults = tabs.length || history.length;
    const isCommandMode = isCommandQuery(query);
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

    if (isCommandMode) {
      if (commands.length) {
        appendSection('Commands', commands);
        if (flatItems.length) {
          setActiveIndex(0);
        }
      }
    } else if (query && urlActions.length) {
      appendSection('Open page', urlActions);
      if (flatItems.length) {
        setActiveIndex(0);
      }
    } else if (isEmptyState && recentSearches.length) {
      appendSection('Recent Google Searches', recentSearches);
      if (flatItems.length) {
        setActiveIndex(0);
      }
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
    if (panelEl) {
      panelEl.dataset.collapsed = flatItems.length || query ? 'false' : 'true';
    }
  }

  function setSearchCollapsed(collapsed) {
    searchCollapsed = Boolean(collapsed);
    flatItems = [];
    activeIndex = -1;
    if (suggestions) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
    }
    if (panelEl) {
      panelEl.dataset.collapsed = searchCollapsed ? 'true' : 'false';
    }
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
        img.src = item.iconUrl || item.favIconUrl || getFaviconFallbackUrl(item.url) || 'assets/icon128.png';
        img.onerror = function() {
          this.src = 'assets/icon128.png';
        };
        iconWrap.appendChild(img);
      } else {
        iconWrap.innerHTML = item.type === 'google-suggestion'
          ? iconGoogle()
          : item.icon || iconBolt();
        if (item.action === 'google' || item.action === 'youtube' || item.type === 'command') {
          iconWrap.style.background = 'transparent';
          iconWrap.setAttribute('data-branded', 'true');
        }
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
          : item.type === 'command'
            ? 'Command'
            : 'Action';

      row.appendChild(iconWrap);
      row.appendChild(body);
      row.appendChild(meta);

      const index = flatItems.length;
      flatItems.push(item);
      row.dataset.index = String(index);
      row.dataset.kind = item.type || 'action';
      row.addEventListener('mouseenter', () => setActiveIndex(index));
      row.addEventListener('click', async () => {
        await openItem(item);
      });

      suggestions.appendChild(row);
    }
  }

  async function openItem(item) {
    try {
      await chromeApi?.runtime?.sendMessage({ action: 'open-suggestion', item });
    } catch (err) {
      console.error('RayTabs open suggestion error:', err);
    }
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
    if (item.type === 'command') return `command:${item.command || item.title || ''}`;
    if (item.type === 'action') return `action:${item.action || ''}:${item.query || ''}`;
    return `${item.type || 'item'}:${item.url || item.title || item.subtitle || ''}`;
  }

  function normalizeUnsplashSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    const mode = Object.prototype.hasOwnProperty.call(UNSPLASH_MODE_QUERIES, source.mode) ? source.mode : UNSPLASH_DEFAULT_SETTINGS.mode;
    const accessKey = typeof source.accessKey === 'string' && source.accessKey.trim()
      ? source.accessKey.trim()
      : UNSPLASH_DEFAULT_SETTINGS.accessKey;
    const rotationMode = source.rotationMode === 'fixed' ? 'fixed' : UNSPLASH_DEFAULT_SETTINGS.rotationMode;
    const selectedPhotoId = typeof source.selectedPhotoId === 'string' ? source.selectedPhotoId.trim() : "";
    return {
      enabled: typeof source.enabled === 'boolean' ? source.enabled : UNSPLASH_DEFAULT_SETTINGS.enabled,
      mode,
      accessKey,
      rotationMode,
      selectedPhotoId
    };
  }

  function createEmptyUnsplashCache() {
    return Object.fromEntries(Object.keys(UNSPLASH_MODE_QUERIES).map((mode) => [mode, []]));
  }

  function normalizeUnsplashCache(value) {
    const source = value && typeof value === 'object' ? value : {};
    const cache = createEmptyUnsplashCache();

    for (const mode of Object.keys(cache)) {
      const items = Array.isArray(source[mode]) ? source[mode] : [];
      cache[mode] = items
        .map((item) => normalizeUnsplashPhoto(item))
        .filter(Boolean)
        .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
    }

    return cache;
  }

  function syncUnsplashDrawer() {
    if (!settingsDrawer) return;

    if (settingsAccessInput) {
      settingsAccessInput.value = unsplashSettings.accessKey || "";
    }

    for (const button of backgroundCategoryButtons) {
      const active = button.dataset.mode === unsplashSettings.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    if (backgroundCategoryModalTitle) {
      const label = activeBackgroundCategory === 'random'
        ? 'Random'
        : activeBackgroundCategory.charAt(0).toUpperCase() + activeBackgroundCategory.slice(1);
      backgroundCategoryModalTitle.textContent = `${label} backgrounds`;
    }

    if (backgroundCategoryModalCopy) {
      backgroundCategoryModalCopy.textContent = 'Choose random rotation within this category or pin one image from its cached library.';
    }

    if (backgroundCategoryModalRandomButton) {
      const active = unsplashSettings.mode === activeBackgroundCategory && unsplashSettings.rotationMode === 'every-tab';
      backgroundCategoryModalRandomButton.classList.toggle('active', active);
      backgroundCategoryModalRandomButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    if (backgroundCategoryModalSingleButton) {
      const active = unsplashSettings.mode === activeBackgroundCategory && unsplashSettings.rotationMode === 'fixed';
      backgroundCategoryModalSingleButton.classList.toggle('active', active);
      backgroundCategoryModalSingleButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    const enabledSwitch = settingsDrawer.querySelector('.raytabs-settings-switch[data-setting="enabled"]');
    if (enabledSwitch) {
      enabledSwitch.classList.toggle('on', unsplashSettings.enabled);
    }

    if (settingsStatus) {
      settingsStatus.textContent = unsplashStatusText;
    }
    if (backgroundCategoryModalStatus) {
      backgroundCategoryModalStatus.textContent = unsplashStatusText;
    }
    syncPinnedPreview(activeBackgroundCategory);

    if (backgroundLayer) {
      backgroundLayer.dataset.enabled = unsplashSettings.enabled ? 'true' : 'false';
      backgroundLayer.dataset.mode = unsplashSettings.mode;
      backgroundLayer.dataset.rotationMode = unsplashSettings.rotationMode;
    }

    if (backgroundCredit) {
      backgroundCredit.hidden = !unsplashSettings.enabled || !backgroundLayer?.dataset.photo;
    }

    syncUnsplashGallery(activeBackgroundCategory);

    syncClockSettings();
  }

  async function updateUnsplashSettings(patch = {}, options = {}) {
    const nextPatch = { ...patch };
    if (nextPatch.mode && nextPatch.mode !== unsplashSettings.mode && !Object.prototype.hasOwnProperty.call(nextPatch, 'selectedPhotoId')) {
      nextPatch.selectedPhotoId = "";
    }
    unsplashSettings = normalizeUnsplashSettings({ ...unsplashSettings, ...nextPatch });
    chromeApi?.storage?.local?.set({ [UNSPLASH_STORAGE_KEY]: unsplashSettings });
    syncUnsplashDrawer();
    if (options.refresh !== false) {
      await renderUnsplashBackground({ force: true });
    }
  }

  function getUnsplashPhotoCardData(photo, index) {
    const title = (photo?.description || photo?.alt_description || 'Untitled photo').trim();
    const creatorName = (photo?.user?.name || 'Unsplash').trim();
    const creatorHandle = photo?.user?.username ? `@${photo.user.username.trim()}` : 'No handle';
    const description = (photo?.description || 'No description provided').trim();
    const altText = (photo?.alt_description || 'No alt text provided').trim();
    const color = photo?.color ? photo.color.trim().toUpperCase() : 'Not provided';

    return {
      title,
      creatorName,
      creatorHandle,
      description,
      altText,
      color,
      indexLabel: `Image ${index}`
    };
  }

  function applyUnsplashCardImageState(card, media, image) {
    card.setAttribute('aria-busy', 'true');

    const markLoaded = () => {
      media.dataset.state = 'loaded';
      card.classList.add('is-image-loaded');
      card.classList.remove('is-image-loading', 'is-image-error');
      card.removeAttribute('aria-busy');
    };

    const markError = () => {
      media.dataset.state = 'error';
      card.classList.add('is-image-error');
      card.classList.remove('is-image-loading', 'is-image-loaded');
      card.removeAttribute('aria-busy');
    };

    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markError, { once: true });

    if (image.complete) {
      if (image.naturalWidth > 0) {
        markLoaded();
      } else {
        markError();
      }
    }
  }

  function syncUnsplashGallery(mode = unsplashSettings.mode) {
    if (!backgroundGallery || !backgroundGalleryEmpty) return;

    backgroundGallery.replaceChildren();
    const bucket = getUnsplashBucket(mode);
    const currentPhotoId = backgroundLayer?.dataset.photo || "";
    const totalPages = Math.max(1, Math.ceil(bucket.length / BACKGROUND_GALLERY_PAGE_SIZE));
    backgroundGalleryPage = Math.min(backgroundGalleryPage, totalPages - 1);
    const startIndex = backgroundGalleryPage * BACKGROUND_GALLERY_PAGE_SIZE;
    const visibleItems = bucket.slice(startIndex, startIndex + BACKGROUND_GALLERY_PAGE_SIZE);

    if (backgroundGalleryPageLabel) {
      backgroundGalleryPageLabel.textContent = `${bucket.length ? backgroundGalleryPage + 1 : 0} / ${totalPages}`;
    }
    if (backgroundGalleryPrevButton) {
      backgroundGalleryPrevButton.disabled = backgroundGalleryPage <= 0;
    }
    if (backgroundGalleryNextButton) {
      backgroundGalleryNextButton.disabled = !unsplashSettings.enabled;
    }

    if (!bucket.length) {
      backgroundGallery.hidden = true;
      backgroundGalleryEmpty.hidden = false;
      backgroundGalleryEmpty.textContent = unsplashSettings.enabled
        ? 'No photos cached yet. Fetch a few to build your library.'
        : 'Enable backgrounds to browse and pin images.';
      return;
    }

    backgroundGallery.hidden = false;
    backgroundGalleryEmpty.hidden = true;

    for (const [index, photo] of visibleItems.entries()) {
      const cardData = getUnsplashPhotoCardData(photo, startIndex + index + 1);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'raytabs-background-card';
      button.classList.add('is-image-loading');
      if (photo.id === currentPhotoId) {
        button.classList.add('active');
      }
      if (unsplashSettings.mode === mode && unsplashSettings.rotationMode === 'fixed' && photo.id === unsplashSettings.selectedPhotoId) {
        button.classList.add('selected');
      }

      const media = document.createElement('div');
      media.className = 'raytabs-background-card-media';
      media.dataset.state = 'loading';

      const preview = document.createElement('img');
      preview.className = 'raytabs-background-card-image';
      preview.alt = photo.alt_description || photo.description || 'Background preview';
      preview.loading = 'lazy';
      preview.decoding = 'async';
      preview.referrerPolicy = 'no-referrer';
      preview.src = buildUnsplashImageUrl(photo, { width: 720, height: 540, quality: 76 });

      const mediaSkeleton = document.createElement('div');
      mediaSkeleton.className = 'raytabs-background-card-media-skeleton';
      mediaSkeleton.setAttribute('aria-hidden', 'true');
      mediaSkeleton.innerHTML = `
        <span class="raytabs-background-card-skeleton-chip"></span>
        <span class="raytabs-background-card-skeleton-line"></span>
        <span class="raytabs-background-card-skeleton-line short"></span>
      `;

      const mediaFade = document.createElement('div');
      mediaFade.className = 'raytabs-background-card-media-fade';
      mediaFade.setAttribute('aria-hidden', 'true');

      applyUnsplashCardImageState(button, media, preview);

      media.appendChild(preview);
      media.appendChild(mediaSkeleton);
      media.appendChild(mediaFade);

      const meta = document.createElement('div');
      meta.className = 'raytabs-background-card-meta';
      meta.innerHTML = `
        <div class="raytabs-background-card-meta-head">
          <small>${escapeHtml(cardData.indexLabel)}</small>
          <strong>${escapeHtml(cardData.title)}</strong>
        </div>
        <div class="raytabs-background-card-details">
          <div class="raytabs-background-card-detail">
            <span class="raytabs-background-card-detail-label">Creator</span>
            <span class="raytabs-background-card-detail-value">${escapeHtml(cardData.creatorName)}</span>
          </div>
          <div class="raytabs-background-card-detail">
            <span class="raytabs-background-card-detail-label">Handle</span>
            <span class="raytabs-background-card-detail-value">${escapeHtml(cardData.creatorHandle)}</span>
          </div>
          <div class="raytabs-background-card-detail">
            <span class="raytabs-background-card-detail-label">Description</span>
            <span class="raytabs-background-card-detail-value">${escapeHtml(cardData.description)}</span>
          </div>
          <div class="raytabs-background-card-detail">
            <span class="raytabs-background-card-detail-label">Alt text</span>
            <span class="raytabs-background-card-detail-value">${escapeHtml(cardData.altText)}</span>
          </div>
          <div class="raytabs-background-card-detail">
            <span class="raytabs-background-card-detail-label">Color</span>
            <span class="raytabs-background-card-detail-value">${escapeHtml(cardData.color)}</span>
          </div>
        </div>
      `;

      const pin = document.createElement('div');
      pin.className = 'raytabs-background-card-pin';
      pin.innerHTML = photo.id === unsplashSettings.selectedPhotoId && unsplashSettings.mode === mode && unsplashSettings.rotationMode === 'fixed'
        ? `${iconStar()}<span>Pinned</span>`
        : `${iconStarOutline()}<span>Pin</span>`;

      button.appendChild(pin);
      button.appendChild(media);
      button.appendChild(meta);
      button.addEventListener('click', () => selectUnsplashPhoto(photo.id, mode));
      backgroundGallery.appendChild(button);
    }
  }

  function syncPinnedPreview(mode = activeBackgroundCategory) {
    if (!backgroundCategoryPinnedPreview) return;

    const pinned = getSelectedUnsplashPhoto(mode);
    const isPinnedMode = unsplashSettings.mode === mode && unsplashSettings.rotationMode === 'fixed';
    backgroundCategoryPinnedPreview.classList.add('is-image-loading');

    if (!pinned) {
      backgroundCategoryPinnedPreview.classList.remove('is-image-loaded', 'is-image-error');
      backgroundCategoryPinnedPreview.innerHTML = `
        <div class="raytabs-settings-section-title">Selected image</div>
        <div class="raytabs-settings-section-copy">No image pinned for this category yet.</div>
      `;
      return;
    }

    const cardData = getUnsplashPhotoCardData(pinned, 1);
    backgroundCategoryPinnedPreview.innerHTML = `
      <div class="raytabs-settings-section-title">Selected image</div>
      <div class="raytabs-selected-image-preview">
        <div class="raytabs-selected-image-preview-media">
          <img
            class="raytabs-selected-image-preview-photo"
            src="${escapeHtml(buildUnsplashImageUrl(pinned, { width: 900, height: 620, quality: 76 }))}"
            alt="${escapeHtml(pinned.alt_description || pinned.description || 'Selected image')}"
            referrerpolicy="no-referrer"
          />
          <div class="raytabs-selected-image-preview-skeleton" aria-hidden="true">
            <span class="raytabs-background-card-skeleton-chip"></span>
            <span class="raytabs-background-card-skeleton-line"></span>
            <span class="raytabs-background-card-skeleton-line short"></span>
          </div>
          <div class="raytabs-selected-image-preview-fade" aria-hidden="true"></div>
        </div>
        <div class="raytabs-selected-image-preview-meta">
          <div class="raytabs-selected-image-preview-state">${isPinnedMode ? 'Pinned in this category' : 'Saved image'}</div>
          <strong>${escapeHtml(cardData.title)}</strong>
          <span>${escapeHtml(cardData.creatorName)} &middot; ${escapeHtml(cardData.creatorHandle)}</span>
          <span>${escapeHtml(cardData.description)}</span>
          <span>${escapeHtml(cardData.altText)}</span>
          <span>${escapeHtml(cardData.color)}</span>
        </div>
      </div>
    `;

    const previewImage = backgroundCategoryPinnedPreview.querySelector('.raytabs-selected-image-preview-photo');
    const previewMedia = backgroundCategoryPinnedPreview.querySelector('.raytabs-selected-image-preview-media');
    if (previewImage && previewMedia) {
      applyUnsplashCardImageState(backgroundCategoryPinnedPreview, previewMedia, previewImage);
    }
  }

  async function saveUnsplashAccessKey() {
    const nextKey = (settingsAccessInput?.value || "").trim();
    if (!nextKey) {
      unsplashStatusText = "Add an access key first.";
      syncUnsplashDrawer();
      return;
    }
    await updateUnsplashSettings({ accessKey: nextKey }, { refresh: true });
    unsplashStatusText = "Access key saved.";
    syncUnsplashDrawer();
  }

  async function refreshUnsplashBackground() {
    if (!unsplashSettings.enabled) {
      unsplashStatusText = "Enable backgrounds first.";
      syncUnsplashDrawer();
      return;
    }

    if (isBackgroundCategoryModalOpen() && activeBackgroundCategory !== unsplashSettings.mode) {
      await updateUnsplashSettings({
        mode: activeBackgroundCategory,
        rotationMode: 'every-tab',
        selectedPhotoId: ""
      }, { refresh: false });
    }

    if (unsplashSettings.rotationMode === 'fixed') {
      await ensureUnsplashCache(unsplashSettings.mode, unsplashSettings.accessKey, UNSPLASH_CACHE_MINIMUM);
      const bucket = getUnsplashBucket(unsplashSettings.mode);
      if (!bucket.length) {
        unsplashStatusText = "No fixed background available yet.";
        syncUnsplashDrawer();
        return;
      }

      const currentIndex = bucket.findIndex((photo) => photo.id === unsplashSettings.selectedPhotoId);
      const nextPhoto = bucket[(currentIndex + 1 + bucket.length) % bucket.length] || bucket[0];
      await selectUnsplashPhoto(nextPhoto.id);
      return;
    }

    await renderUnsplashBackground({ force: true });
  }

  async function fetchMoreUnsplashPhotos() {
    if (!unsplashSettings.enabled) {
      unsplashStatusText = "Enable backgrounds first.";
      syncUnsplashDrawer();
      return;
    }

    unsplashStatusText = "Fetching more photos...";
    syncUnsplashDrawer();

    try {
      await fetchAndAppendUnsplashPhotos(activeBackgroundCategory, unsplashSettings.accessKey, 4);
      unsplashStatusText = "More photos added to your library.";
      syncUnsplashDrawer();
    } catch (err) {
      console.error('RayTabs Unsplash fetch more error:', err);
      unsplashStatusText = "Could not fetch more photos right now.";
      syncUnsplashDrawer();
    }
  }

  async function changeBackgroundGalleryPage(delta) {
    const nextPage = Math.max(0, backgroundGalleryPage + delta);
    if (nextPage === backgroundGalleryPage && delta < 0) return;

    let bucket = getUnsplashBucket(activeBackgroundCategory);
    const desiredStart = nextPage * BACKGROUND_GALLERY_PAGE_SIZE;

    if (delta > 0 && desiredStart >= bucket.length) {
      unsplashStatusText = "Loading next image page...";
      syncUnsplashDrawer();
      try {
        let attempts = 0;
        while (desiredStart >= bucket.length && attempts < 3) {
          await fetchAndAppendUnsplashPhotos(activeBackgroundCategory, unsplashSettings.accessKey, BACKGROUND_GALLERY_PAGE_SIZE);
          bucket = getUnsplashBucket(activeBackgroundCategory);
          attempts += 1;
        }
      } catch (err) {
        console.error('RayTabs gallery page load error:', err);
        unsplashStatusText = "Could not load the next image page.";
        syncUnsplashDrawer();
        return;
      }
    } else if (delta > 0 && desiredStart + BACKGROUND_GALLERY_PAGE_SIZE > bucket.length) {
      void fetchAndAppendUnsplashPhotos(activeBackgroundCategory, unsplashSettings.accessKey, BACKGROUND_GALLERY_PAGE_SIZE)
        .then(() => {
          unsplashStatusText = "Loaded more images for the next page.";
          syncUnsplashDrawer();
        })
        .catch((err) => {
          console.error('RayTabs gallery prefetch error:', err);
        });
    }

    const refreshedBucket = getUnsplashBucket(activeBackgroundCategory);
    const maxPage = Math.max(0, Math.ceil(refreshedBucket.length / BACKGROUND_GALLERY_PAGE_SIZE) - 1);
    backgroundGalleryPage = Math.min(nextPage, Math.max(nextPage, maxPage));
    unsplashStatusText = `Viewing image page ${backgroundGalleryPage + 1}.`;
    syncUnsplashDrawer();
  }

  async function selectUnsplashPhoto(photoId, mode = activeBackgroundCategory) {
    const photo = getUnsplashBucket(mode).find((item) => item.id === photoId);
    if (!photo) return;
    await updateUnsplashSettings({
      mode,
      rotationMode: 'fixed',
      selectedPhotoId: photo.id
    }, { refresh: true });
    unsplashStatusText = "Pinned selected background.";
    syncUnsplashDrawer();
  }

  async function setCategoryRotationMode(rotationMode) {
    if (rotationMode === 'fixed') {
      await ensureUnsplashCache(activeBackgroundCategory, unsplashSettings.accessKey, UNSPLASH_CACHE_MINIMUM);
      const selected = getSelectedUnsplashPhoto(activeBackgroundCategory) || getUnsplashBucket(activeBackgroundCategory)[0];
      await updateUnsplashSettings({
        mode: activeBackgroundCategory,
        rotationMode: 'fixed',
        selectedPhotoId: selected?.id || ""
      }, { refresh: true });
      unsplashStatusText = selected
        ? "Pinned a single image for this category."
        : "Choose an image after fetching some photos.";
      syncUnsplashDrawer();
      return;
    }

    await updateUnsplashSettings({
      mode: activeBackgroundCategory,
      rotationMode: 'every-tab',
      selectedPhotoId: ""
    }, { refresh: true });
    unsplashStatusText = "Random rotation enabled for this category.";
    syncUnsplashDrawer();
  }

  async function renderUnsplashBackground({ force = false } = {}) {
    if (!backgroundImage || !backgroundLayer) return;

    if (!unsplashSettings.enabled) {
      unsplashRequestToken += 1;
      backgroundImage.removeAttribute('src');
      backgroundLayer.dataset.loaded = 'false';
      backgroundLayer.dataset.photo = '';
      applyClockContrast(null);
      unsplashStatusText = "Backgrounds are off.";
      syncUnsplashDrawer();
      return;
    }

    if (!force && backgroundLayer.dataset.loaded === 'true' && backgroundLayer.dataset.mode === unsplashSettings.mode) {
      return;
    }

    const requestToken = ++unsplashRequestToken;
    backgroundLayer.dataset.loaded = 'loading';
    unsplashStatusText = "Loading Unsplash background...";
    syncUnsplashDrawer();

    try {
      const photo = await getUnsplashPhotoForRender();
      if (requestToken !== unsplashRequestToken) return;

      if (!photo) {
        throw new Error("No cached photo available");
      }

      const imageUrl = buildUnsplashImageUrl(photo);
      const preload = new Image();

      await new Promise((resolve, reject) => {
        preload.onload = resolve;
        preload.onerror = reject;
        preload.referrerPolicy = 'no-referrer';
        preload.src = imageUrl;
      });

      if (requestToken !== unsplashRequestToken) return;

      backgroundImage.src = imageUrl;
      backgroundLayer.dataset.loaded = 'true';
      backgroundLayer.dataset.mode = unsplashSettings.mode;
      backgroundLayer.dataset.photo = photo?.id || "";
      backgroundLayer.dataset.photoColor = photo?.color || "";
      applyClockContrast(photo?.color || null);
      unsplashStatusText = "Unsplash background applied.";
      updateUnsplashCredit(photo);
      syncUnsplashDrawer();
    } catch (err) {
      if (requestToken !== unsplashRequestToken) return;
      console.error('RayTabs Unsplash background error:', err);
      backgroundLayer.dataset.loaded = 'error';
      backgroundLayer.dataset.photo = '';
      backgroundLayer.dataset.photoColor = '';
      backgroundImage.removeAttribute('src');
      applyClockContrast(null);
      unsplashStatusText = "Unable to load Unsplash right now.";
      updateUnsplashCredit(null);
      syncUnsplashDrawer();
    }
  }

  async function getUnsplashPhotoForRender() {
    const mode = unsplashSettings.mode;
    const accessKey = unsplashSettings.accessKey;
    await ensureUnsplashCache(mode, accessKey, UNSPLASH_CACHE_MINIMUM);
    if (unsplashSettings.rotationMode === 'fixed') {
      const selected = getSelectedUnsplashPhoto(mode);
      if (selected) {
        return selected;
      }
      const fallback = getUnsplashBucket(mode)[0] || null;
      if (fallback && unsplashSettings.selectedPhotoId !== fallback.id) {
        await updateUnsplashSettings({ selectedPhotoId: fallback.id }, { refresh: false });
      }
      return fallback;
    }

    return getNextUnsplashPhotoForMode(mode, accessKey);
  }

  async function getNextUnsplashPhotoForMode(mode, accessKey) {
    await ensureUnsplashCache(mode, accessKey, UNSPLASH_CACHE_MINIMUM);
    const bucket = unsplashCache[mode] || [];
    const photo = bucket.shift() || null;
    if (photo) {
      bucket.push(photo);
      chromeApi?.storage?.local?.set({ [UNSPLASH_CACHE_STORAGE_KEY]: unsplashCache });
      void ensureUnsplashCache(mode, accessKey, UNSPLASH_CACHE_MINIMUM);
    }
    return photo;
  }

  async function ensureUnsplashCache(mode, accessKey, minimum = 3) {
    const bucket = unsplashCache[mode] || (unsplashCache[mode] = []);
    if (bucket.length >= minimum || !accessKey) {
      return bucket;
    }

    let attempts = 0;
    while (bucket.length < minimum && attempts < 3) {
      const needed = minimum - bucket.length;
      const batch = await fetchUnsplashPhotoBatch(mode, accessKey, needed);
      const existingIds = new Set(bucket.map((item) => item.id));

      for (const photo of batch) {
        if (!photo?.id || existingIds.has(photo.id)) continue;
        bucket.push(photo);
        existingIds.add(photo.id);
      }

      attempts += 1;
      if (!batch.length) break;
    }

    chromeApi?.storage?.local?.set({ [UNSPLASH_CACHE_STORAGE_KEY]: unsplashCache });
    return bucket;
  }

  async function primeUnsplashCache() {
    const accessKey = unsplashSettings.accessKey || UNSPLASH_ACCESS_KEY;
    const modes = Object.keys(UNSPLASH_MODE_QUERIES);
    await Promise.allSettled(modes.map((mode) => ensureUnsplashCache(mode, accessKey, UNSPLASH_CACHE_MINIMUM)));
  }

  async function fetchAndAppendUnsplashPhotos(mode, accessKey, count = 1) {
    const bucket = getUnsplashBucket(mode);
    const batch = await fetchUnsplashPhotoBatch(mode, accessKey, count);
    const existingIds = new Set(bucket.map((item) => item.id));

    for (const photo of batch) {
      if (!photo?.id || existingIds.has(photo.id)) continue;
      bucket.push(photo);
      existingIds.add(photo.id);
    }

    await chromeApi?.storage?.local?.set({ [UNSPLASH_CACHE_STORAGE_KEY]: unsplashCache });
    return bucket;
  }

  function getUnsplashBucket(mode) {
    return unsplashCache[mode] || (unsplashCache[mode] = []);
  }

  function getSelectedUnsplashPhoto(mode) {
    const selectedPhotoId = unsplashSettings.selectedPhotoId;
    if (!selectedPhotoId) return null;
    return getUnsplashBucket(mode).find((photo) => photo.id === selectedPhotoId) || null;
  }

  async function fetchUnsplashPhotoBatch(mode, accessKey, count = 1) {
    const query = UNSPLASH_MODE_QUERIES[mode] || "";
    const endpoint = new URL("https://api.unsplash.com/photos/random");
    endpoint.searchParams.set("client_id", accessKey || UNSPLASH_ACCESS_KEY);
    endpoint.searchParams.set("orientation", "landscape");
    endpoint.searchParams.set("content_filter", "high");
    endpoint.searchParams.set("count", String(Math.max(1, count)));
    if (query) {
      endpoint.searchParams.set("query", query);
    }

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      throw new Error(`Unsplash request failed with ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : [payload];
    return items.map((photo) => normalizeUnsplashPhoto(photo)).filter(Boolean);
  }

  function normalizeUnsplashPhoto(photo) {
    if (!photo?.id || !photo?.urls) return null;
    return {
      id: photo.id,
      description: photo.description || "",
      alt_description: photo.alt_description || "",
      color: photo.color || "",
      urls: {
        raw: photo.urls.raw || "",
        full: photo.urls.full || "",
        regular: photo.urls.regular || ""
      },
      links: {
        html: photo.links?.html || ""
      },
      user: {
        name: photo.user?.name || "",
        username: photo.user?.username || "",
        links: {
          html: photo.user?.links?.html || ""
        }
      }
    };
  }

  function getContrastModeFromColor(color) {
    if (!color || typeof color !== 'string') return 'light';
    const hex = color.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return 'light';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
    return luminance < 0.45 ? 'dark' : 'light';
  }

  function srgbToLinear(value) {
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function createAccordionSection(title, description, key, open = false) {
    const element = document.createElement('section');
    element.className = 'raytabs-settings-group';
    element.dataset.section = key;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'raytabs-settings-group-toggle';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-controls', `raytabs-settings-${key}`);
    toggle.innerHTML = `
      <span>
        <span class="raytabs-settings-group-title">${title}</span>
        <span class="raytabs-settings-group-copy">${description}</span>
      </span>
      <span class="raytabs-settings-group-chevron">${iconChevron()}</span>
    `;

    const body = document.createElement('div');
    body.className = 'raytabs-settings-group-body';
    body.id = `raytabs-settings-${key}`;
    body.setAttribute('aria-hidden', open ? 'false' : 'true');
    body.dataset.state = open ? 'open' : 'closed';

    settingsSections[key] = { element, toggle, body };

    toggle.addEventListener('click', () => {
      const nextOpen = body.dataset.state !== 'open';
      setAccordionSectionOpen(key, nextOpen);
    });

    setAccordionSectionOpen(key, open, false);

    element.appendChild(toggle);
    element.appendChild(body);
    return { element, body, toggle };
  }

  function setAccordionSectionOpen(key, open, persist = true) {
    const section = settingsSections[key];
    if (!section) return;
    section.body.dataset.state = open ? 'open' : 'closed';
    section.body.setAttribute('aria-hidden', open ? 'false' : 'true');
    section.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    section.element.classList.toggle('open', open);
    if (persist) {
      chromeApi?.storage?.local?.set({ [SETTINGS_ACCORDION_STORAGE_KEY]: getAccordionState() });
    }
  }

  function getAccordionState() {
    return Object.fromEntries(
      Object.entries(settingsSections).map(([key, section]) => [key, section.body.dataset.state === 'open'])
    );
  }

  function applyAccordionState(value) {
    const state = value && typeof value === 'object' ? value : {};
    for (const key of Object.keys(settingsSections)) {
      setAccordionSectionOpen(key, Boolean(state[key]), false);
    }
  }

  function setSettingsTab(tab, persist = true) {
    settingsActiveTab = tab === 'time' ? 'time' : 'backgrounds';
    settingsTabButtons.forEach((button) => {
      const active = button.dataset.tab === settingsActiveTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    Object.entries(settingsTabPanels).forEach(([key, panel]) => {
      const active = key === settingsActiveTab;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    if (persist) {
      chromeApi?.storage?.local?.set({ [SETTINGS_ACTIVE_TAB_STORAGE_KEY]: settingsActiveTab });
    }
  }

  function createClockAppearanceEditor(part, label, min, max, step) {
    const appearance = clockAppearance[part];
    const card = document.createElement('div');
    card.className = 'raytabs-settings-editor';

    const grid = document.createElement('div');
    grid.className = 'raytabs-settings-editor-grid';

    const fontField = document.createElement('label');
    fontField.className = 'raytabs-settings-field';
    fontField.innerHTML = '<span class="raytabs-settings-field-label">Font</span>';
    const fontSelect = document.createElement('select');
    fontSelect.className = 'raytabs-settings-select';
    CLOCK_FONT_OPTIONS.forEach((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      fontSelect.appendChild(node);
    });
    fontSelect.value = appearance.font;
    fontSelect.addEventListener('change', () => updateClockAppearance(part, { font: fontSelect.value }));
    fontField.appendChild(fontSelect);

    const colorField = document.createElement('label');
    colorField.className = 'raytabs-settings-field';
    colorField.innerHTML = '<span class="raytabs-settings-field-label">Color</span>';
    const colorSelect = document.createElement('select');
    colorSelect.className = 'raytabs-settings-select';
    CLOCK_COLOR_OPTIONS.forEach((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      colorSelect.appendChild(node);
    });
    colorSelect.value = appearance.color;
    colorSelect.addEventListener('change', () => updateClockAppearance(part, { color: colorSelect.value }));
    colorField.appendChild(colorSelect);

    const sizeField = document.createElement('label');
    sizeField.className = 'raytabs-settings-field raytabs-settings-field-range';
    sizeField.innerHTML = '<span class="raytabs-settings-field-label">Size</span>';
    const sizeWrap = document.createElement('div');
    sizeWrap.className = 'raytabs-settings-range-wrap';
    const sizeInput = document.createElement('input');
    sizeInput.className = 'raytabs-settings-range';
    sizeInput.type = 'range';
    sizeInput.min = String(min);
    sizeInput.max = String(max);
    sizeInput.step = String(step);
    sizeInput.value = String(appearance.size);
    const sizeValue = document.createElement('span');
    sizeValue.className = 'raytabs-settings-range-value';
    sizeValue.textContent = `${appearance.size.toFixed(appearance.size >= 2 ? 1 : 2)}rem`;
    sizeInput.addEventListener('input', () => {
      const nextSize = Number(sizeInput.value);
      sizeValue.textContent = `${nextSize.toFixed(nextSize >= 2 ? 1 : 2)}rem`;
      updateClockAppearance(part, { size: nextSize });
    });
    sizeWrap.appendChild(sizeInput);
    sizeWrap.appendChild(sizeValue);
    sizeField.appendChild(sizeWrap);

    grid.appendChild(fontField);
    grid.appendChild(colorField);
    grid.appendChild(sizeField);
    card.appendChild(grid);

    clockAppearanceControls[part] = {
      font: fontSelect,
      color: colorSelect,
      size: sizeInput,
      sizeValue
    };

    return card;
  }

  function createClockAppearanceSection(part, title, description, min, max, step) {
    const section = createAccordionSection(title, description, `clock-appearance-${part}`, false);
    section.element.classList.add('raytabs-settings-subgroup');
    section.body.appendChild(createClockAppearanceEditor(part, part, min, max, step));
    return section.element;
  }

  function buildUnsplashImageUrl(photo, { width = 1920, height = 1280, quality = 80 } = {}) {
    const raw = photo?.urls?.raw || photo?.urls?.full || photo?.urls?.regular || "";
    if (!raw) return "";
    const url = new URL(raw);
    url.searchParams.set("fit", "crop");
    url.searchParams.set("crop", "entropy");
    url.searchParams.set("w", String(width));
    url.searchParams.set("h", String(height));
    url.searchParams.set("q", String(quality));
    url.searchParams.set("fm", "webp");
    return url.toString();
  }

  function updateUnsplashCredit(photo) {
    if (!backgroundCredit) return;

    if (!photo?.user?.name) {
      backgroundCredit.replaceChildren();
      backgroundCredit.hidden = true;
      return;
    }

    const imageTitle = photo.description || photo.alt_description || 'Untitled photo';
    const photoHref = photo.links?.html || 'https://unsplash.com';
    const creatorHref = photo.user.links?.html || 'https://unsplash.com';

    backgroundCredit.replaceChildren();

    const photoLink = document.createElement('a');
    photoLink.className = 'raytabs-unsplash-link raytabs-unsplash-photo-link';
    photoLink.href = `${photoHref}?utm_source=raytabs&utm_medium=referral`;
    photoLink.target = '_blank';
    photoLink.rel = 'noreferrer noopener';
    photoLink.title = imageTitle;
    photoLink.innerHTML = `
      <span class="raytabs-unsplash-label">Image</span>
      <strong>${escapeHtml(imageTitle)}</strong>
    `;

    const creatorLink = document.createElement('a');
    creatorLink.className = 'raytabs-unsplash-link raytabs-unsplash-creator-link';
    creatorLink.href = `${creatorHref}?utm_source=raytabs&utm_medium=referral`;
    creatorLink.target = '_blank';
    creatorLink.rel = 'noreferrer noopener';
    creatorLink.title = photo.user.name;
    creatorLink.innerHTML = `
      <span class="raytabs-unsplash-label">By</span>
      <strong>${escapeHtml(photo.user.name)}</strong>
    `;

    backgroundCredit.appendChild(photoLink);
    backgroundCredit.appendChild(creatorLink);
    backgroundCredit.hidden = !unsplashSettings.enabled || !backgroundLayer?.dataset.photo;
  }

  function isSettingsDrawerOpen() {
    return Boolean(settingsDrawer?.classList.contains('open'));
  }

  function isBackgroundCategoryModalOpen() {
    return Boolean(backgroundCategoryModal && !backgroundCategoryModal.hidden);
  }

  function openBackgroundCategoryModal(mode) {
    activeBackgroundCategory = Object.prototype.hasOwnProperty.call(UNSPLASH_MODE_QUERIES, mode)
      ? mode
      : UNSPLASH_DEFAULT_SETTINGS.mode;
    backgroundGalleryPage = 0;
    syncUnsplashDrawer();
    if (!backgroundCategoryModal) return;
    backgroundCategoryModal.hidden = false;
  }

  function closeBackgroundCategoryModal() {
    if (!backgroundCategoryModal) return;
    backgroundCategoryModal.hidden = true;
  }

  function toggleSettingsDrawer() {
    if (isSettingsDrawerOpen()) {
      closeSettingsDrawer();
    } else {
      openSettingsDrawer();
    }
  }

  function openSettingsDrawer() {
    if (!settingsDrawer || !settingsBackdrop) return;
    settingsDrawer.classList.add('open');
    settingsBackdrop.classList.add('open');
    settingsToggle?.setAttribute('aria-expanded', 'true');
  }

  function closeSettingsDrawer() {
    if (!settingsDrawer || !settingsBackdrop) return;
    settingsDrawer.classList.remove('open');
    settingsBackdrop.classList.remove('open');
    settingsToggle?.setAttribute('aria-expanded', 'false');
    closeBackgroundCategoryModal();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function showRecentSearches() {
    if (searchCollapsed) {
      renderSuggestions({}, '');
      return;
    }
    const requestId = ++recentSearchRequestId;
    chromeApi?.storage?.local?.get(["recentSearches"])?.then((data) => {
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

  // Lucide icons
  function iconSearch() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  }

  function iconAll() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>';
  }

  function iconTabs() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>';
  }

  function iconHistory() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
  }

  function iconBolt() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
  }

  function iconPlusSquare() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>';
  }

  function iconGitHub() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.38 6.84 9.74.5.09.68-.22.68-.49v-1.72c-2.78.62-3.37-1.38-3.37-1.38-.45-1.17-1.1-1.48-1.1-1.48-.9-.63.07-.62.07-.62 1 .07 1.52 1.05 1.52 1.05.88 1.55 2.31 1.1 2.87.84.09-.66.35-1.1.63-1.35-2.22-.26-4.56-1.14-4.56-5.1 0-1.13.39-2.06 1.03-2.79-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.06A9.1 9.1 0 0 1 12 6.84c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.06 2.74-1.06.55 1.42.2 2.47.1 2.73.64.73 1.03 1.66 1.03 2.79 0 3.98-2.35 4.84-4.58 5.09.36.32.68.95.68 1.92v2.85c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"/></svg>';
  }

  function iconReddit() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 15c1.2.8 2.7 1.2 4 1.2s2.8-.4 4-1.2"/><path d="M12 9V5"/><path d="M16 6l2-1"/></svg>';
  }

  function iconSpark() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/><path d="M5 21l1.2-3.8L10 16l-3.8-1.2L5 11l-1.2 3.8L0 16l3.8 1.2L5 21z"/></svg>';
  }

  function iconX() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
  }

  function iconStar() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.53 6.12 20.62l1.12-6.56L2.48 9.42l6.58-.96L12 2.5z"/></svg>';
  }

  function iconStarOutline() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.9 5.88 6.5.94-4.7 4.58 1.1 6.48L12 17.77l-5.8 3.11 1.1-6.48-4.7-4.58 6.5-.94L12 3z"/></svg>';
  }

  function iconSettings() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  function iconChevron() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function iconChevronLeft() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  }

  function iconSun() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93 6.34 6.34"/><path d="M17.66 17.66 19.07 19.07"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07 6.34 17.66"/><path d="M17.66 6.34 19.07 4.93"/></svg>';
  }

  function iconMoon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.5A7 7 0 0 1 12 3z"/></svg>';
  }

  function iconMonitor() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>';
  }

  function iconGoogle() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
  }

  function iconYouTube() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/></svg>';
  }

  function isURL(str) {
    // Check if it looks like a URL
    const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i;
    const domainPattern = /^[\w-]+(\.[\w-]+)+$/i;
    
    // Match full URLs or domain-like strings
    if (urlPattern.test(str) || domainPattern.test(str)) {
      return true;
    }
    
    // Check for localhost or IP addresses
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

  function markBootReady() {
    if (document.documentElement.dataset.raytabsBoot === 'ready') return;
    document.documentElement.dataset.raytabsBoot = 'ready';
  }

  function revealAfterStylesReady() {
    const stylesheet = document.querySelector('link[data-raytabs-styles]');
    const reveal = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markBootReady();
        });
      });
    };

    if (!stylesheet) {
      reveal();
      return;
    }

    if (stylesheet.sheet) {
      reveal();
      return;
    }

    stylesheet.addEventListener('load', reveal, { once: true });
    stylesheet.addEventListener('error', reveal, { once: true });
    window.setTimeout(reveal, 1500);
  }

  buildUI();
  revealAfterStylesReady();
})();
