# Contributing

1. Make changes in `src/` or `popup/`.
2. Increase `version` in both `manifest.json` and `package.json`.
3. Run `npm test` and `npm run package`.
4. Load the repository folder through `chrome://extensions` for a live YouTube Mix check.
5. Push to `main`. Tag a release such as `v1.1.0` to generate a downloadable ZIP in GitHub Releases.

Chrome Web Store users receive automatic updates only after the new ZIP is uploaded and approved there. GitHub Actions builds releases but does not publish to the Web Store without Web Store API credentials.
