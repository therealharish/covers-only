(function initContentScript() {
  'use strict';

  const { classifyVideo } = globalThis.CoversOnlyClassifier;
  const { canExecuteSkip, resolveSynchronizedMetadata } = globalThis.CoversOnlyPlaybackState;
  const { isRecentlyPlayed, leastRecentlyPlayed, normalizeHistory, recordPlay } =
    globalThis.CoversOnlyListeningHistory;
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: false,
    positiveKeywords: [],
    negativeKeywords: [],
    overrides: {},
    preferFresh: true,
    noveltyDays: 7,
    keepMusicGoing: true,
    listeningHistory: []
  });
  const MAX_CONSECUTIVE_REJECTIONS = 25;
  const HIDDEN_CLASS = 'covers-only-hidden';

  let settings = { ...DEFAULT_SETTINGS };
  let evaluationTimer = null;
  let pendingSkipTimer = null;
  let pendingSkipVideoId = '';
  let currentVideoId = '';
  let lastSkippedVideoId = '';
  let lastAcceptedVideoId = '';
  let allowedCurrentVideoId = '';
  let fallbackVideoId = '';
  let consecutiveRejections = 0;
  let stoppedForExhaustion = false;
  const hiddenVideoIds = new Set();
  const session = { played: 0, hidden: 0, skipped: 0 };
  let status = {
    enabled: false,
    isMix: false,
    videoId: '',
    title: '',
    channel: '',
    verdict: 'idle',
    reason: 'Open a YouTube Mix to begin.',
    signals: [],
    counts: { ...session }
  };

  async function loadSettings() {
    const [localStored, syncStored] = await Promise.all([
      chrome.storage.local.get(null),
      chrome.storage.sync.get(null)
    ]);

    if (!localStored.settingsMigratedToSync) {
      const migratable = {};
      for (const key of [
        'enabled',
        'positiveKeywords',
        'negativeKeywords',
        'overrides',
        'preferFresh',
        'noveltyDays',
        'keepMusicGoing'
      ]) {
        if (syncStored[key] === undefined && localStored[key] !== undefined) {
          migratable[key] = localStored[key];
        }
      }
      if (Object.keys(migratable).length) await chrome.storage.sync.set(migratable);
      await chrome.storage.local.set({ settingsMigratedToSync: true });
      Object.assign(syncStored, migratable);
    }

    settings = {
      ...DEFAULT_SETTINGS,
      ...syncStored,
      positiveKeywords: Array.isArray(syncStored.positiveKeywords) ? syncStored.positiveKeywords : [],
      negativeKeywords: Array.isArray(syncStored.negativeKeywords) ? syncStored.negativeKeywords : [],
      overrides:
        syncStored.overrides && typeof syncStored.overrides === 'object' ? syncStored.overrides : {},
      listeningHistory: normalizeHistory(syncStored.listeningHistory),
      noveltyDays: Math.min(30, Math.max(1, Number(syncStored.noveltyDays) || 7))
    };
  }

  function isWatchPage() {
    return location.pathname === '/watch' && new URLSearchParams(location.search).has('v');
  }

  function isMixPage() {
    if (!isWatchPage()) return false;
    const listId = new URLSearchParams(location.search).get('list') || '';
    return listId.startsWith('RD') && Boolean(document.querySelector('ytd-playlist-panel-renderer'));
  }

  function readCurrentMetadata() {
    const params = new URLSearchParams(location.search);
    const videoId = params.get('v') || '';
    const pageTitle = textFrom([
      'ytd-watch-metadata h1 yt-formatted-string',
      'h1.title yt-formatted-string',
      'meta[name="title"]'
    ]);
    const pageChannel = textFrom([
      'ytd-video-owner-renderer #channel-name a',
      '#owner-name a',
      'ytd-channel-name a'
    ]);
    const pageDescription = textFrom([
      'ytd-watch-metadata #description-inline-expander',
      'ytd-text-inline-expander #plain-snippet-text',
      '#description yt-formatted-string',
      'meta[name="description"]'
    ]);
    const flexyVideoId =
      document.querySelector('ytd-watch-flexy[video-id]')?.getAttribute('video-id') || '';
    const selectedRow = document.querySelector(
      'ytd-playlist-panel-video-renderer[selected], ' +
        'ytd-playlist-panel-video-renderer[aria-current="true"], ' +
        'ytd-playlist-panel-video-renderer:has(#index-icon yt-icon[icon="playlist-playing"])'
    );
    const selectedMetadata = selectedRow ? readRowMetadata(selectedRow) : null;

    return resolveSynchronizedMetadata({
      videoId,
      pageTitle,
      pageChannel,
      pageDescription,
      flexyVideoId,
      selectedMetadata
    });
  }

  function textFrom(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const value = element.getAttribute?.('content') || element.textContent || '';
      if (value.trim()) return value.trim();
    }
    return '';
  }

  function readRowMetadata(row) {
    const link = row.querySelector('a#wc-endpoint, a.yt-simple-endpoint');
    let videoId = '';
    try {
      videoId = new URL(link?.href || '', location.origin).searchParams.get('v') || '';
    } catch (_) {
      videoId = '';
    }
    const titleElement = row.querySelector('#video-title');
    const channelElement = row.querySelector('#byline, ytd-channel-name, #channel-name');
    return {
      videoId,
      title: titleElement?.getAttribute('title') || titleElement?.textContent?.trim() || '',
      channel: channelElement?.textContent?.trim() || '',
      description: ''
    };
  }

  function filterPlaylistRows() {
    const rows = document.querySelectorAll('ytd-playlist-panel-video-renderer');
    rows.forEach((row) => {
      const metadata = readRowMetadata(row);
      if (!metadata.videoId || metadata.videoId === currentVideoId) {
        row.classList.remove(HIDDEN_CLASS);
        return;
      }
      const result = classifyVideo(metadata, settings);
      const recentlyPlayed =
        settings.preferFresh &&
        isRecentlyPlayed(metadata.videoId, settings.listeningHistory, settings.noveltyDays);
      const shouldHide = result.status !== 'accepted' || recentlyPlayed;
      row.classList.toggle(HIDDEN_CLASS, shouldHide);
      if (shouldHide && !hiddenVideoIds.has(metadata.videoId)) {
        hiddenVideoIds.add(metadata.videoId);
        session.hidden += 1;
      }
    });
  }

  async function evaluatePage() {
    evaluationTimer = null;
    const mix = isMixPage();

    if (!settings.enabled || !mix) {
      clearFiltering();
      const enabledButWaiting = settings.enabled && isWatchPage();
      status = {
        ...status,
        enabled: settings.enabled,
        isMix: mix,
        videoId: readCurrentMetadata().videoId,
        verdict: settings.enabled ? 'waiting' : 'disabled',
        reason: enabledButWaiting
          ? 'Covers Only is waiting for a YouTube auto-generated Mix.'
          : 'Covers Only is switched off.',
        signals: [],
        counts: { ...session }
      };
      return;
    }

    const metadata = readCurrentMetadata();
    if (!metadata.videoId || !metadata.title || !metadata.ready) {
      cancelPendingSkip();
      scheduleEvaluation(250);
      return;
    }

    if (metadata.videoId !== currentVideoId) {
      cancelPendingSkip();
      currentVideoId = metadata.videoId;
      lastSkippedVideoId = '';
      lastAcceptedVideoId = '';
      stoppedForExhaustion = false;
      allowedCurrentVideoId = fallbackVideoId === metadata.videoId ? metadata.videoId : '';
      if (fallbackVideoId !== metadata.videoId) fallbackVideoId = '';
    }

    filterPlaylistRows();
    const classification = classifyVideo(metadata, settings);
    const recentlyPlayed =
      classification.status === 'accepted' &&
      settings.preferFresh &&
      allowedCurrentVideoId !== metadata.videoId &&
      isRecentlyPlayed(metadata.videoId, settings.listeningHistory, settings.noveltyDays);
    const result = recentlyPlayed
      ? {
          status: 'uncertain',
          reason: `Played within the last ${settings.noveltyDays} days; looking for something fresh`,
          signals: ['recently played'],
          confidence: 1
        }
      : classification;
    status = {
      enabled: true,
      isMix: true,
      videoId: metadata.videoId,
      title: metadata.title,
      channel: metadata.channel,
      verdict: result.status,
      reason: result.reason,
      signals: result.signals,
      fallback: fallbackVideoId === metadata.videoId,
      counts: { ...session }
    };

    if (result.status === 'accepted') {
      cancelPendingSkip();
      allowedCurrentVideoId = metadata.videoId;
      consecutiveRejections = 0;
      stoppedForExhaustion = false;
      removeBanner();
      if (lastAcceptedVideoId !== metadata.videoId) {
        lastAcceptedVideoId = metadata.videoId;
        session.played += 1;
        status.counts = { ...session };
        await rememberPlayedVideo(metadata.videoId);
      }
      return;
    }

    if (lastSkippedVideoId === metadata.videoId || stoppedForExhaustion) return;
    lastSkippedVideoId = metadata.videoId;
    // Count playback transitions, not unique IDs. A short Mix can cycle through
    // the same rejected videos, and repeated IDs must still trip loop protection.
    consecutiveRejections += 1;

    if (consecutiveRejections >= MAX_CONSECUTIVE_REJECTIONS) {
      if (settings.keepMusicGoing && playFallbackCover()) return;
      stopPlayback('No more playable covers found after checking 25 videos.');
      return;
    }

    showBanner(`Skipping: ${result.reason}`, 'warning');
    scheduleSkip(metadata.videoId);
  }

  function scheduleSkip(videoId) {
    cancelPendingSkip();
    pendingSkipVideoId = videoId;
    pendingSkipTimer = window.setTimeout(() => skipToNextVideo(videoId), 700);
  }

  function cancelPendingSkip() {
    if (pendingSkipTimer !== null) window.clearTimeout(pendingSkipTimer);
    pendingSkipTimer = null;
    pendingSkipVideoId = '';
  }

  function skipToNextVideo(expectedVideoId) {
    pendingSkipTimer = null;
    const actualVideoId = new URLSearchParams(location.search).get('v') || '';
    if (
      !canExecuteSkip({
        expectedVideoId,
        pendingSkipVideoId,
        actualVideoId,
        statusVideoId: status.videoId,
        statusVerdict: status.verdict
      })
    ) {
      pendingSkipVideoId = '';
      return;
    }
    pendingSkipVideoId = '';
    if (!settings.enabled || !isMixPage() || stoppedForExhaustion) return;
    const nextButton = document.querySelector('.ytp-next-button');
    if (!nextButton || nextButton.getAttribute('aria-disabled') === 'true') {
      stopPlayback('No next video is available in this Mix.');
      return;
    }
    session.skipped += 1;
    status.counts = { ...session };
    nextButton.click();
  }

  function stopPlayback(message) {
    cancelPendingSkip();
    stoppedForExhaustion = true;
    const video = document.querySelector('video');
    video?.pause();
    showBanner(message, 'warning');
    status = { ...status, verdict: 'stopped', reason: message, counts: { ...session } };
  }

  function getKnownCoverCandidates() {
    return [...document.querySelectorAll('ytd-playlist-panel-video-renderer')]
      .map((row) => {
        const metadata = readRowMetadata(row);
        const link = row.querySelector('a#wc-endpoint, a.yt-simple-endpoint');
        return { ...metadata, href: link?.href || '', linkElement: link };
      })
      .filter(
        (candidate) =>
          candidate.videoId &&
          candidate.href &&
          classifyVideo(candidate, settings).status === 'accepted'
      );
  }

  function playFallbackCover() {
    const candidate = leastRecentlyPlayed(
      getKnownCoverCandidates(),
      settings.listeningHistory,
      currentVideoId
    );
    if (!candidate) return false;

    cancelPendingSkip();
    consecutiveRejections = 0;
    fallbackVideoId = candidate.videoId;
    lastSkippedVideoId = '';
    document
      .querySelectorAll('ytd-playlist-panel-video-renderer')
      .forEach((row) => {
        if (readRowMetadata(row).videoId === candidate.videoId) row.classList.remove(HIDDEN_CLASS);
      });
    showBanner('No fresh covers found. Playing the least-recent cover, then discovery will resume.', 'success');
    window.setTimeout(() => {
      if (fallbackVideoId === candidate.videoId && candidate.linkElement?.isConnected) {
        candidate.linkElement.click();
      }
    }, 450);
    return true;
  }

  async function rememberPlayedVideo(videoId) {
    const listeningHistory = recordPlay(settings.listeningHistory, videoId);
    settings = { ...settings, listeningHistory };
    try {
      await chrome.storage.sync.set({ listeningHistory });
    } catch (error) {
      console.warn('Covers Only could not sync listening history.', error);
    }
  }

  function clearFiltering() {
    cancelPendingSkip();
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((row) => row.classList.remove(HIDDEN_CLASS));
    removeBanner();
    consecutiveRejections = 0;
    stoppedForExhaustion = false;
  }

  function showBanner(message, tone) {
    let banner = document.querySelector('#covers-only-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'covers-only-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      document.documentElement.appendChild(banner);
    }
    banner.dataset.tone = tone;
    banner.textContent = message;
  }

  function removeBanner() {
    document.querySelector('#covers-only-banner')?.remove();
  }

  function scheduleEvaluation(delay = 250) {
    if (evaluationTimer !== null) return;
    evaluationTimer = window.setTimeout(evaluatePage, delay);
  }

  async function setVideoOverride(videoId, decision) {
    if (!videoId || !['allow', 'block', 'clear'].includes(decision)) return;
    const overrides = { ...settings.overrides };
    if (decision === 'clear') delete overrides[videoId];
    else overrides[videoId] = decision;
    await chrome.storage.sync.set({ overrides });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'GET_STATUS') {
      sendResponse({ ...status, counts: { ...session } });
      return false;
    }
    if (message?.type === 'SET_OVERRIDE') {
      setVideoOverride(message.videoId, message.decision)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message?.type === 'REEVALUATE') {
      scheduleEvaluation(0);
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });

  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName !== 'local' && areaName !== 'sync') return;
    loadSettings().then(() => scheduleEvaluation(0));
  });

  document.addEventListener('yt-navigate-finish', () => scheduleEvaluation(300));
  document.addEventListener('yt-page-data-updated', () => scheduleEvaluation(300));

  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (target?.closest('ytd-playlist-panel-renderer, ytd-watch-metadata')) return true;
      return [...mutation.addedNodes].some(
        (node) =>
          node instanceof Element &&
          (node.matches('ytd-playlist-panel-renderer, ytd-watch-metadata') ||
            node.querySelector('ytd-playlist-panel-renderer, ytd-watch-metadata'))
      );
    });
    if (relevant) scheduleEvaluation(500);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  loadSettings().then(() => scheduleEvaluation(0));
})();
