# Privacy Policy — Covers Only for YouTube Mix

Effective date: September 24, 2026

## Summary

Covers Only for YouTube Mix processes YouTube page metadata locally on your device so it can identify likely musical covers and control playback. It uses Chrome Sync for extension preferences and a bounded recent-listening history when Chrome Sync is enabled. The developer does not receive, sell, or share this data.

## Data processed

While you are viewing `youtube.com`, the extension reads the current page URL, video ID, video title, channel name, visible description, and visible auto-generated Mix entries. This information is used only to classify videos and skip or hide videos that are not confident covers.

## Data stored

Chrome extension storage is used to remember:

- Whether covers-only mode is enabled.
- Custom include and exclude keywords.
- Video IDs that you explicitly mark as always allowed or always blocked.
- Up to 120 recently played video IDs and their playback timestamps, used to reduce repetition.
- Freshness-window and keep-playing preferences.

These settings use `chrome.storage.sync`, which lets Chrome synchronize them through the Google account connected to the browser when Chrome Sync is enabled. Chrome's handling of synchronized data is governed by Google's privacy terms. The extension never sends this information to the developer or a developer-operated service. You can clear listening history and video decisions from the popup.

## Data collection and sharing

The extension has no analytics, advertising, account system, external API, or developer-operated server. Other than Chrome's built-in synchronization, it makes no external network requests and does not access cookies, authentication details, general browsing history, comments, private playlists, or Google Account data.

## Permissions

- `storage` is used for synchronized preferences, recent video IDs/timestamps, and per-video decisions.
- Access to `https://www.youtube.com/*` is used to read visible Mix metadata and operate YouTube's native Next and Pause controls for the user-facing filtering feature.

## Changes

Any future change that introduces new data handling will be disclosed before release and reflected in this policy and the Chrome Web Store privacy disclosure.

## Contact

Support is available through the project's [GitHub issue tracker](https://github.com/therealharish/covers-only/issues).
