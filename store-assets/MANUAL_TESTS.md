# Manual browser acceptance checklist

## Installation and activation

- Load the extension unpacked and confirm its 16/32/48/128 px icons render.
- Open the popup outside YouTube; verify it says the extension is not active.
- Open a normal YouTube playlist; enable the toggle and verify nothing is hidden or skipped.
- Open an auto-generated Mix whose `list` parameter begins with `RD`; verify filtering starts.
- Restart Chrome and verify the enabled setting persists.

## Playback

- Start on an explicit cover; verify playback continues and the played count increments once.
- Navigate within YouTube without a full page reload; verify the new video is classified.
- Start on an original, reaction, remix, tutorial, karaoke, or ambiguous video; verify it is skipped once.
- Verify rejected playlist rows are hidden while the extension is enabled and reappear when disabled.
- Exhaust or simulate 25 rejected videos; verify playback pauses and a warning appears without looping.
- Disable the extension while a skip is pending; verify the filter stops and the playlist is restored.

## Corrections and settings

- Mark a rejected video Always allow and verify it plays on the next evaluation.
- Mark an accepted video Always block and verify it is skipped.
- Clear decisions and verify classifier behavior returns.
- Add an include keyword and verify a matching ambiguous video is accepted.
- Add the same phrase to exclude keywords and verify exclusion wins.
- Play a cover, return to it within the configured freshness window, and verify it is skipped as recently played.
- Change the freshness window and verify the new value persists after restarting Chrome.
- With Chrome Sync enabled on a second profile/device, verify preferences and recent video IDs arrive there.
- Clear listening history and verify previously recent covers become eligible again.
- Enable Keep music going, simulate 25 consecutive rejected/recent videos, and verify the least-recent known cover plays.
- After the fallback cover ends, verify freshness filtering resumes on the next video.
- Disable Keep music going and verify exhaustion pauses playback instead.

## Resilience

- Test light and dark YouTube themes.
- Test two YouTube tabs and verify each popup reports the active tab's status.
- Reload, use Back/Forward, switch Mixes, and toggle autoplay.
- Confirm DevTools shows no uncaught errors and the Network panel shows no extension-originated external requests.
