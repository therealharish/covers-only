'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyVideo, normalize } = require('../src/classifier.js');

const baseSettings = { positiveKeywords: [], negativeKeywords: [], overrides: {} };

function classify(title, channel = 'Sample Music', description = '', settings = baseSettings) {
  return classifyVideo({ videoId: 'video-1', title, channel, description }, settings);
}

test('normalizes case, accents, punctuation, and whitespace', () => {
  assert.equal(normalize('  Ré‑Imagined   COVER  '), 're‐imagined cover');
});

test('accepts an explicit cover title', () => {
  const result = classify('The One That Got Away - Katy Perry (Cover)', 'Joy Ciarra');
  assert.equal(result.status, 'accepted');
  assert.match(result.reason, /cover signal/i);
});

test('accepts cover evidence in the description', () => {
  const result = classify('Arz Kiya Hai - Anuv Jain', 'hvp.music', 'Here is my cover version.');
  assert.equal(result.status, 'accepted');
});

test('accepts uploader performer attribution used by cover channels', () => {
  const result = classify('Mast Magan - 2 States | Anumita Nadesan', 'Anumita Nadesan');
  assert.equal(result.status, 'accepted');
  assert.match(result.reason, /credits the uploader/i);
});

test('does not accept acoustic alone when the named artist matches the channel', () => {
  const result = classify('Anuv Jain - BAARISHEIN (ACOUSTIC)', 'Anuv Jain');
  assert.equal(result.status, 'uncertain');
});

for (const [label, title] of [
  ['reaction', 'Vocal coach reaction to a famous cover'],
  ['remix', 'Song Name (Club Remix Cover)'],
  ['tutorial', 'Song Name guitar tutorial cover'],
  ['karaoke', 'Song Name karaoke cover'],
  ['dance cover', 'Song Name dance cover']
]) {
  test(`rejects ${label} even when cover also appears`, () => {
    assert.equal(classify(title).status, 'rejected');
  });
}

test('saved allow override has highest precedence', () => {
  const settings = { ...baseSettings, overrides: { 'video-1': 'allow' } };
  assert.equal(classify('Song Name karaoke', 'Channel', '', settings).status, 'accepted');
});

test('saved block override has highest precedence', () => {
  const settings = { ...baseSettings, overrides: { 'video-1': 'block' } };
  assert.equal(classify('Song Name (Cover)', 'Channel', '', settings).status, 'rejected');
});

test('custom negative keyword wins over custom positive keyword', () => {
  const settings = {
    ...baseSettings,
    positiveKeywords: ['special session'],
    negativeKeywords: ['analysis']
  };
  const result = classify('Special session analysis', 'Channel', '', settings);
  assert.equal(result.status, 'rejected');
});

test('custom positive keyword accepts a matching video', () => {
  const settings = { ...baseSettings, positiveKeywords: ['living room take'] };
  const result = classify('Song Name - living room take', 'Channel', '', settings);
  assert.equal(result.status, 'accepted');
});

test('ambiguous titles remain uncertain', () => {
  assert.equal(classify('A beautiful song', 'Unknown Artist').status, 'uncertain');
});
