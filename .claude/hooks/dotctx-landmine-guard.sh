#!/usr/bin/env bash
# dotctx-landmine-guard
# Auto-injected by dotctx — checks for landmines before file edits.
# Injects warning as additionalContext via PreToolUse JSON output.
# Always exits 0 — never blocks the user.

INPUT=$(cat)
FILE=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.tool_input?.file_path||'')}catch{}})" 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 0
fi

# Check for landmines
if command -v dotctx &>/dev/null; then
  WARNINGS=$(dotctx check "$FILE" --landmines 2>/dev/null)
elif [ -x "./node_modules/.bin/dotctx" ]; then
  WARNINGS=$(./node_modules/.bin/dotctx check "$FILE" --landmines 2>/dev/null)
else
  WARNINGS=$(npx --yes dotctx check "$FILE" --landmines 2>/dev/null)
fi

if [ -n "$WARNINGS" ]; then
  node -e "console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',additionalContext:process.argv[1]}}))" "$WARNINGS"
fi

exit 0
