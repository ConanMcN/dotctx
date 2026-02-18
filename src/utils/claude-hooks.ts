import fs from 'node:fs';
import path from 'node:path';

const HOOK_FILENAME = 'dotctx-preflight.sh';
const HOOK_MARKER = '# dotctx-preflight';

const HOOK_SCRIPT = `#!/usr/bin/env bash
${HOOK_MARKER}
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

function getHooksDir(cwd: string): string {
  return path.join(cwd, '.claude', 'hooks');
}

function hasExistingHook(settingsPath: string): boolean {
  if (!fs.existsSync(settingsPath)) return false;
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const hooks = settings?.hooks?.UserPromptSubmit;
    if (!Array.isArray(hooks)) return false;
    return hooks.some((h: { command?: string }) =>
      typeof h.command === 'string' && h.command.includes('dotctx-preflight')
    );
  } catch {
    return false;
  }
}

function installSettings(cwd: string, hookPath: string): void {
  const settingsPath = path.join(cwd, '.claude', 'settings.json');

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  if (hasExistingHook(settingsPath)) return;

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const userPromptHooks = Array.isArray(hooks.UserPromptSubmit) ? hooks.UserPromptSubmit : [];

  userPromptHooks.push({
    type: 'command',
    command: hookPath,
    timeout: 10000,
  });

  hooks.UserPromptSubmit = userPromptHooks;
  settings.hooks = hooks;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

export function installClaudeHookDuringInit(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, HOOK_FILENAME);
    const settingsPath = path.join(cwd, '.claude', 'settings.json');

    // Idempotent: skip if hook already registered
    if (hasExistingHook(settingsPath)) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });

    installSettings(cwd, hookPath);

    return hookPath;
  } catch {
    return null;
  }
}
