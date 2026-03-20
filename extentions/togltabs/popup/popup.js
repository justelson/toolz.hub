import {
  initDB,
  reloadDB,
  getActiveProfileId,
  getTodayUsage,
  getGoals,
  setGoal,
  getAllProfiles,
  getCustomSites,
  addCustomSite,
  removeCustomSite,
  getCustomSiteCount,
  getPinnedSites,
  setPinSlot,
  clearPinSlot,
  getTheme
} from '../lib/db.js';
import { icon, brandIcon, textFallback } from '../lib/icons.js';

const QUOTES_ACTIVE = [
  'Every minute here is borrowed from something that actually matters.',
  'You opened this tab. You can close it too.',
  'The algorithm is designed to outlast your willpower.',
  'Awareness is the first step. Closing the tab is the second.',
  'Your attention is the most valuable thing you own.',
  'This feed will still be here. Your goals might not wait.',
  "You're not bored. You're avoiding something.",
  'The best creators spend more time making than consuming.',
  'Scrolling is the illusion of doing something.',
  'One more minute here is one less minute on what you said mattered.',
  "They optimized this app to keep you. Don't let them win.",
  'Time spent here is a vote for who you\'re becoming.',
  'Close this tab. Go build something.',
  'You already know what you should be doing.',
  'The scroll never ends. But your day does.',
  'Awareness without action is just guilt. Act.',
  'The app is free because your time is the product.',
  'Nothing on this feed is as urgent as it feels.',
  'The version of you that wins is not on this page.',
  'This is the most expensive free app you\'ll ever use.'
];

const QUOTES_SAFE = [
  "You're not there. That already counts for something.",
  'The best thing you did today might be this — staying away.',
  'You gave your attention to something worth having it.',
  'Every hour off the feed is an hour that belonged to you.',
  'Being here instead of there is a small act of discipline.',
  "Focus is rare. You're practicing it right now.",
  'Momentum is quiet. Keep going.',
  'Staying off is not willpower. It\'s wisdom.',
  'Your attention is somewhere meaningful. Don\'t waste it.',
  'This is what it feels like to be in control.',
  'Deep work requires deep quiet. You\'re in it.',
  'The most productive thing you can do is stay exactly where you are.',
  'Your brain is clearer than it would have been. Use it.',
  'Creation and consumption can\'t happen at the same time.',
  'Presence is a practice. You\'re practicing.',
  'You are not missing anything. You are building something.',
  'Silence is not emptiness. It is space for thought.',
  'Every moment of focus is a brick. Keep laying them.',
  'Small choices made consistently become who you are.',
  'Nothing about a feed will ever feel as good as finishing something.'
];

const AUTO_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
  '#f97316', '#ec4899', '#14b8a6', '#a855f7',
  '#6366f1', '#84cc16'
];

const SITE_COLORS = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  x: '#ffffff'
};

let currentProfile = null;
let currentState = null;
let sessionInterval = null;
let lastWorkerState = null;
let popupQuotes = {
  safe: quoteFor(false),
  active: quoteFor(true)
};

function formatTime(seconds = 0) {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatClock(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseGoalInput(value) {
  const text = value.trim();
  if (!text) return 0;
  let seconds = 0;
  const hMatch = text.match(/(\d+)\s*h/i);
  const mMatch = text.match(/(\d+)\s*m/i);
  if (hMatch) seconds += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) seconds += parseInt(mMatch[1], 10) * 60;
  if (!hMatch && !mMatch) {
    const raw = parseInt(text, 10);
    if (!Number.isNaN(raw)) seconds = raw * 60;
  }
  return seconds;
}

function siteDisplayName(site) {
  if (site === 'youtube') return 'YouTube';
  if (site === 'instagram') return 'Instagram';
  if (site === 'x') return 'X';
  const custom = getCustomSites(currentProfile.id).find(item => item.hostname === site);
  return custom?.label || site;
}

function getSiteColor(site) {
  if (site === 'x' && document.body.dataset.theme === 'light') return '#000000';
  return SITE_COLORS[site] || '#94a3b8';
}

function getSiteFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) return 'youtube';
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
    if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) return 'x';
    const customSites = getCustomSites(currentProfile.id);
    for (const custom of customSites) {
      const clean = custom.hostname.replace('www.', '');
      if (host === clean || host.endsWith(`.${clean}`)) return custom.hostname;
    }
  } catch {}
  return null;
}

