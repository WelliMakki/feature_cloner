#!/usr/bin/env bash
set -euo pipefail

BUMP_TYPE="${1:-patch}"

case "$BUMP_TYPE" in
  patch|minor|major)
    ;;
  *)
    echo "Invalid bump type: $BUMP_TYPE"
    echo "Usage: ./scripts/release-vsix.sh [patch|minor|major]"
    exit 1
    ;;
esac

echo "Bumping $BUMP_TYPE version (no git tag/commit)..."
npm version "$BUMP_TYPE" --no-git-tag-version

echo "Packaging VSIX..."
npm run package

echo "Done. Upload the generated .vsix file from the repo root."
