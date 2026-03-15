/**
 * Sessions
 * Wrapper for OpenClaw sessions_spawn
 */

import { sessions_spawn as ocSessionsSpawn } from '../../openclaw/src/index.js';

export interface SpawnOptions {
  runtime?: 'acp' | 'subagent';
  agentId?: string;
  cwd?: string;
  task: string;
  mode?: 'run' | 'session';
  label?: string;
}

export interface SpawnResult {
  sessionKey: string;
  runId?: string;
  status: 'accepted' | 'error';
  error?: string;
}

/**
 * Spawn a new agent session
 */
export async function sessions_spawn(options: SpawnOptions): Promise<SpawnResult> {
  try {
    const result = await ocSessionsSpawn({
      runtime: options.runtime || 'acp',
      agentId: options.agentId || 'claude',
      cwd: options.cwd,
      task: options.task,
      mode: options.mode || 'run',
      label: options.label,
    });
    
    return {
      sessionKey: result.childSessionKey || '',
      runId: result.runId,
      status: result.status === 'error' ? 'error' : 'accepted',
      error: result.error,
    };
  } catch (error: any) {
    return {
      sessionKey: '',
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * List active sessions
 */
export async function sessions_list(): Promise<any[]> {
  // Would call OpenClaw sessions_list
  return [];
}

/**
 * Send message to session
 */
export async function sessions_send(sessionKey: string, message: string): Promise<void> {
  // Would call OpenClaw sessions_send
}
