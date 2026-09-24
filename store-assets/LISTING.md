# Chrome Web Store listing

## Name

Covers Only for YouTube Mix

## Short description

Keep YouTube Mix playback focused on confidently identified musical covers.

## Detailed description

Love discovering cover songs, but tired of YouTube Mix drifting back to originals, remixes, reactions, and tutorials?

Covers Only works directly inside YouTube's auto-generated Mixes. Turn it on from the toolbar and it will use visible video metadata to keep confident musical covers playing while hiding and skipping uncertain or excluded entries.

Features:

- Filters only auto-generated YouTube Mixes; normal playlists are left alone.
- Recognizes explicit cover language and performer-attribution patterns.
- Rejects reactions, remixes, tutorials, karaoke, dance-only covers, and lyric edits.
- Lets you always allow or block an individual video.
- Supports your own include and exclude keywords.
- Avoids covers heard recently, using a configurable 1–30 day window.
- Syncs preferences and a bounded recent-video history through Chrome Sync.
- Keeps music going by falling back to the least-recent known cover, then resumes discovery.
- Runs without account access, an API key, analytics, or a developer-operated server.

Classification is based on metadata and cannot be perfect because YouTube does not provide a definitive “cover song” label. The extension intentionally treats ambiguous videos as uncertain and skips them.

## Category

Fun

## Language

English

## Permission justification

### storage

Stores and synchronizes the enabled toggle, custom detection keywords, freshness preferences, up to 120 recent video IDs/timestamps, and explicit allow/block decisions through the user's Chrome profile.

### youtube.com site access

Reads visible metadata from the current YouTube Mix and uses YouTube's native playback controls to hide or skip entries that are not confidently classified as musical covers. Access is not used outside YouTube.

## Privacy questionnaire guidance

- Personally identifiable information: No.
- Health, financial, authentication, or personal communications: No.
- Website content: Yes, processed locally for the user-facing filtering feature.
- Web history: The extension stores only a bounded history of YouTube video IDs it played and timestamps, solely to avoid repetition. It does not read general browser history.
- Data sold or transferred: No.
- Data used for advertising or credit decisions: No.
- Remote code: No.

Review the answers against the current Chrome Web Store form before submission.

## Required publisher edits

- Add a real support email or website to `PRIVACY.md` and `privacy.html`.
- Host the privacy page at a public HTTPS URL and add it in the Developer Dashboard.
- Supply the publisher name and support URL.
- Review screenshots and listing copy for final branding.
