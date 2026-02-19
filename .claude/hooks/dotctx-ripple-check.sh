#!/usr/bin/env bash
# dotctx-ripple-check
# Auto-injected by dotctx — shows ripple effects after file edits.
# Injects reminder as additionalContext via PostToolUse JSON output.
# Always exits 0 — never blocks the user.

INPUT=$(cat)
FILE=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.tool_input?.file_path||'')}catch{}})" 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 0
fi

# Check for ripple effects
if command -v dotctx &>/dev/null; then
  RIPPLE=$(dotctx check "$FILE" --ripple 2>/dev/null)
elif [ -x "./node_modules/.bin/dotctx" ]; then
  RIPPLE=$(./node_modules/.bin/dotctx check "$FILE" --ripple 2>/dev/null)
else
  RIPPLE=$(npx --yes dotctx check "$FILE" --ripple 2>/dev/null)
fi

if [ -n "$RIPPLE" ]; then
  node -e "console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:process.argv[1]}}))" "$RIPPLE"
fi

exit 0
