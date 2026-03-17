/**
 * Router - Multi-model routing
 */

import type { Task, AgentConfig } from './types.js';

/**
 * Model capability profile
 */
interface ModelProfile {
  id: string;
  provider: string;
  strengths: string[];
  maxTokens: number;
  costPerToken: number;
  latency: 'low' | 'medium' | 'high';
}

/**
 * Predefined model profiles
 */
const MODEL_PROFILES: Record<string, ModelProfile> = {
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    provider: 'anthropic',
    strengths: ['coding', 'analysis', 'reasoning', 'writing'],
    maxTokens: 200000,
    costPerToken: 0.003,
    latency: 'medium',
  },
  'claude-opus-4': {
    id: 'claude-opus-4',
    provider: 'anthropic',
    strengths: ['complex-reasoning', 'research', 'creative'],
    maxTokens: 200000,
    costPerToken: 0.015,
    latency: 'high',
  },
  'zai/glm-5': {
    id: 'zai/glm-5',
    provider: 'zhipu',
    strengths: ['coding', 'chinese', 'fast'],
    maxTokens: 128000,
    costPerToken: 0.0005,
    latency: 'low',
  },
  'deepseek-v3': {
    id: 'deepseek-v3',
    provider: 'deepseek',
    strengths: ['coding', 'math', 'fast'],
    maxTokens: 64000,
    costPerToken: 0.0003,
    latency: 'low',
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    strengths: ['coding', 'analysis', 'multimodal'],
    maxTokens: 128000,
    costPerToken: 0.005,
    latency: 'medium',
  },
};

/**
 * Task type classification
 */
type TaskType = 
  | 'coding'
  | 'analysis'
  | 'reasoning'
  | 'writing'
  | 'research'
  | 'chinese'
  | 'fast'
  | 'complex-reasoning'
  | 'creative'
  | 'math';

/**
 * Classify task type based on description
 */
function classifyTask(task: Task): TaskType[] {
  const desc = task.task.toLowerCase();
  const types: TaskType[] = [];

  // Coding keywords
  if (/\b(implement|code|function|class|method|api|service|module|refactor|bug|fix)\b/.test(desc)) {
    types.push('coding');
  }

  // Analysis keywords
  if (/\b(analyze|review|audit|check|examine|inspect)\b/.test(desc)) {
    types.push('analysis');
  }

  // Research keywords
  if (/\b(research|investigate|explore|find|search)\b/.test(desc)) {
    types.push('research');
  }

  // Chinese context
  if (/[\u4e00-\u9fff]/.test(desc)) {
    types.push('chinese');
  }

  // Fast/urgent
  if (task.priority === 'high' || /\b(quick|fast|urgent|asap)\b/.test(desc)) {
    types.push('fast');
  }

  // Default to coding
  if (types.length === 0) {
    types.push('coding');
  }

  return types;
}

/**
 * Router options
 */
interface RouterOptions {
  prioritizeCost?: boolean;
  prioritizeSpeed?: boolean;
  prioritizeQuality?: boolean;
  preferredModels?: string[];
  fallbackModel?: string;
}

/**
 * Model router
 */
export class ModelRouter {
  private profiles: Record<string, ModelProfile>;
  private options: RouterOptions;

  constructor(
    profiles: Record<string, ModelProfile> = MODEL_PROFILES,
    options: RouterOptions = {}
  ) {
    this.profiles = profiles;
    this.options = options;
  }

  /**
   * Select best model for task
   */
  selectModel(task: Task): string {
    const taskTypes = classifyTask(task);
    const candidates: { model: string; score: number }[] = [];

    // Check preferred models first
    if (this.options.preferredModels?.length) {
      for (const modelId of this.options.preferredModels) {
        if (this.profiles[modelId]) {
          const score = this.calculateScore(taskTypes, modelId);
          candidates.push({ model: modelId, score: score + 10 }); // Boost preferred
        }
      }
    }

    // Score all available models
    for (const [modelId] of Object.entries(this.profiles)) {
      if (!candidates.find(c => c.model === modelId)) {
        const score = this.calculateScore(taskTypes, modelId);
        candidates.push({ model: modelId, score });
      }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Return best match or fallback
    return candidates[0]?.model || this.options.fallbackModel || 'claude-sonnet-4';
  }

  /**
   * Calculate model score for task types
   */
  private calculateScore(taskTypes: TaskType[], modelId: string): number {
    const profile = this.profiles[modelId];
    if (!profile) return 0;

    let score = 0;

    // Match strengths
    for (const type of taskTypes) {
      if (profile.strengths.includes(type)) {
        score += 10;
      }
    }

    // Apply priority modifiers
    if (this.options.prioritizeCost) {
      score -= profile.costPerToken * 1000;
    }

    if (this.options.prioritizeSpeed) {
      if (profile.latency === 'low') score += 5;
      if (profile.latency === 'high') score -= 5;
    }

    if (this.options.prioritizeQuality) {
      if (profile.strengths.includes('complex-reasoning')) score += 5;
    }

    return score;
  }

  /**
   * Get model config
   */
  getModelConfig(modelId: string): AgentConfig | null {
    const profile = this.profiles[modelId];
    if (!profile) return null;

    return {
      runtime: 'acp',
      model: modelId,
      maxTokens: profile.maxTokens,
    };
  }

  /**
   * Route task to best agent config
   */
  route(task: Task): { model: string; config: AgentConfig } {
    const model = this.selectModel(task);
    const config = this.getModelConfig(model) || {
      runtime: 'acp' as const,
      model,
    };

    return { model, config };
  }

  /**
   * Route multiple tasks
   */
  routeMany(tasks: Task[]): Map<string, { model: string; config: AgentConfig }> {
    const routing = new Map<string, { model: string; config: AgentConfig }>();
    
    for (const task of tasks) {
      routing.set(task.id, this.route(task));
    }

    return routing;
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelProfile[] {
    return Object.values(this.profiles);
  }

  /**
   * Add custom model profile
   */
  addProfile(id: string, profile: ModelProfile): void {
    this.profiles[id] = profile;
  }
}

/**
 * Create default router
 */
export function createRouter(options?: RouterOptions): ModelRouter {
  return new ModelRouter(MODEL_PROFILES, options);
}
