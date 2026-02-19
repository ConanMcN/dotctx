import fs from 'node:fs';
import path from 'node:path';

const HOOK_FILENAME = 'dotctx-session-start.sh';
const HOOK_MARKER = '# dotctx-session-start';

const HOOK_SCRIPT = `#!/usr/bin/env bash
${HOOK_MARKER}
# Auto-injected by dotctx init — generates context capsule at Cursor session start.
# Returns JSON with additional_context (Cursor's required format).
# Always exits 0 — never blocks the session.

# Try direct binary, then node_modules, then npx
if command -v dotctx &>/dev/null; then
  CAPSULE=$(dotctx pull --task "general session" 2>/dev/null)
elif [ -x "./node_modules/.bin/dotctx" ]; then
  CAPSULE=$(./node_modules/.bin/dotctx pull --task "general session" 2>/dev/null)
else
  CAPSULE=$(npx --yes dotctx pull --task "general session" 2>/dev/null)
fi

if [ -z "$CAPSULE" ]; then
  exit 0
fi

# Escape for JSON and output in Cursor's expected format
node -e "console.log(JSON.stringify({additional_context:process.argv[1]}))" "$CAPSULE" 2>/dev/null

exit 0
`;

function getHooksDir(cwd: string): string {
  return path.join(cwd, '.cursor', 'hooks');
}

function hasExistingHook(configPath: string): boolean {
  if (!fs.existsSync(configPath)) return false;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const hooks = config?.hooks?.sessionStart;
    if (!Array.isArray(hooks)) return false;
    return hooks.some((h: { command?: string }) =>
      typeof h.command === 'string' && h.command.includes('dotctx-session-start')
    );
  } catch {
    return false;
  }
}

function installConfig(cwd: string, hookPath: string): void {
  const configPath = path.join(cwd, '.cursor', 'hooks.json');

  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      config = {};
    }
  }

  if (hasExistingHook(configPath)) return;

  const hooks = (config.hooks ?? {}) as Record<string, unknown[]>;
  const sessionHooks = Array.isArray(hooks.sessionStart) ? hooks.sessionStart : [];

  sessionHooks.push({
    type: 'command',
    command: hookPath,
  });

  hooks.sessionStart = sessionHooks;
  config.hooks = hooks;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function installCursorHookDuringInit(cwd: string): string | null {
  try {
    const hooksDir = getHooksDir(cwd);
    const hookPath = path.join(hooksDir, HOOK_FILENAME);
    const configPath = path.join(cwd, '.cursor', 'hooks.json');

    // Idempotent: skip if hook already registered
    if (hasExistingHook(configPath)) return null;

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });

    installConfig(cwd, hookPath);

    return hookPath;
  } catch {
    return null;
  }
}

export function upgradeCursorHooks(cwd: string): string[] {
  // Only run if .cursor/ exists
  if (!fs.existsSync(path.join(cwd, '.cursor'))) return [];

  const changes: string[] = [];
  const hooksDir = getHooksDir(cwd);
  const hookPath = path.join(hooksDir, HOOK_FILENAME);
  const configPath = path.join(cwd, '.cursor', 'hooks.json');

  fs.mkdirSync(hooksDir, { recursive: true });

  // Always overwrite hook script to latest
  fs.writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });
  changes.push(`Updated ${HOOK_FILENAME}`);

  // Add missing config registration
  if (!hasExistingHook(configPath)) {
    installConfig(cwd, hookPath);
    changes.push('Registered sessionStart hook in hooks.json');
  }

  return changes;
}
