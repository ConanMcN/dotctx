---
"dotctx": patch
---

Add unit tests for preflight and loader modules

- 16 tests for `generatePreflight`: keyword matching, brief mode, health warnings (stale context, branch mismatch, expired loops), backwards compatibility
- 15 tests for `loadContext`/`findCtxDir`: YAML/markdown parsing, directory traversal, session loading, config defaults, missing file handling
- Test suite now at 83 tests across 9 files
