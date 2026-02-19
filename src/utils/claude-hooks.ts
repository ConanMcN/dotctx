import fs from 'node:fs';
import path from 'node:path';

const PREFLIGHT_FILENAME = 'dotctx-preflight.sh';
const PREFLIGHT_MARKER = '# dotctx-preflight';

const POST_COMMIT_FILENAME = 'dotctx-post-commit.sh';
const POST_COMMIT_MARKER = '# dotctx-post-commit';

const SESSION_SYNC_FILENAME = 'dotctx-session-sync.sh';
const SESSION_SYNC_MARKER = '# dotctx-session-sync';

const LANDMINE_GUARD_FILENAME = 'dotctx-landmine-guard.sh';
const LANDMINE_GUARD_MARKER = '# dotctx-landmine-guard';

const RIPPLE_CHECK_FILENAME = 'dotctx-ripple-check.sh';
const RIPPLE_CHECK_MARKER = '# dotctx-ripple-check';

const PREFLIGHT_SCRIPT = `#!/usr/bin/env bash
${PREFLIGHT_MARKER}
# Auto-injected by dotctx init — runs preflight on every Claude Code prompt.
# stdout is added as context automatically by Claude Code.
# Always exits 0 — never blocks the user.

PROMPT=$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).prompt)}catch{}})" 2>/dev/null)

if [ -z "$PROMPT" ]; then
  exit 0
fi

# Try direct binary, then node_modules, then npx
if command -v dotctx &>/dev/null; then
  dotctx preflight --task "$PROMPT" 2>/dev/null
elif [ -x "./node_modules/.bin/dotctx" ]; then
  ./node_modules/.bin/dotctx preflight --task "$PROMPT" 2>/dev/null
else
  npx --yes dotctx preflight --task "$PROMPT" 2>/dev/null
fi

exit 0
`;

const POST_COMMIT_SCRIPT = `#!/usr/bin/env bash
${POST_COMMIT_MARKER}
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
`;

const SESSION_SYNC_SCRIPT = `#!/usr/bin/env bash
${SESSION_SYNC_MARKER}
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
`;

const LANDMINE_GUARD_SCRIPT = `#!/usr/bin/env bash
${LANDMINE_GUARD_MARKER}
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
`;

const RIPPLE_CHECK_SCRIPT = `#!/usr/bin/env bash
${RIPPLE_CHECK_MARKER}
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
`;

// --- Shared helpers ---

function getHooksDir(cwd: string): string {
  return path.join(cwd, '.claude', 'hooks');
}

function getSettingsPath(cwd: string): string {
  return path.join(cwd, '.claude', 'settings.json');
}

function readSettings(settingsPath: string): Record<string, unknown> {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(settingsPath: string, data: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function hasHookRegistered(settings: Record<string, unknown>, eventType: string, markerSubstring: string): boolean {
  const hooks = settings?.hooks as Record<string, unknown[]> | undefined;
  const matcherGroups = hooks?.[eventType];
  if (!Array.isArray(matcherGroups)) return false;
  return matcherGroups.some((group: { hooks?: { command?: string }[] }) =>
    Array.isArray(group.hooks) && group.hooks.some(
      (h) => typeof h.command === 'string' && h.command.includes(markerSubstring)
    )
  );
}

function registerHookInSettings(
  settingsPath: string,
  eventType: string,
  hookPath: string,
  matcher?: string,
  timeout?: number,
): void {
  const settings = readSettings(settingsPath);

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const matcherGroups = Array.isArray(hooks[eventType]) ? hooks[eventType] : [];

  const hookEntry: Record<string, unknown> = {
    type: 'command',
    command: hookPath,
  };
  if (timeout) hookEntry.timeout = timeout;

  const groupEntry: Record<string, unknown> = {
    hooks: [hookEntry],
  };
  if (matcher) groupEntry.matcher = matcher;

  matcherGroups.push(groupEntry);
  hooks[eventType] = matcherGroups;
  settings.hooks = hooks;

  writeSettings(settingsPath, settings);
}

// --- Install functions (used during init) ---

export function installClaudeHookDuringInit(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, PREFLIGHT_FILENAME);
    const settingsPath = getSettingsPath(cwd);

    if (hasHookRegistered(readSettings(settingsPath), 'UserPromptSubmit', 'dotctx-preflight')) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, PREFLIGHT_SCRIPT, { mode: 0o755 });

    registerHookInSettings(settingsPath, 'UserPromptSubmit', hookPath, undefined, 10000);

    return hookPath;
  } catch {
    return null;
  }
}

