#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-0.1.0}"
PKG_DIR="release"
PKG_NAME="AI-Tab-Progress-Indicator-v${VERSION}-chrome.zip"

mkdir -p "$PKG_DIR"
rm -f "$PKG_DIR/$PKG_NAME" "$PKG_DIR/$PKG_NAME.sha256"

zip -j "$PKG_DIR/$PKG_NAME" manifest.json content.js README.md
sha256sum "$PKG_DIR/$PKG_NAME" > "$PKG_DIR/$PKG_NAME.sha256"

echo "Created: $PKG_DIR/$PKG_NAME"
echo "Checksum:"
cat "$PKG_DIR/$PKG_NAME.sha256"
