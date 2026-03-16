/**
 * AgentDev Demo
 * 
 * This example shows how to use AgentDev for parallel development.
 */

import { AgentDev } from '../src/index.js';
import type { Task } from '../src/types.js';

async function main() {
  console.log('🚀 AgentDev Demo\n');

  // Define tasks
  const tasks: Task[] = [
    {
      id: 'implement-screenshot',
      agent: 'claude',
      task: 'Implement screenshot service for GUI automation. Create src/services/screenshot.ts with functions to capture screen regions.',
      files: ['src/services/screenshot.ts'],
      priority: 'high',
    },
    {
      id: 'implement-input',
      agent: 'claude',
      task: 'Implement keyboard and mouse input service. Create src/services/input.ts with functions for mouse clicks and keyboard typing.',
      files: ['src/services/input.ts'],
      priority: 'high',
    },
    {
      id: 'implement-server',
      agent: 'glm',
      task: 'Implement HTTP server with endpoints for screenshot and input services. Create src/server.ts.',
      files: ['src/server.ts'],
      deps: ['implement-screenshot', 'implement-input'],
    },
    {
      id: 'write-tests',
      agent: 'claude',
      task: 'Write unit tests for all services. Create tests/*.test.ts files.',
      files: ['tests/screenshot.test.ts', 'tests/input.test.ts', 'tests/server.test.ts'],
      deps: ['implement-server'],
    },
  ];

  console.log('📋 Tasks:');
  tasks.forEach(t => {
    const deps = t.deps ? ` (deps: ${t.deps.join(', ')})` : '';
    console.log(`  - [${t.priority || 'normal'}] ${t.id}${deps}`);
  });
  console.log('');

  // Option 1: Parallel development (no dependencies)
  console.log('⚡ Option 1: Parallel Development (ignores dependencies)');
  const parallelResults = await AgentDev.parallelDev(tasks.slice(0, 2));
  console.log(`  Completed: ${parallelResults.length} tasks`);
  parallelResults.forEach(r => {
    console.log(`    ✓ ${r.taskId}: ${r.success ? 'success' : 'failed'}`);
  });
  console.log('');

  // Option 2: Development with dependencies
  console.log('🔗 Option 2: Development with Dependencies');
  const depResults = await AgentDev.dev(tasks);
  console.log(`  Completed: ${depResults.length} tasks`);
  depResults.forEach(r => {
    console.log(`    ✓ ${r.taskId}: ${r.success ? 'success' : 'failed'}`);
  });
  console.log('');

  // Option 3: Full cycle (dev -> review -> fix)
  console.log('🔄 Option 3: Full Cycle (dev -> review -> fix)');
  const { results, issues, fixes } = await AgentDev.fullCycle(tasks.slice(0, 2));
  console.log(`  Results: ${results.length}`);
  console.log(`  Issues: ${issues.length}`);
  console.log(`  Fixes: ${fixes.length}`);
  console.log('');

  console.log('✅ Demo complete!');
}

main().catch(console.error);
