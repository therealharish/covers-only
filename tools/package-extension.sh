#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$DIST" "$STAGE/assets"
cp "$ROOT/manifest.json" "$STAGE/manifest.json"
cp -R "$ROOT/src" "$ROOT/popup" "$STAGE/"
cp -R "$ROOT/assets/icons" "$STAGE/assets/icons"

cd "$STAGE"
zip -q -r "$DIST/covers-only-youtube-mix-1.1.1.zip" .

echo "Created $DIST/covers-only-youtube-mix-1.1.1.zip"
