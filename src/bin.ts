#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerInit } from './commands/init.js';
import { registerPull } from './commands/pull.js';
import { registerPreflight } from './commands/preflight.js';
import { registerPush } from './commands/push.js';
import { registerCompile } from './commands/compile.js';
import { registerDecide } from './commands/decide.js';
import { registerLandmine } from './commands/landmine.js';
import { registerVocab } from './commands/vocab.js';
import { registerLoop } from './commands/loop.js';
import { registerStatus } from './commands/status.js';
import { registerPrune } from './commands/prune.js';
import { registerServe } from './commands/serve.js';
import { registerSkill } from './commands/skill.js';
import { registerHooks } from './commands/hooks.js';
import { registerUpgrade } from './commands/upgrade.js';
import { registerCheck } from './commands/check.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('dotctx')
  .description('Universal AI context management — file-based, git-tracked, model-agnostic')
  .version(version);

registerInit(program);
registerPull(program);
registerPreflight(program);
registerPush(program);
registerCompile(program);
registerDecide(program);
registerLandmine(program);
registerVocab(program);
registerLoop(program);
registerStatus(program);
registerPrune(program);
registerServe(program);
registerSkill(program);
registerHooks(program);
registerUpgrade(program);
registerCheck(program);

program.parse();
