(function initPlaybackState(globalScope) {
  'use strict';

  function resolveSynchronizedMetadata(input) {
    const {
      videoId = '',
      pageTitle = '',
      pageChannel = '',
      pageDescription = '',
      flexyVideoId = '',
      selectedMetadata = null
    } = input || {};

    if (selectedMetadata?.videoId === videoId && selectedMetadata.title) {
      return {
        videoId,
        title: selectedMetadata.title,
        channel: selectedMetadata.channel || (flexyVideoId === videoId ? pageChannel : ''),
        description: flexyVideoId === videoId ? pageDescription : '',
        ready: true,
        source: 'selected-playlist-row'
      };
    }

    if (flexyVideoId === videoId && pageTitle) {
      return {
        videoId,
        title: pageTitle,
        channel: pageChannel,
        description: pageDescription,
        ready: true,
        source: 'watch-metadata'
      };
    }

    return {
      videoId,
      title: '',
      channel: '',
      description: '',
      ready: false,
      source: 'transitioning'
    };
  }

  function canExecuteSkip(input) {
    const {
      expectedVideoId = '',
      pendingSkipVideoId = '',
      actualVideoId = '',
      statusVideoId = '',
      statusVerdict = ''
    } = input || {};
    return Boolean(
      expectedVideoId &&
        expectedVideoId === pendingSkipVideoId &&
        expectedVideoId === actualVideoId &&
        expectedVideoId === statusVideoId &&
        statusVerdict !== 'accepted'
    );
  }

  const api = { canExecuteSkip, resolveSynchronizedMetadata };
  globalScope.CoversOnlyPlaybackState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
