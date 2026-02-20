---
argument-hint: <task description>
---

# ctx-work — Context-aware development workflow

You are about to work on a task using structured, context-aware development. This workflow uses dotctx to inject project-specific warnings, conventions, and dependencies at every stage — so you never miss a landmine, break a ripple, or violate a convention.

**Task:** $ARGUMENTS

## Rules

- **Trust the hooks** — landmine guard and ripple check fire automatically. Don't duplicate their work.
- **Respect the tier** — don't over-engineer a quick fix or under-verify a deep change.
- **Conventions are constraints** — anti-patterns and AI failure modes from .ctx/conventions.md are things you MUST avoid, not suggestions.
- **Landmines are sacred** — if preflight or the landmine guard warns about a file, read the landmine entry before touching it.
- **Continue tasks** — if the task mentions "continue" or current.yaml shows related work, read session history for continuity.
- **When in doubt, tier up** — it's better to over-verify than to miss a ripple effect.

---

## Stage 1: Triage

Run preflight to understand what this task touches:

```bash
dotctx preflight --task "$ARGUMENTS"
```

**Classify the task tier based on preflight output:**

<tier-signals>
| Signal | Quick | Standard | Deep |
|--------|-------|----------|------|
| Landmines found | 0 | 1–2 | 3+ |
| Ripple map entries | 0–1 | 2–4 | 5+ |
| Constraining decisions | 0 | 1–2 | 3+ |
| Files likely touched | 1–2 | 3–5 | 6+ |
| Open loops related | 0 | 0–1 | 2+ |
</tier-signals>

**Use the highest tier triggered by any signal.** If unsure, go one tier up.

Print your classification:
```
Tier: [quick|standard|deep]
Reason: [which signals triggered this tier]
```

---

## Stage 2: Scope

Gather context proportional to the task tier.

### Quick
Preflight output from Stage 1 is sufficient. Proceed to Plan.

### Standard
Generate a task-specific context capsule:

```bash
dotctx pull --task "$ARGUMENTS"
```

Read the capsule output. Note any conventions, anti-patterns, or AI failure modes mentioned.

### Deep
Everything from Standard, plus read the architecture and conventions directly:

```bash
cat .ctx/architecture.md
cat .ctx/conventions.md
```

Also check for related open loops:

```bash
dotctx loop list
```

Check current work state:

```bash
cat .ctx/current.yaml
```

If current.yaml shows related in-progress work or the task mentions "continue", read the latest session notes:

```bash
ls -t .ctx/sessions/ | head -3
```

Read the most recent session file(s) for context continuity.

---

## Stage 3: Plan

Create a plan proportional to the tier.

### Quick
State your approach in one sentence. No confirmation needed — proceed directly to Build.

### Standard
Write a brief plan:
- What files you'll modify (cross-reference with the ripple map)
- Key changes in each file
- Any landmines or decisions to respect

Proceed to Build unless the plan involves more than 5 files — in that case, confirm with the user before proceeding.

### Deep
Write a detailed plan:
- Files to modify with specific changes
- Ripple effects to verify after changes
- Landmines to avoid
- Decisions that constrain the approach
- Conventions to follow
- Open loops that might be affected

**Wait for user confirmation before proceeding to Build.** Present the plan clearly and ask: "Does this plan look right? Should I proceed?"

---

## Stage 4: Build

Implement the changes.

### Hooks are active — use them, don't duplicate them

The following hooks fire automatically during your work:
- **Landmine guard** (PreToolUse: Write/Edit) — warns before you edit files with known landmines
- **Ripple check** (PostToolUse: Write/Edit) — shows downstream effects after file edits
- **Preflight** (UserPromptSubmit) — refreshes context on each prompt

**When a hook fires:**
- READ the hook output carefully
- ACT on warnings (e.g., if landmine guard warns about a file, check the landmine before editing)
- Do NOT re-run `dotctx preflight` or `dotctx check` manually — the hooks handle this

### During implementation

- Follow conventions from the Scope stage (especially anti-patterns and AI failure modes)
- Respect all constraining decisions surfaced by preflight
- If you discover something that looks wrong but might be intentional, check landmines before "fixing" it:
  ```bash
  dotctx preflight --task "check landmine for [file]"
  ```
- If you make an architectural choice not covered by existing decisions, note it for the Close stage

---

## Stage 5: Verify

Verify proportional to the tier.

### Quick
Re-read the modified file(s) to confirm correctness. Check for obvious issues.

### Standard
Run the project's test suite using its package manager (check for `bun.lockb`, `pnpm-lock.yaml`, `yarn.lock`, or `package-lock.json` to determine the runner).

If tests fail, fix them before proceeding. If the project uses TypeScript, also run `tsc --noEmit` via the package runner.

### Deep
Everything from Standard, plus full verification. Read `deep-verify.md` for detailed procedures including ripple verification, full test suite, type checking, and lint.

---

## Stage 6: Close

Wrap up proportional to the tier.

### Quick
No close steps needed. You're done.

### Standard
Sync the session state:

```bash
dotctx push --sync
```

If preflight showed stale context warnings, consider running `/ctx-refresh` after syncing.

### Deep
Record everything for the next session. Read `deep-close.md` for full close procedures including recording decisions, marking landmines, resolving loops, syncing state, and running audit.

---

## Summary

Print a brief summary of what was done:

<summary-template>
✓ ctx-work complete

Task: $ARGUMENTS
Tier: [quick|standard|deep]

Changes:
  [list of files modified with brief description]

[If standard/deep:]
Verification: [pass/fail summary]

[If deep:]
Recorded: [N decisions, N landmines, N loops resolved, N loops added]
</summary-template>
