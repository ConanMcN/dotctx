# Deep Tier — Stage 5: Verification

Everything from Standard tier, plus:

1. **Ripple verification** — For each file in the ripple map that your changes affect, verify the downstream files still work correctly:
   ```bash
   dotctx preflight --task "verify ripple effects of changes to [files changed]"
   ```

2. **Full test suite** — Run the complete test suite (not just related tests) using the project's package manager.

3. **Type check** — Verify no type errors were introduced by running `tsc --noEmit` via the package runner.

4. **Lint** (if available) — Run the project's lint command. Skip gracefully if no lint script exists.

Report verification results clearly:
```
Verification:
  Tests: [pass/fail]
  Types: [pass/fail]
  Ripple check: [clean/issues found]
```
