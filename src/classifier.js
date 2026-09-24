(function initClassifier(globalScope) {
  'use strict';

  const DEFAULT_POSITIVE_KEYWORDS = Object.freeze([
    'cover',
    'covered by',
    'cover version',
    'rendition',
    'reimagined',
    're-imagined',
    'reinterpretation',
    'tribute version',
    'my version',
    'sung by',
    'performed by'
  ]);

  const DEFAULT_NEGATIVE_KEYWORDS = Object.freeze([
    'reaction',
    'reacts to',
    'remix',
    'mashup',
    'tutorial',
    'how to play',
    'guitar lesson',
    'karaoke',
    'instrumental backing track',
    'dance cover',
    'dance choreography',
    'lyric video',
    'lyrics video',
    'nightcore',
    'sped up',
    'slowed + reverb'
  ]);

  const ORIGINAL_RELEASE_PATTERNS = Object.freeze([
    /\bofficial (music )?(video|audio)\b/,
    /\bofficial lyric(s)? video\b/,
    /\boriginal song\b/,
    /\boriginal soundtrack\b/,
    /\bfrom the (original )?motion picture\b/,
    /\bfull soundtrack\b/
  ]);

  const ARRANGEMENT_CUES = Object.freeze([
    'acoustic',
    'unplugged',
    'live session',
    'bedroom session',
    'stripped version',
    'piano version'
  ]);

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function cleanList(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map(normalize)
      .filter((value) => value && !seen.has(value) && seen.add(value));
  }

  function firstMatchingKeyword(text, keywords) {
    return keywords.find((keyword) => text.includes(keyword)) || '';
  }

  function channelAttribution(title, channel) {
    const normalizedChannel = normalize(channel)
      .replace(/\b(official|music|channel)\b/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalizedChannel.length < 3) return false;

    const pieces = normalize(title)
      .split(/\s*[|/]\s*/)
      .map((piece) => piece.replace(/[^a-z0-9 ]/g, '').trim())
      .filter(Boolean);

    if (pieces.length >= 2) {
      const creditedPerformer = pieces[pieces.length - 1];
      if (
        creditedPerformer.includes(normalizedChannel) ||
        normalizedChannel.includes(creditedPerformer)
      ) {
        return true;
      }
    }

    return new RegExp(`\\b(cover|sung|performed) by ${escapeRegExp(normalizedChannel)}\\b`).test(
      normalize(title).replace(/[^a-z0-9 ]/g, ' ')
    );
  }

  function leadingArtistMatchesChannel(title, channel) {
    const leading = normalize(title).split(/\s+-\s+/)[0].replace(/[^a-z0-9 ]/g, '').trim();
    const normalizedChannel = normalize(channel)
      .replace(/\b(official|music|channel)\b/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .trim();
    if (leading.length < 3 || normalizedChannel.length < 3) return false;
    return leading.includes(normalizedChannel) || normalizedChannel.includes(leading);
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function classifyVideo(metadata, settings) {
    const safeMetadata = metadata || {};
    const safeSettings = settings || {};
    const videoId = String(safeMetadata.videoId || '');
    const title = String(safeMetadata.title || '');
    const channel = String(safeMetadata.channel || '');
    const description = String(safeMetadata.description || '');
    const text = normalize(`${title} ${description}`);
    const overrides = safeSettings.overrides || {};
    const override = videoId ? overrides[videoId] : undefined;

    if (override === 'allow') {
      return verdict('accepted', 'Saved as always allow', ['video override: allow'], 1);
    }
    if (override === 'block') {
      return verdict('rejected', 'Saved as always block', ['video override: block'], 1);
    }

    const negativeKeywords = cleanList([
      ...DEFAULT_NEGATIVE_KEYWORDS,
      ...(safeSettings.negativeKeywords || [])
    ]);
    const negativeMatch = firstMatchingKeyword(text, negativeKeywords);
    if (negativeMatch) {
      return verdict(
        'rejected',
        `Excluded content type: “${negativeMatch}”`,
        [`excluded keyword: ${negativeMatch}`],
        0.99
      );
    }

    const originalPattern = ORIGINAL_RELEASE_PATTERNS.find((pattern) => pattern.test(text));
    if (originalPattern && leadingArtistMatchesChannel(title, channel)) {
      return verdict(
        'rejected',
        'Looks like an official or original-artist release',
        ['original-release signal', 'artist matches channel'],
        0.92
      );
    }

    const customPositive = firstMatchingKeyword(text, cleanList(safeSettings.positiveKeywords || []));
    if (customPositive) {
      return verdict(
        'accepted',
        `Matched your include keyword: “${customPositive}”`,
        [`custom include: ${customPositive}`],
        0.95
      );
    }

    const positiveMatch = firstMatchingKeyword(text, DEFAULT_POSITIVE_KEYWORDS);
    if (positiveMatch) {
      return verdict(
        'accepted',
        `Strong cover signal: “${positiveMatch}”`,
        [`cover keyword: ${positiveMatch}`],
        0.96
      );
    }

    if (channelAttribution(title, channel)) {
      return verdict(
        'accepted',
        'Title credits the uploader as the performer',
        ['performer-attribution pattern'],
        0.82
      );
    }

    const arrangementCue = firstMatchingKeyword(text, ARRANGEMENT_CUES);
    if (arrangementCue) {
      return verdict(
        'uncertain',
        `“${arrangementCue}” alone does not prove this is a cover`,
        [`unqualified arrangement cue: ${arrangementCue}`],
        0.45
      );
    }

    return verdict(
      'uncertain',
      'No confident cover evidence was found',
      ['no positive cover signal'],
      0.15
    );
  }

  function verdict(status, reason, signals, confidence) {
    return { status, reason, signals, confidence };
  }

  const api = {
    ARRANGEMENT_CUES,
    DEFAULT_NEGATIVE_KEYWORDS,
    DEFAULT_POSITIVE_KEYWORDS,
    classifyVideo,
    normalize
  };

  globalScope.CoversOnlyClassifier = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
