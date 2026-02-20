import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { findCtxDir, loadContext } from '../core/loader.js';

describe('findCtxDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotctx-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds .ctx/ in the given directory', () => {
    const ctxDir = path.join(tmpDir, '.ctx');
    fs.mkdirSync(ctxDir);

    const result = findCtxDir(tmpDir);
    expect(result).toBe(ctxDir);
  });

  it('walks up to find .ctx/ in parent directory', () => {
    const ctxDir = path.join(tmpDir, '.ctx');
    fs.mkdirSync(ctxDir);

    const nested = path.join(tmpDir, 'src', 'core');
    fs.mkdirSync(nested, { recursive: true });

    const result = findCtxDir(nested);
    expect(result).toBe(ctxDir);
  });

  it('returns null when no .ctx/ found', () => {
    const result = findCtxDir(tmpDir);
    expect(result).toBeNull();
  });
});

describe('loadContext', () => {
  let tmpDir: string;
  let ctxDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotctx-test-'));
    ctxDir = path.join(tmpDir, '.ctx');
    fs.mkdirSync(ctxDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty context when .ctx/ does not exist', () => {
    const nonexistent = path.join(tmpDir, 'nonexistent', '.ctx');
    const ctx = loadContext(nonexistent);

    expect(ctx.stack).toBeNull();
    expect(ctx.current).toBeNull();
    expect(ctx.decisions).toEqual([]);
    expect(ctx.landmines).toEqual([]);
    expect(ctx.vocabulary).toEqual([]);
    expect(ctx.openLoops).toEqual([]);
    expect(ctx.sessions).toEqual([]);
  });

  it('loads stack.yaml', () => {
    fs.writeFileSync(path.join(ctxDir, 'stack.yaml'), `
language:
  - TypeScript
framework:
  - Node.js
build:
  - tsup
test:
  - vitest
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.stack).toBeTruthy();
    expect(ctx.stack!.language).toContain('TypeScript');
    expect(ctx.stack!.framework).toContain('Node.js');
  });

  it('loads current.yaml', () => {
    fs.writeFileSync(path.join(ctxDir, 'current.yaml'), `
branch: feat/test
task: Write tests
state: in-progress
next_step: Run them
blocked_by: ''
files_touched:
  - src/test.ts
updated_at: '2026-02-20'
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.current).toBeTruthy();
    expect(ctx.current!.branch).toBe('feat/test');
    expect(ctx.current!.task).toBe('Write tests');
    expect(ctx.current!.files_touched).toContain('src/test.ts');
  });

  it('parses decisions from markdown table', () => {
    fs.writeFileSync(path.join(ctxDir, 'decisions.md'), `# Decisions

| Decision | Rejected | Why | Date |
|----------|----------|-----|------|
| Use ESM | CJS, dual | Simpler build | 2026-01-01 |
| Use Zod | io-ts | Better DX | 2026-01-02 |
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.decisions).toHaveLength(2);
    expect(ctx.decisions[0].decision).toBe('Use ESM');
    expect(ctx.decisions[0].rejected).toBe('CJS, dual');
    expect(ctx.decisions[1].decision).toBe('Use Zod');
  });

  it('parses landmines from markdown table', () => {
    fs.writeFileSync(path.join(ctxDir, 'landmines.md'), `# Landmines

<!-- Things that look wrong but are intentional -->
| Description | File | Why | Date |
|-------------|------|-----|------|
| console.error in serve | src/commands/serve.ts:10 | MCP stdio transport | 2026-01-01 |
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.landmines).toHaveLength(1);
    expect(ctx.landmines[0].description).toBe('console.error in serve');
    expect(ctx.landmines[0].file).toBe('src/commands/serve.ts:10');
  });

  it('parses vocabulary from markdown table', () => {
    fs.writeFileSync(path.join(ctxDir, 'vocabulary.md'), `# Vocabulary

| Term | Definition |
|------|-----------|
| capsule | A compiled context blob |
| landmine | Code that looks wrong but is intentional |
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.vocabulary).toHaveLength(2);
    expect(ctx.vocabulary[0].term).toBe('capsule');
    expect(ctx.vocabulary[1].term).toBe('landmine');
  });

  it('loads open loops from YAML', () => {
    fs.writeFileSync(path.join(ctxDir, 'open-loops.yaml'), `
loops:
  - id: 1
    description: "Fix auth flow"
    created_at: "2026-02-18"
    ttl: "14d"
    status: open
    context: "Started during refactor"
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.openLoops).toHaveLength(1);
    expect(ctx.openLoops[0].description).toBe('Fix auth flow');
    expect(ctx.openLoops[0].status).toBe('open');
  });

  it('loads sessions from sessions/ directory', () => {
    const sessionsDir = path.join(ctxDir, 'sessions');
    fs.mkdirSync(sessionsDir);
    fs.writeFileSync(path.join(sessionsDir, '2026-02-20T10-00-00.yaml'), `
id: 2026-02-20T10-00-00
date: '2026-02-20'
summary: Added tests
state: in-progress
next_step: ''
files_touched:
  - src/test.ts
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.sessions).toHaveLength(1);
    expect(ctx.sessions[0].summary).toBe('Added tests');
  });

  it('limits sessions to 5 most recent', () => {
    const sessionsDir = path.join(ctxDir, 'sessions');
    fs.mkdirSync(sessionsDir);
    for (let i = 0; i < 8; i++) {
      fs.writeFileSync(path.join(sessionsDir, `2026-02-${String(10 + i).padStart(2, '0')}T10-00-00.yaml`), `
id: session-${i}
date: '2026-02-${10 + i}'
summary: Session ${i}
state: done
next_step: ''
files_touched: []
`);
    }

    const ctx = loadContext(ctxDir);
    expect(ctx.sessions).toHaveLength(5);
  });

  it('loads .ctxrc config', () => {
    fs.writeFileSync(path.join(ctxDir, '.ctxrc'), `
version: 1
budget:
  default: 3000
  adapters:
    claude: 4000
allocation: priority
priority_order:
  - current
  - landmines
  - decisions
`);

    const ctx = loadContext(ctxDir);
    expect(ctx.config.budget.default).toBe(3000);
    expect(ctx.config.budget.adapters?.claude).toBe(4000);
  });

  it('uses DEFAULT_CONFIG when no .ctxrc exists', () => {
    const ctx = loadContext(ctxDir);
    expect(ctx.config.budget.default).toBe(2000);
    expect(ctx.config.allocation).toBe('priority');
  });

  it('handles missing markdown files gracefully', () => {
    const ctx = loadContext(ctxDir);
    expect(ctx.architecture).toBe('');
    expect(ctx.conventions).toBe('');
    expect(ctx.decisions).toEqual([]);
    expect(ctx.landmines).toEqual([]);
    expect(ctx.vocabulary).toEqual([]);
  });
});
