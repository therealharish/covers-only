'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canExecuteSkip,
  resolveSynchronizedMetadata
} = require('../src/playback-state.js');

test('uses the selected Mix row while main metadata is still stale', () => {
  const result = resolveSynchronizedMetadata({
    videoId: 'new-cover',
    pageTitle: 'Previous non-cover video',
    pageChannel: 'Previous channel',
    pageDescription: 'Previous description',
    flexyVideoId: 'previous-video',
    selectedMetadata: {
      videoId: 'new-cover',
      title: 'No Surprises | Radiohead (Cover)',
      channel: 'nani'
    }
  });
  assert.equal(result.ready, true);
  assert.equal(result.source, 'selected-playlist-row');
  assert.match(result.title, /cover/i);
  assert.equal(result.description, '');
});

test('waits when URL and page metadata identify different videos', () => {
  const result = resolveSynchronizedMetadata({
    videoId: 'new-cover',
    pageTitle: 'Previous non-cover video',
    flexyVideoId: 'previous-video',
    selectedMetadata: { videoId: 'previous-video', title: 'Previous non-cover video' }
  });
  assert.equal(result.ready, false);
  assert.equal(result.source, 'transitioning');
});

test('uses watch metadata once its video identity matches the URL', () => {
  const result = resolveSynchronizedMetadata({
    videoId: 'cover-1',
    pageTitle: 'Song (Cover)',
    pageChannel: 'Singer',
    pageDescription: 'My version',
    flexyVideoId: 'cover-1'
  });
  assert.equal(result.ready, true);
  assert.equal(result.source, 'watch-metadata');
});

test('allows a pending skip only while the rejected video is still current', () => {
  assert.equal(
    canExecuteSkip({
      expectedVideoId: 'rejected-1',
      pendingSkipVideoId: 'rejected-1',
      actualVideoId: 'rejected-1',
      statusVideoId: 'rejected-1',
      statusVerdict: 'uncertain'
    }),
    true
  );
});

test('cancels a stale skip after navigation reaches a cover', () => {
  assert.equal(
    canExecuteSkip({
      expectedVideoId: 'rejected-1',
      pendingSkipVideoId: 'rejected-1',
      actualVideoId: 'cover-2',
      statusVideoId: 'cover-2',
      statusVerdict: 'accepted'
    }),
    false
  );
});
