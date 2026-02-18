---
"dotctx": patch
---

Replace all hardcoded `aictx` references with constants

- Created `src/constants.ts` with `CLI_NAME` and `NO_CTX_DIR_MSG`
- Updated all 14 command/core files to use constants instead of hardcoded strings
- Zero `aictx` references remain in source code
- Bootstrap sections now proactively instruct AI to run `dotctx preflight`
