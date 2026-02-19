#!/usr/bin/env bash
# dotctx-session-sync
# Auto-injected by dotctx — syncs current.yaml when Claude finishes responding.
# Keeps context fresh even if session ends without a commit.
# Always exits 0 — never blocks the user.

# Try direct binary, then node_modules, then npx
if command -v dotctx &>/dev/null; then
  dotctx push --sync 2>/dev/null
elif [ -x "./node_modules/.bin/dotctx" ]; then
  ./node_modules/.bin/dotctx push --sync 2>/dev/null
else
  npx --yes dotctx push --sync 2>/dev/null
fi

exit 0
