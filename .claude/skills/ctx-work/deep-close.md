# Deep Tier — Stage 6: Close

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

7. **Check for stale context** — run audit and refresh if needed:
   ```bash
   dotctx audit
   ```
   If any files are flagged as stale and your task touched related areas, review and update them now.
   Use dotctx mutation commands for structured updates, or edit markdown files directly for architecture/conventions.