export function installClaudePostCommitHook(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, POST_COMMIT_FILENAME);
    const settingsPath = getSettingsPath(cwd);

    if (hasHookRegistered(readSettings(settingsPath), 'PostToolUse', 'dotctx-post-commit')) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, POST_COMMIT_SCRIPT, { mode: 0o755 });

    registerHookInSettings(settingsPath, 'PostToolUse', hookPath, 'Bash', 15000);

    return hookPath;
  } catch {
    return null;
  }
}

export function installClaudeSessionSyncHook(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, SESSION_SYNC_FILENAME);
    const settingsPath = getSettingsPath(cwd);

    if (hasHookRegistered(readSettings(settingsPath), 'Stop', 'dotctx-session-sync')) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, SESSION_SYNC_SCRIPT, { mode: 0o755 });

    registerHookInSettings(settingsPath, 'Stop', hookPath, undefined, 10000);

    return hookPath;
  } catch {
    return null;
  }
}

export function installClaudeLandmineGuardHook(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, LANDMINE_GUARD_FILENAME);
    const settingsPath = getSettingsPath(cwd);

    if (hasHookRegistered(readSettings(settingsPath), 'PreToolUse', 'dotctx-landmine-guard')) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, LANDMINE_GUARD_SCRIPT, { mode: 0o755 });

    registerHookInSettings(settingsPath, 'PreToolUse', hookPath, 'Write|Edit', 5000);

    return hookPath;
  } catch {
    return null;
  }
}

export function installClaudeRippleCheckHook(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, RIPPLE_CHECK_FILENAME);
    const settingsPath = getSettingsPath(cwd);

    if (hasHookRegistered(readSettings(settingsPath), 'PostToolUse', 'dotctx-ripple-check')) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, RIPPLE_CHECK_SCRIPT, { mode: 0o755 });

    registerHookInSettings(settingsPath, 'PostToolUse', hookPath, 'Write|Edit', 5000);

    return hookPath;
  } catch {
    return null;
  }
}

// --- Upgrade function ---

export function upgradeClaudeHooks(cwd: string): string[] {
  const changes: string[] = [];
  const hooksDir = getHooksDir(cwd);
  const settingsPath = getSettingsPath(cwd);

  fs.mkdirSync(hooksDir, { recursive: true });

  // Always overwrite all hook scripts to latest
  const scripts: { filename: string; content: string }[] = [
    { filename: PREFLIGHT_FILENAME, content: PREFLIGHT_SCRIPT },
    { filename: POST_COMMIT_FILENAME, content: POST_COMMIT_SCRIPT },
    { filename: SESSION_SYNC_FILENAME, content: SESSION_SYNC_SCRIPT },
    { filename: LANDMINE_GUARD_FILENAME, content: LANDMINE_GUARD_SCRIPT },
    { filename: RIPPLE_CHECK_FILENAME, content: RIPPLE_CHECK_SCRIPT },
  ];

  for (const { filename, content } of scripts) {
    fs.writeFileSync(path.join(hooksDir, filename), content, { mode: 0o755 });
    changes.push(`Updated ${filename}`);
  }

  // Add missing hook registrations (re-read settings between each to avoid duplicates)
  const registrations: { event: string; marker: string; filename: string; matcher?: string; timeout: number }[] = [
    { event: 'UserPromptSubmit', marker: 'dotctx-preflight', filename: PREFLIGHT_FILENAME, timeout: 10000 },
    { event: 'PostToolUse', marker: 'dotctx-post-commit', filename: POST_COMMIT_FILENAME, matcher: 'Bash', timeout: 15000 },
    { event: 'Stop', marker: 'dotctx-session-sync', filename: SESSION_SYNC_FILENAME, timeout: 10000 },
    { event: 'PreToolUse', marker: 'dotctx-landmine-guard', filename: LANDMINE_GUARD_FILENAME, matcher: 'Write|Edit', timeout: 5000 },
    { event: 'PostToolUse', marker: 'dotctx-ripple-check', filename: RIPPLE_CHECK_FILENAME, matcher: 'Write|Edit', timeout: 5000 },
  ];

  for (const reg of registrations) {
    const currentSettings = readSettings(settingsPath);
    if (!hasHookRegistered(currentSettings, reg.event, reg.marker)) {
      const hookPath = path.join(hooksDir, reg.filename);
      registerHookInSettings(settingsPath, reg.event, hookPath, reg.matcher, reg.timeout);
      changes.push(`Registered ${reg.event}${reg.matcher ? ` (${reg.marker})` : ''} hook in settings.json`);
    }
  }

  return changes;
}