function siteIcon(site, size = 16) {
  const builtIn = brandIcon(site, size);
  if (builtIn) return builtIn;
  const custom = getCustomSites(currentProfile.id).find(item => item.hostname === site);
  return textFallback(custom?.label || site, custom?.color || '#94a3b8', Math.max(size, 14));
}

function quoteFor(isActive) {
  const source = isActive ? QUOTES_ACTIVE : QUOTES_SAFE;
  return source[Math.floor(Math.random() * source.length)];
}

async function fetchWorkerState() {
  try {
    lastWorkerState = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  } catch {
    lastWorkerState = null;
  }
  return lastWorkerState;
}

function renderHeader() {
  const manageBtn = document.getElementById('manage-sites-btn');
  manageBtn.textContent = 'Manage sites';
  manageBtn.onclick = () => loadManageSitesScreen('forward');
}

function showLoadingState() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="loading-shell screen-enter screen-enter-forward">
      <div class="loading-logo-wrap">
        <img class="loading-logo" src="../assets/logo.svg" alt="togltabs logo">
      </div>
      <div class="loading-bar loading-bar-lg"></div>
      <div class="loading-card"></div>
      <div class="loading-card"></div>
      <div class="loading-card loading-card-sm"></div>
    </div>
  `;
}

function animateScreen(container, html, direction = 'forward') {
  container.innerHTML = `<div class="screen-enter screen-enter-${direction}">${html}</div>`;
}

function renderPinnedStrip() {
  const strip = document.getElementById('pinned-strip');
  const pins = getPinnedSites(currentProfile.id);
  const usage = lastWorkerState?.usage || getTodayUsage(currentProfile.id);
  const goals = lastWorkerState?.goals || getGoals(currentProfile.id);

  strip.innerHTML = '';
  for (let slot = 1; slot <= 3; slot += 1) {
    const site = pins[slot];
    const item = document.createElement('div');
    item.className = 'pinned-slot';

    if (!site) {
      item.classList.add('empty');
      item.innerHTML = `<span class="site-icon">${icon('plus', 12)}</span><span>Add</span>`;
      item.onclick = () => loadManageSitesScreen();
    } else {
      const used = usage[site] || 0;
      const goal = goals[site] ?? 12600;
      if (goal > 0 && used >= goal) item.classList.add('exceeded');
      item.innerHTML = `<span class="site-icon">${siteIcon(site, 14)}</span><span>${formatTime(used)}</span>`;
    }

    strip.appendChild(item);
  }
}

function renderSafeView(container, direction = 'forward') {
  const usage = lastWorkerState?.usage || getTodayUsage(currentProfile.id);
  const goals = lastWorkerState?.goals || getGoals(currentProfile.id);
  const sites = ['youtube', 'instagram', 'x'];

  let total = 0;
  let html = `<div class="quote-text safe">“${popupQuotes.safe}”</div><div class="safe-message">you are safe for now</div><div class="content-stack">`;
  for (const site of sites) {
    const used = usage[site] || 0;
    const goal = goals[site] ?? 12600;
    const percent = goal > 0 ? Math.min((used / goal) * 100, 100) : 0;
    const exceeded = goal > 0 && used >= goal;
    total += used;
    html += `
      <div class="site-row">
        <div class="site-row-header">
          <div class="site-label">${siteIcon(site, 16)}<span>${siteDisplayName(site)}</span></div>
          <div class="site-time ${exceeded ? 'exceeded' : ''}">${formatTime(used)}${exceeded ? '<span class="goal-chip">goal reached</span>' : ''}</div>
        </div>
        <div class="progress-track"><div class="progress-fill ${site} ${exceeded ? 'exceeded' : ''}" style="width:${percent}%"></div></div>
      </div>
    `;
  }
  html += `</div><div class="total-row"><div class="total-label">total today</div><div class="total-time">${formatTime(total)}</div></div>`;
  animateScreen(container, html, direction);
}

function renderActiveSiteView(container, currentSite, direction = 'forward') {
  const usage = lastWorkerState?.usage || getTodayUsage(currentProfile.id);
  const goals = lastWorkerState?.goals || getGoals(currentProfile.id);
  const used = usage[currentSite] || 0;
  const goal = goals[currentSite] ?? 12600;
  const percent = goal > 0 ? Math.min((used / goal) * 100, 100) : 0;
  const exceeded = goal > 0 && used >= goal;
  const color = exceeded ? '#F26157' : getSiteColor(currentSite);
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (percent / 100) * circumference;

  const html = `
    <div class="quote-text">“${popupQuotes.active}”</div>
    <div class="content-stack">
    <div class="active-card">
      <div class="active-site-name" style="color:${color}">${siteDisplayName(currentSite).toUpperCase()}</div>
      <div class="donut-wrap">
        <svg class="donut-svg" width="120" height="120" viewBox="0 0 120 120">
          <circle class="donut-track" cx="60" cy="60" r="48"></circle>
          <circle class="donut-fill" cx="60" cy="60" r="48" stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="donut-center">${exceeded ? 'goal reached' : `${Math.round(percent)}%`}</div>
      </div>
      <div class="donut-time">${formatTime(used)} / ${formatTime(goal)}</div>
      <div class="session-clock-block">
        <div class="session-clock-label">Session time</div>
        <div class="session-clock-time" id="session-clock">${formatClock(0)}</div>
      </div>
    </div>
    </div>
  `;

  animateScreen(container, html, direction);

  if (sessionInterval) clearInterval(sessionInterval);
  const sessionStart = lastWorkerState?.sessionStartTime;
  const updateClock = () => {
    const el = document.getElementById('session-clock');
    if (!el) return;
    if (!sessionStart) {
      el.textContent = formatClock(0);
      return;
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - sessionStart) / 1000));
    el.textContent = formatClock(elapsed);
  };
  updateClock();
  sessionInterval = setInterval(updateClock, 1000);
}

function renderEndOfDaySummary(container, direction = 'forward') {
  const usage = lastWorkerState?.usage || getTodayUsage(currentProfile.id);
  const goals = lastWorkerState?.goals || getGoals(currentProfile.id);
  const sites = ['youtube', 'instagram', 'x'];
  let totalSeconds = 0;
  let totalGoal = 0;
  let rows = '';

  for (const site of sites) {
    const used = usage[site] || 0;
    const goal = goals[site] ?? 12600;
    const percent = goal > 0 ? Math.min((used / goal) * 100, 100) : 0;
    totalSeconds += used;
    totalGoal += goal;
    rows += `
      <div class="summary-row">
        <div class="summary-site-label">${siteIcon(site, 16)}<span>${siteDisplayName(site)}</span></div>
        <div class="summary-time">${formatTime(used)}</div>
        <div class="summary-bar"><div class="summary-bar-fill ${site}" style="width:${percent}%"></div></div>
      </div>
    `;
  }

  const positive = totalSeconds < totalGoal;
  const html = `
    <div class="summary-section-label">today's recap</div>
    <div class="content-stack">
    <div class="summary-total">
      <div class="summary-total-label">total time on platforms</div>
      <div class="summary-total-time">${formatTime(totalSeconds)}</div>
    </div>
    ${rows}
    <div class="divider"></div>
    <div class="summary-sentence ${positive ? 'positive' : ''}">
      you spent ${formatTime(totalSeconds)} today.<br>
      your goal was ${formatTime(12600)} per site.<br>
      ${positive ? 'not bad.' : 'tomorrow is a new day.'}
    </div>
    </div>
  `;
  animateScreen(container, html, direction);
}

async function loadMainScreen(direction = 'backward') {
  currentState = 'main';
  document.getElementById('footer').classList.remove('hidden');
  showLoadingState();
  await fetchWorkerState();
  await reloadDB();
  currentProfile = getAllProfiles().find(item => item.id === (lastWorkerState?.activeProfile || getActiveProfileId())) || getAllProfiles()[0];
  document.body.dataset.theme = lastWorkerState?.theme || getTheme(currentProfile.id);
  renderHeader();
  renderPinnedStrip();

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const currentSite = getSiteFromUrl(tab?.url || '') || lastWorkerState?.activeSite;
  const now = new Date();
  const isEndOfDay = now.getHours() >= 20 && !(now.getHours() === 23 && now.getMinutes() > 56);
  const container = document.getElementById('main-content');

  if (sessionInterval) clearInterval(sessionInterval);
  if (isEndOfDay) renderEndOfDaySummary(container, direction);
  else if (currentSite) renderActiveSiteView(container, currentSite, direction);
  else renderSafeView(container, direction);
}

function siteMeta(siteKey) {
  const custom = getCustomSites(currentProfile.id).find(item => item.hostname === siteKey);
  return {
    key: siteKey,
    label: custom?.label || siteDisplayName(siteKey),
    hostname: custom?.hostname || null,
    color: custom?.color || getSiteColor(siteKey),
    custom: !!custom
  };
}

function getGridSites() {
  const defaults = ['youtube', 'instagram', 'x'];
  const customs = getCustomSites(currentProfile.id).map(site => site.hostname);
  return [...defaults, ...customs].slice(0, 8);
}

function buildSiteGridHtml(sectionTitle = 'SITES') {
  const pins = getPinnedSites(currentProfile.id);
  const goals = getGoals(currentProfile.id);
  const usage = lastWorkerState?.usage || getTodayUsage(currentProfile.id);
  const sites = getGridSites();
  const canAdd = getCustomSiteCount(currentProfile.id) < 10;

  const cards = sites.map(siteKey => {
    const meta = siteMeta(siteKey);
    const isPinned = Object.values(pins).includes(siteKey);
    const used = usage[siteKey] || 0;
    const goal = goals[siteKey] ?? 12600;
    const exceeded = goal > 0 && used >= goal;
    const goalText = goal > 0 ? formatTime(goal) : 'No goal';
    return `
      <div class="site-grid-card manage-grid-card" data-grid-open="${siteKey}" role="button" tabindex="0">
        <button class="site-grid-pin ${isPinned ? 'active' : ''}" data-grid-pin="${siteKey}" type="button">${icon('pin', 11)}</button>
        <div class="site-grid-icon">${siteIcon(siteKey, 18)}</div>
        <div class="site-grid-label">${meta.label}</div>
        <div class="site-grid-sub">${meta.hostname || 'default site'}</div>
        <div class="site-grid-meta-row">
          <div class="site-grid-time ${exceeded ? 'exceeded' : ''}">${formatTime(used)}</div>
          <div class="site-grid-goal">${goalText}</div>
        </div>
      </div>
    `;
  }).join('');

  const addCard = canAdd ? `
    <div class="site-grid-card add-site-grid-card" data-grid-new="1" role="button" tabindex="0">
      <div class="site-grid-icon">${icon('plus', 16)}</div>
      <div class="site-grid-label">New site</div>
      <div class="site-grid-sub">Add a custom domain</div>
      <div class="site-grid-time">Open editor</div>
    </div>
  ` : '';

  return `
    <div class="site-grid-section">
      <div class="manage-section-header no-margin">${sectionTitle}</div>
      <div class="site-grid">${cards}${addCard}</div>
    </div>
  `;
}

async function togglePin(siteKey, rerender = 'main') {
  const nextPins = getPinnedSites(currentProfile.id);
  const existing = Object.entries(nextPins).find(([, value]) => value === siteKey);
  if (existing) {
    await clearPinSlot(currentProfile.id, Number(existing[0]));
  } else {
    const used = Object.keys(nextPins).map(Number).sort((a, b) => a - b);
    let slot = 1;
    while (used.includes(slot) && slot <= 3) slot += 1;
    if (slot <= 3) await setPinSlot(currentProfile.id, slot, siteKey);
  }
  await chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_SITES' });
  await reloadDB();
  if (rerender === 'manage') await loadManageSitesScreen('forward');
  else await loadMainScreen('forward');
}

function attachGridEvents(container, returnScreen = 'main') {
  container.querySelectorAll('[data-grid-open]').forEach(button => {
    button.addEventListener('click', () => openManageOverlay(button.dataset.gridOpen, returnScreen));
  });
  container.querySelectorAll('[data-grid-pin]').forEach(button => {
    button.addEventListener('click', async event => {
      event.stopPropagation();
      await togglePin(button.dataset.gridPin, returnScreen);
    });
  });
  container.querySelectorAll('[data-grid-new]').forEach(button => {
    button.addEventListener('click', () => openNewSiteOverlay(returnScreen));
  });
}

function buildManageCard(siteKey, pins, goals) {
  const meta = siteMeta(siteKey);
  const isPinned = Object.values(pins).includes(siteKey);
  const goal = goals[siteKey] || 0;
  const goalText = goal ? formatTime(goal) : 'No goal';
  return `
    <button class="manage-card" data-site-card="${siteKey}" type="button">
      <div class="manage-card-top">
        <div class="manage-site-info">
          ${siteIcon(siteKey, 18)}
          <div>
            <div class="manage-site-label">${meta.label}</div>
            <div class="manage-site-host">${meta.hostname || 'default site'}</div>
          </div>
        </div>
        <div class="manage-card-tags">
          <span class="manage-tag ${isPinned ? 'active' : ''}">${isPinned ? 'Pinned' : 'Not pinned'}</span>
          <span class="manage-tag">${goalText}</span>
        </div>
      </div>
    </button>
  `;
}

function openManageOverlay(siteKey, returnScreen = 'manage') {
  const overlay = document.getElementById('manage-overlay');
  const content = document.getElementById('manage-overlay-content');
  const pins = getPinnedSites(currentProfile.id);
  const goals = getGoals(currentProfile.id);
  const meta = siteMeta(siteKey);
  const isPinned = Object.values(pins).includes(siteKey);
  const goal = goals[siteKey] || 0;

  content.innerHTML = `
    <div class="overlay-site-head">
      <div class="manage-site-info">
        ${siteIcon(siteKey, 20)}
        <div>
          <div class="manage-site-label">${meta.label}</div>
          <div class="manage-site-host">${meta.hostname || 'default site'}</div>
        </div>
      </div>
      <button class="overlay-close" id="overlay-close" type="button">×</button>
    </div>
    <label class="overlay-label">Daily goal</label>
    <div class="overlay-goal-row">
      <input id="overlay-goal-input" class="goal-input" value="${goal ? formatTime(goal) : ''}" placeholder="e.g. 1h 30m">
      <button id="overlay-save-goal" class="goal-save-btn" type="button">Save</button>
    </div>
    <div class="overlay-actions">
      <button id="overlay-toggle-pin" class="manage-btn overlay-action-btn ${isPinned ? 'pinned' : ''}" type="button">${icon('pin', 12)}<span>${isPinned ? 'Unpin' : 'Pin'}</span></button>
      ${meta.custom ? `<button id="overlay-remove-site" class="manage-btn overlay-action-btn overlay-remove-btn" type="button">${icon('trash', 12)}<span>Remove</span></button>` : ''}
    </div>
  `;

  overlay.classList.remove('hidden');

  const closeOverlay = () => overlay.classList.add('hidden');
  document.getElementById('overlay-close').onclick = closeOverlay;
  overlay.onclick = event => {
    if (event.target === overlay) closeOverlay();
  };

  document.getElementById('overlay-save-goal').onclick = async () => {
    const seconds = parseGoalInput(document.getElementById('overlay-goal-input').value);
    await setGoal(currentProfile.id, siteKey, seconds);
    await chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_SITES' });
    await reloadDB();
    closeOverlay();
    if (returnScreen === 'main') await loadMainScreen('forward');
    else await loadManageSitesScreen('forward');
  };

  document.getElementById('overlay-toggle-pin').onclick = async () => {
    const nextPins = getPinnedSites(currentProfile.id);
    const existing = Object.entries(nextPins).find(([, value]) => value === siteKey);
    if (existing) {
      await clearPinSlot(currentProfile.id, Number(existing[0]));
    } else {
      const used = Object.keys(nextPins).map(Number).sort((a, b) => a - b);
      let slot = 1;
      while (used.includes(slot) && slot <= 3) slot += 1;
      if (slot <= 3) await setPinSlot(currentProfile.id, slot, siteKey);
    }
    await chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_SITES' });
    await reloadDB();
    closeOverlay();
    if (returnScreen === 'main') await loadMainScreen('forward');
    else await loadManageSitesScreen('forward');
  };

  document.getElementById('overlay-remove-site')?.addEventListener('click', async () => {
    await removeCustomSite(currentProfile.id, siteKey);
    await chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_SITES' });
    await reloadDB();
    closeOverlay();
    if (returnScreen === 'main') await loadMainScreen('forward');
    else await loadManageSitesScreen('forward');
  });
}

function openNewSiteOverlay(returnScreen = 'manage') {
  const overlay = document.getElementById('manage-overlay') || document.getElementById('main-overlay');
  const content = document.getElementById('manage-overlay-content') || document.getElementById('main-overlay-content');
  if (!overlay || !content) return;

  content.innerHTML = `
    <div class="overlay-site-head">
      <div>
        <div class="manage-site-label">New site</div>
        <div class="manage-site-host">Add a custom domain to track</div>
      </div>
      <button class="overlay-close" id="overlay-close" type="button">×</button>
    </div>
    <label class="overlay-label">Domain</label>
    <input id="overlay-new-hostname" class="goal-input overlay-field" placeholder="reddit.com">
    <label class="overlay-label">Label</label>
    <input id="overlay-new-label" class="goal-input overlay-field" placeholder="Reddit">
    <div id="overlay-new-error" class="error-message"></div>
    <div class="overlay-actions single">
      <button id="overlay-create-site" class="goal-save-btn overlay-action-btn" type="button">Create site</button>
    </div>
  `;

  overlay.classList.remove('hidden');
  const closeOverlay = () => overlay.classList.add('hidden');
  document.getElementById('overlay-close').onclick = closeOverlay;
  overlay.onclick = event => {
    if (event.target === overlay) closeOverlay();
  };

  document.getElementById('overlay-create-site').onclick = async () => {
    const hostnameInput = document.getElementById('overlay-new-hostname');
    const labelInput = document.getElementById('overlay-new-label');
    const error = document.getElementById('overlay-new-error');

    let hostname = hostnameInput.value.trim().toLowerCase();
    hostname = hostname.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (!hostname || hostname.includes('/') || !hostname.includes('.')) {
      error.textContent = 'invalid domain';
      return;
    }
    if (getCustomSites(currentProfile.id).some(item => item.hostname === hostname)) {
      error.textContent = 'already tracking this site';
      return;
    }
    if (getCustomSiteCount(currentProfile.id) >= 10) {
      error.textContent = 'limit reached';
      return;
    }

    const label = labelInput.value.trim() || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    const color = AUTO_COLORS[getCustomSiteCount(currentProfile.id) % AUTO_COLORS.length];
    await addCustomSite(currentProfile.id, hostname, label, color);
    await chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_SITES' });
    await reloadDB();
    closeOverlay();
    if (returnScreen === 'main') await loadMainScreen('forward');
    else await loadManageSitesScreen('forward');
  };
}

async function loadManageSitesScreen(direction = 'forward') {
  currentState = 'manage';
  if (sessionInterval) clearInterval(sessionInterval);
  document.getElementById('footer').classList.add('hidden');
  showLoadingState();
  const container = document.getElementById('main-content');
  const customCount = getCustomSiteCount(currentProfile.id);

  let html = `
    <div class="manage-header sticky">
      <button class="manage-back-btn" id="manage-back" type="button">${icon('arrowLeft', 16)}</button>
      <div class="manage-title">Manage Sites</div>
    </div>
    <div class="manage-scroll-area">
      ${buildSiteGridHtml(`SITES (${Math.min(getGridSites().length, 8)} / 9)`)}
      ${customCount >= 10 ? `<div class="limit-message">10/10 — remove a site to add more</div>` : ''}
    </div>
    <div id="manage-overlay" class="manage-overlay hidden">
      <div class="manage-overlay-card" id="manage-overlay-content"></div>
    </div>
  `;

  animateScreen(container, html, direction);

  document.getElementById('manage-back').onclick = async () => {
    await loadMainScreen('backward');
  };

  attachGridEvents(container, 'manage');
}

async function init() {
  popupQuotes = {
    safe: quoteFor(false),
    active: quoteFor(true)
  };

  showLoadingState();
  await initDB();
  currentProfile = getAllProfiles().find(item => item.id === getActiveProfileId()) || getAllProfiles()[0];
  await loadMainScreen('forward');
}

document.addEventListener('DOMContentLoaded', init);
