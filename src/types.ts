/**
 * AgentDev Type Definitions
 */

/**
 * Task definition for parallel development
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Agent to use (e.g., 'claude', 'glm') */
  agent: string;
  /** Task description */
  task: string;
  /** Files to modify */
  files: string[];
  /** Optional: priority (high, normal, low) */
  priority?: 'high' | 'normal' | 'low';
  /** Optional: dependencies (task ids) */
  deps?: string[];
}

/**
 * Result from a completed task
 */
export interface Result {
  /** Task id */
  taskId: string;
  /** Success status */
  success: boolean;
  /** Output/error message */
  output?: string;
  /** Files modified */
  filesModified?: string[];
  /** Tokens used (if available) */
  tokensUsed?: number;
  /** Duration in ms */
  duration?: number;
  /** Raw response from agent */
  raw?: unknown;
}

/**
 * Issue found during code review
 */
export interface Issue {
  /** Issue id */
  id: string;
  /** Task id that produced the issue */
  taskId: string;
  /** Issue type */
  type: 'error' | 'warning' | 'suggestion';
  /** File path */
  file: string;
  /** Line number (if applicable) */
  line?: number;
  /** Issue description */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent runtime */
  runtime: 'acp' | 'subagent';
  /** Model to use */
  model: string;
  /** Optional: max tokens */
  maxTokens?: number;
  /** Optional: timeout in ms */
  timeout?: number;
}

/**
 * AgentDev configuration
 */
export interface AgentDevConfig {
  /** Agent configurations */
  agents: Record<string, AgentConfig>;
  /** Queue configuration */
  queue?: {
    maxConcurrent?: number;
    timeout?: number;
  };
  /** Review configuration */
  review?: {
    minCoverage?: number;
    rules?: string[];
  };
}

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Task with status
 */
export interface TaskWithStatus extends Task {
  status: TaskStatus;
  result?: Result;
}
