#!/usr/bin/env bash
# dotctx-post-commit
# Auto-injected by dotctx — runs push + compile after git operations in Claude Code.
# Reads PostToolUse stdin JSON, checks if tool_input.command contains git operations.
# Always exits 0 — never blocks the user.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.tool_input?.command||'')}catch{}})" 2>/dev/null)

case "$COMMAND" in
  *"git commit"*|*"git merge"*|*"git rebase"*|*"git cherry-pick"*)
    # Full push + compile for commit-like operations
    if command -v dotctx &>/dev/null; then
      dotctx push --auto --no-compile 2>/dev/null
      dotctx compile --target all 2>/dev/null
    elif [ -x "./node_modules/.bin/dotctx" ]; then
      ./node_modules/.bin/dotctx push --auto --no-compile 2>/dev/null
      ./node_modules/.bin/dotctx compile --target all 2>/dev/null
    else
      npx --yes dotctx push --auto --no-compile 2>/dev/null
      npx --yes dotctx compile --target all 2>/dev/null
    fi
    ;;
  *"git checkout"*|*"git switch"*)
    # Lightweight sync for branch changes
    if command -v dotctx &>/dev/null; then
      dotctx push --sync 2>/dev/null
    elif [ -x "./node_modules/.bin/dotctx" ]; then
      ./node_modules/.bin/dotctx push --sync 2>/dev/null
    else
      npx --yes dotctx push --sync 2>/dev/null
    fi
    ;;
  *) exit 0 ;;
esac

exit 0
