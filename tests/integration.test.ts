/**
 * Integration Test - Real OpenClaw Gateway
 */

import { AgentDev, checkGateway } from '../src/index.js';

async function main() {
  console.log('🧪 Integration Test\n');

  // 1. Check Gateway
  console.log('1️⃣  Checking OpenClaw Gateway...');
  const available = await checkGateway();
  console.log(`   Gateway: ${available ? '✅ Available' : '❌ Not available'}\n`);

  if (!available) {
    console.log('⚠️  Gateway not available. Skipping real tests.');
    console.log('   Run tests in offline mode instead.\n');
    return;
  }

  // 2. Simple parallel task
  console.log('2️⃣  Running parallel task...');
  const tasks = [
    {
      id: 'test-1',
      agent: 'claude',
      task: 'Create a simple hello.ts file that exports a hello function',
      files: ['test-output/hello.ts'],
    },
  ];

  const results = await AgentDev.parallelDev(tasks);
  
  console.log('   Results:');
  results.forEach(r => {
    console.log(`   - ${r.taskId}: ${r.success ? '✅' : '❌'}`);
    if (r.output) {
      console.log(`     Output: ${r.output.slice(0, 100)}...`);
    }
  });

  console.log('\n✅ Integration test complete!');
}

main().catch(console.error);
