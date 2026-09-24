'use strict';

const DEFAULTS = {
  enabled: false,
  positiveKeywords: [],
  negativeKeywords: [],
  overrides: {},
  preferFresh: true,
  noveltyDays: 7,
  keepMusicGoing: true,
  listeningHistory: []
};

const elements = {
  enabled: document.querySelector('#enabled'),
  verdictDot: document.querySelector('#verdict-dot'),
  verdictLabel: document.querySelector('#verdict-label'),
  currentTitle: document.querySelector('#current-title'),
  reason: document.querySelector('#reason'),
  allow: document.querySelector('#allow'),
  block: document.querySelector('#block'),
  played: document.querySelector('#played-count'),
  hidden: document.querySelector('#hidden-count'),
  skipped: document.querySelector('#skipped-count'),
  positiveKeywords: document.querySelector('#positive-keywords'),
  negativeKeywords: document.querySelector('#negative-keywords'),
  preferFresh: document.querySelector('#prefer-fresh'),
  noveltyDays: document.querySelector('#novelty-days'),
  keepMusicGoing: document.querySelector('#keep-music-going'),
  saveSettings: document.querySelector('#save-settings'),
  clearHistory: document.querySelector('#clear-history'),
  clearOverrides: document.querySelector('#clear-overrides'),
  saveMessage: document.querySelector('#save-message')
};

let activeStatus = null;
let activeTabId = null;

async function init() {
  const settings = { ...DEFAULTS, ...(await chrome.storage.sync.get(null)) };
  elements.enabled.checked = Boolean(settings.enabled);
  elements.preferFresh.checked = settings.preferFresh !== false;
  elements.noveltyDays.value = Math.min(30, Math.max(1, Number(settings.noveltyDays) || 7));
  elements.keepMusicGoing.checked = settings.keepMusicGoing !== false;
  elements.positiveKeywords.value = (settings.positiveKeywords || []).join('\n');
  elements.negativeKeywords.value = (settings.negativeKeywords || []).join('\n');
  await refreshStatus();
}

async function refreshStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  if (!activeTabId) {
    renderStatus({
      verdict: 'idle',
      reason: 'Open a YouTube Mix in this tab.',
      counts: { played: 0, hidden: 0, skipped: 0 }
    });
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(activeTabId, { type: 'GET_STATUS' });
    renderStatus(response);
  } catch (_) {
    renderStatus({
      verdict: 'waiting',
      reason: 'Reload this YouTube tab once after installing the extension.',
      counts: { played: 0, hidden: 0, skipped: 0 }
    });
  }
}

function renderStatus(nextStatus) {
  activeStatus = nextStatus || {};
  const verdict = activeStatus.verdict || 'idle';
  const labels = {
    accepted: 'Playing a confident cover',
    rejected: 'Skipping excluded video',
    uncertain: 'Skipping uncertain video',
    stopped: 'Playback paused',
    waiting: 'Waiting for a Mix',
    disabled: 'Filter is off',
    idle: 'Not active on this tab'
  };
  elements.verdictDot.dataset.verdict = verdict;
  elements.verdictLabel.textContent = labels[verdict] || 'Checking this tab…';
  elements.currentTitle.textContent = activeStatus.title || activeStatus.reason || 'Open a YouTube Mix to begin.';
  elements.reason.textContent = activeStatus.title ? activeStatus.reason || '' : '';
  const canOverride = Boolean(activeStatus.videoId && activeStatus.isMix);
  elements.allow.disabled = !canOverride;
  elements.block.disabled = !canOverride;
  const counts = activeStatus.counts || {};
  elements.played.textContent = counts.played || 0;
  elements.hidden.textContent = counts.hidden || 0;
  elements.skipped.textContent = counts.skipped || 0;
}

function parseKeywords(value) {
  return [...new Set(value.split(/\n|,/).map((item) => item.trim()).filter(Boolean))];
}

async function setOverride(decision) {
  if (!activeStatus?.videoId || !activeTabId) return;
  await chrome.tabs.sendMessage(activeTabId, {
    type: 'SET_OVERRIDE',
    videoId: activeStatus.videoId,
    decision
  });
  showSaved(decision === 'allow' ? 'This video will always play.' : 'This video will always be skipped.');
  window.setTimeout(refreshStatus, 250);
}

function showSaved(message) {
  elements.saveMessage.textContent = message;
  window.setTimeout(() => {
    if (elements.saveMessage.textContent === message) elements.saveMessage.textContent = '';
  }, 2200);
}

elements.enabled.addEventListener('change', async () => {
  await chrome.storage.sync.set({ enabled: elements.enabled.checked });
  window.setTimeout(refreshStatus, 180);
});

elements.allow.addEventListener('click', () => setOverride('allow'));
elements.block.addEventListener('click', () => setOverride('block'));

elements.saveSettings.addEventListener('click', async () => {
  await chrome.storage.sync.set({
    preferFresh: elements.preferFresh.checked,
    noveltyDays: Math.min(30, Math.max(1, Number(elements.noveltyDays.value) || 7)),
    keepMusicGoing: elements.keepMusicGoing.checked,
    positiveKeywords: parseKeywords(elements.positiveKeywords.value),
    negativeKeywords: parseKeywords(elements.negativeKeywords.value)
  });
  showSaved('Playback and detection settings saved.');
  window.setTimeout(refreshStatus, 180);
});

elements.clearOverrides.addEventListener('click', async () => {
  await chrome.storage.sync.set({ overrides: {} });
  showSaved('Saved video decisions cleared.');
  window.setTimeout(refreshStatus, 180);
});

elements.clearHistory.addEventListener('click', async () => {
  await chrome.storage.sync.set({ listeningHistory: [] });
  showSaved('Synced listening history cleared.');
  window.setTimeout(refreshStatus, 180);
});

init();
