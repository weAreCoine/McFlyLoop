#!/usr/bin/env node
import { Command } from 'commander';

import { runFly } from './controller/fly.js';

const program = new Command();

program
  .name('mcfly')
  .description('Deterministic orchestrator for multi-agent TDD loops')
  .showHelpAfterError('(add --help for additional information)');

program
  .command('fly')
  .description('Start a trip (scaffold, does nothing yet)')
  .action(() => {
    console.log(runFly(Math.random));
  });

program.parse();
