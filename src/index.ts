export { loadContext, findCtxDir } from './core/loader.js';
export { compile } from './core/compiler.js';
export { generateCapsule } from './core/capsule.js';
export { generatePreflight } from './core/preflight.js';
export type { PreflightOptions } from './core/preflight.js';
export { runAudit, getStaleFileWarnings, getHealthSection } from './core/audit.js';
export { countTokens } from './utils/tokens.js';
export { getAdapter, getAllAdapters } from './core/adapters/index.js';
export type {
  CtxData, StackConfig, CurrentState, OpenLoop, Decision,
  Landmine, VocabEntry, SessionNote, CtxConfig, Capsule,
  PreflightChecklist, CompiledContext, Adapter,
  FileStaleEntry, EntryDrift, RippleCoverageGap, AuditResult,
} from './types.js';
