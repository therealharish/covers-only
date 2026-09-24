# Covers Only for YouTube Mix

A privacy-first Chrome extension that keeps YouTube's auto-generated Mix playback focused on confidently identified musical covers.

## Install locally

1. Open `chrome://extensions` in desktop Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. Reload any YouTube tab that was already open.
5. Open an auto-generated YouTube Mix, select the extension icon, and enable **Covers Only**.

The extension deliberately skips ambiguous videos. Use **Always allow** or **Always block** to correct individual videos, or add custom include/exclude keywords under Detection settings.

By default it avoids covers heard in the last seven days. Preferences and a bounded recent-video history use Chrome Sync, so they follow you when Chrome Sync is enabled on your other computers. When no fresh cover is available, **Keep music going** plays the least-recently-heard known cover and resumes discovery afterward.

## Privacy and permissions

- `storage`: syncs preferences, recent video IDs/timestamps, and per-video decisions through the user's Chrome profile.
- `https://www.youtube.com/*`: reads visible Mix metadata and controls playback only on YouTube.
- No analytics, API keys, cookies, developer server, account access, external requests, or remote code.

See [PRIVACY.md](PRIVACY.md) for the full disclosure.

## Development

Requires Node.js 18 or newer. No dependencies need to be installed.

```sh
npm test
npm run assets
npm run package
```

The store upload ZIP is produced in `dist/`. `manifest.json` is at the root of the ZIP. GitHub hosts the source and privacy page; automatic installation and updates across Chrome devices require a Chrome Web Store listing.

## How detection works

The classifier applies rules in this order:

1. A saved allow/block decision for the exact YouTube video ID.
2. Excluded content such as reactions, remixes, tutorials, karaoke, dance covers, and lyric edits.
3. Original-release signals when the named artist matches the uploader.
4. Explicit cover language, custom include keywords, or credible uploader-performer attribution.
5. Everything else is uncertain and is skipped.

After cover classification, the freshness layer skips covers found in the synced recent-history window. It can only choose among videos YouTube puts in the current Mix; it cannot force YouTube to recommend a song absent from that Mix.

YouTube does not expose a definitive cover-song flag, so false positives and false negatives are possible. After 25 consecutive rejected or recently played videos, **Keep music going** falls back to the least-recent known cover. If that setting is off—or no cover is available—it pauses to prevent a loop.

## Store publication

The `store-assets/` directory contains listing copy, screenshots, promotional artwork, and a privacy page. Publication still requires a Chrome Web Store developer account and review.

For seamless use across systems, publish the ZIP once in the Chrome Web Store, install it under the same synced Chrome profile everywhere, and upload a higher manifest version for each release. Chrome handles extension updates automatically after store approval.

## Hosted resources

- [Privacy policy](https://therealharish.github.io/covers-only/)
- [GitHub Releases](https://github.com/therealharish/covers-only/releases)
- [Chrome Web Store listing materials](store-assets/LISTING.md)

The release workflow builds a ZIP whenever a `v*` tag is pushed. GitHub Releases are useful for testing and source distribution, but Chrome does not automatically install or update a normal consumer extension from GitHub.
