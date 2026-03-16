#!/usr/bin/env node

/**
 * AgentDev CLI
 */

import { Command } from 'commander';
import { AgentDev } from '../dist/index.js';

const program = new Command();

program
  .name('agentdev')
  .description('Multi-Agent Collaborative Development Framework')
  .version('0.1.0');

program
  .command('dev')
  .description('Execute parallel development tasks')
  .option('-c, --config <path>', 'Path to config file', 'agentdev.config.ts')
  .option('-p, --parallel <number>', 'Max parallel tasks', '5')
  .argument('<tasks>', 'Path to tasks JSON file')
  .action(async (tasksFile, options) => {
    console.log('🚀 Starting parallel development...');
    console.log(`Tasks file: ${tasksFile}`);
    console.log(`Config: ${options.config}`);
    console.log(`Max parallel: ${options.parallel}`);
    
    // TODO: Load tasks from file and execute
    console.log('\n⚠️  CLI not fully implemented yet. Use programmatic API.');
  });

program
  .command('review')
  .description('Review results from previous run')
  .action(async () => {
    console.log('🔍 Reviewing results...');
    // TODO: Implement
  });

program.parse();
