import { describe, it, expect, vi } from 'vitest';

// Mock the OpenClaw import
vi.mock('../../openclaw/src/index.js', () => ({
  sessions_spawn: vi.fn(),
}));

describe('sessions', () => {
  it('should be defined', async () => {
    const { sessions_spawn } = await import('../src/sessions.js');
    expect(sessions_spawn).toBeDefined();
  });

  // Note: Full testing requires mocking the OpenClaw dependency
  // which is complex due to module resolution
});
