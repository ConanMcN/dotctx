#!/usr/bin/env bash
# dotctx-preflight
# Auto-injected by dotctx init — runs preflight on every Claude Code prompt.
# stdout is added as context automatically by Claude Code.
# Always exits 0 — never blocks the user.

PROMPT=$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).prompt)}catch{}})" 2>/dev/null)

if [ -z "$PROMPT" ]; then
  exit 0
fi

# Detect question-like prompts and use --brief to reduce noise
BRIEF_FLAG=""
LOWER_PROMPT=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//')
case "$LOWER_PROMPT" in
  what\ *|how\ *|why\ *|where\ *|when\ *|who\ *|which\ *|can\ you\ explain*|explain\ *|show\ me*|tell\ me*|is\ there*|does\ *|do\ you*)
    BRIEF_FLAG="--brief"
    ;;
esac

# Try direct binary, then node_modules, then npx
if command -v dotctx &>/dev/null; then
  dotctx preflight --task "$PROMPT" $BRIEF_FLAG 2>/dev/null
elif [ -x "./node_modules/.bin/dotctx" ]; then
  ./node_modules/.bin/dotctx preflight --task "$PROMPT" $BRIEF_FLAG 2>/dev/null
else
  npx --yes dotctx preflight --task "$PROMPT" $BRIEF_FLAG 2>/dev/null
fi

exit 0
