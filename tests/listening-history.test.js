'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DAY_MS,
  MAX_HISTORY_ITEMS,
  isRecentlyPlayed,
  leastRecentlyPlayed,
  normalizeHistory,
  recordPlay
} = require('../src/listening-history.js');

test('records the latest play once per video ID', () => {
  const history = recordPlay(
    [{ videoId: 'cover-a', playedAt: 100 }, { videoId: 'cover-b', playedAt: 200 }],
    'cover-a',
    300
  );
  assert.deepEqual(history.slice(0, 2), [
    { videoId: 'cover-a', playedAt: 300 },
    { videoId: 'cover-b', playedAt: 200 }
  ]);
});

test('bounds synced history to the storage-safe maximum', () => {
  const history = normalizeHistory(
    Array.from({ length: MAX_HISTORY_ITEMS + 20 }, (_, index) => ({
      videoId: `video-${index}`,
      playedAt: index + 1
    }))
  );
  assert.equal(history.length, MAX_HISTORY_ITEMS);
});

test('detects a cover heard inside the configured novelty window', () => {
  const now = 20 * DAY_MS;
  const history = [{ videoId: 'cover-a', playedAt: now - 2 * DAY_MS }];
  assert.equal(isRecentlyPlayed('cover-a', history, 7, now), true);
  assert.equal(isRecentlyPlayed('cover-a', history, 1, now), false);
});

test('zero novelty days disables recent filtering', () => {
  assert.equal(isRecentlyPlayed('cover-a', [{ videoId: 'cover-a', playedAt: 100 }], 0, 101), false);
});

test('fallback chooses the least recently played known cover', () => {
  const candidate = leastRecentlyPlayed(
    [
      { videoId: 'recent', title: 'Recent cover' },
      { videoId: 'old', title: 'Old cover' },
      { videoId: 'never', title: 'Never played cover' }
    ],
    [{ videoId: 'recent', playedAt: 300 }, { videoId: 'old', playedAt: 100 }]
  );
  assert.equal(candidate.videoId, 'never');
});

test('fallback excludes the video currently being rejected', () => {
  const candidate = leastRecentlyPlayed(
    [{ videoId: 'current' }, { videoId: 'other' }],
    [],
    'current'
  );
  assert.equal(candidate.videoId, 'other');
});
