(function initListeningHistory(globalScope) {
  'use strict';

  // Keep this comfortably below chrome.storage.sync's per-item quota.
  const MAX_HISTORY_ITEMS = 120;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function normalizeHistory(value) {
    if (!Array.isArray(value)) return [];
    const newestById = new Map();
    value.forEach((entry) => {
      const videoId = String(entry?.videoId || '');
      const playedAt = Number(entry?.playedAt || 0);
      if (!videoId || !Number.isFinite(playedAt) || playedAt <= 0) return;
      const previous = newestById.get(videoId);
      if (!previous || previous.playedAt < playedAt) newestById.set(videoId, { videoId, playedAt });
    });
    return [...newestById.values()]
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, MAX_HISTORY_ITEMS);
  }

  function historyMap(history) {
    return new Map(normalizeHistory(history).map((entry) => [entry.videoId, entry.playedAt]));
  }

  function isRecentlyPlayed(videoId, history, noveltyDays, now = Date.now()) {
    const days = Math.max(0, Number(noveltyDays) || 0);
    if (!videoId || days === 0) return false;
    const playedAt = historyMap(history).get(videoId);
    return Boolean(playedAt && now - playedAt < days * DAY_MS);
  }

  function recordPlay(history, videoId, playedAt = Date.now()) {
    return normalizeHistory([{ videoId, playedAt }, ...normalizeHistory(history)]);
  }

  function leastRecentlyPlayed(candidates, history, excludedVideoId = '') {
    const playedById = historyMap(history);
    return (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => candidate?.videoId && candidate.videoId !== excludedVideoId)
      .map((candidate) => ({
        ...candidate,
        playedAt: playedById.get(candidate.videoId) || 0
      }))
      .sort((a, b) => a.playedAt - b.playedAt)[0] || null;
  }

  const api = {
    DAY_MS,
    MAX_HISTORY_ITEMS,
    historyMap,
    isRecentlyPlayed,
    leastRecentlyPlayed,
    normalizeHistory,
    recordPlay
  };

  globalScope.CoversOnlyListeningHistory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
