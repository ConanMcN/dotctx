# ctx-work — Context-aware development workflow

You are about to work on a task using structured, context-aware development. This workflow uses dotctx to inject project-specific warnings, conventions, and dependencies at every stage — so you never miss a landmine, break a ripple, or violate a convention.

**Task:** $ARGUMENTS

---

## Stage 1: Triage

Run preflight to understand what this task touches:

```bash
dotctx preflight --task "$ARGUMENTS"
```

**Classify the task tier based on preflight output:**

| Signal | Quick | Standard | Deep |
|--------|-------|----------|------|
| Landmines found | 0 | 1–2 | 3+ |
| Ripple map entries | 0–1 | 2–4 | 5+ |
| Constraining decisions | 0 | 1–2 | 3+ |
| Files likely touched | 1–2 | 3–5 | 6+ |
| Open loops related | 0 | 0–1 | 2+ |

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
Run the project's test suite:

```bash
npm test
```

If tests fail, fix them before proceeding. If the project uses TypeScript, also run:

```bash
npx tsc --noEmit
```

### Deep
Everything from Standard, plus:

1. **Ripple verification** — For each file in the ripple map that your changes affect, verify the downstream files still work correctly:
   ```bash
   dotctx preflight --task "verify ripple effects of changes to [files changed]"
   ```

2. **Full test suite** — Run the complete test suite, not just related tests:
   ```bash
   npm test
   ```

3. **Type check** — Verify no type errors were introduced:
   ```bash
   npx tsc --noEmit
   ```

4. **Lint** (if available):
   ```bash
   npm run lint 2>/dev/null || true
   ```

Report verification results clearly:
```
Verification:
  Tests: [pass/fail]
  Types: [pass/fail]
  Ripple check: [clean/issues found]
```

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

### Deep
Record everything for the next session:

1. **Record new decisions** made during implementation:
   ```bash
   dotctx decide "<decision>" --over "<alternatives>" --why "<reasoning>"
   ```

2. **Mark new landmines** if you wrote code that looks wrong but is intentional:
   ```bash
   dotctx landmine "<description>" --file "<path:line>" --why "<reason>"
   ```

3. **Resolve related open loops** that this task addressed:
   ```bash
   dotctx loop resolve <id>
   ```

4. **Add new open loops** for follow-up work discovered during implementation:
   ```bash
   dotctx loop add "<description>" --ttl 14d
   ```

5. **Sync session state:**
   ```bash
   dotctx push --sync
   ```

6. **Recompile context** (if mutations were made above):
   ```bash
   dotctx compile --target all
   ```

---

## Summary

Print a brief summary of what was done:

```
✓ ctx-work complete

Task: $ARGUMENTS
Tier: [quick|standard|deep]

Changes:
  [list of files modified with brief description]

[If standard/deep:]
Verification: [pass/fail summary]

[If deep:]
Recorded: [N decisions, N landmines, N loops resolved, N loops added]
```

---

## Important notes

- **Trust the hooks** — landmine guard and ripple check fire automatically. Don't duplicate their work.
- **Respect the tier** — don't over-engineer a quick fix or under-verify a deep change.
- **Conventions are constraints** — anti-patterns and AI failure modes from .ctx/conventions.md are things you MUST avoid, not suggestions.
- **Landmines are sacred** — if preflight or the landmine guard warns about a file, read the landmine entry before touching it.
- **Continue tasks** — if the task mentions "continue" or current.yaml shows related work, read session history for continuity.
- **When in doubt, tier up** — it's better to over-verify than to miss a ripple effect.
