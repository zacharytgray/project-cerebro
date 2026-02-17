export interface BrainConfigValidationResult {
  valid: boolean;
  errors: string[];
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateBrainConfig(config: unknown): BrainConfigValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(config)) {
    return { valid: false, errors: ['Config must be a JSON object'] };
  }

  const c = config as Record<string, any>;

  if (c.systemPrompt !== undefined && typeof c.systemPrompt !== 'string') {
    errors.push('systemPrompt must be a string');
  }

  if (c.defaultModel !== undefined && typeof c.defaultModel !== 'string') {
    errors.push('defaultModel must be a string');
  }

  if (c.tools !== undefined) {
    if (!isPlainObject(c.tools)) {
      errors.push('tools must be an object');
    } else {
      if (c.tools.enabled !== undefined && !isPlainObject(c.tools.enabled)) {
        errors.push('tools.enabled must be an object');
      }
      if (c.tools.config !== undefined && !isPlainObject(c.tools.config)) {
        errors.push('tools.config must be an object');
      }
    }
  }

  if (c.skills !== undefined) {
    if (!Array.isArray(c.skills) || !c.skills.every((s: unknown) => typeof s === 'string')) {
      errors.push('skills must be an array of strings');
    }
  }

  if (c.reportTemplate !== undefined && typeof c.reportTemplate !== 'string') {
    errors.push('reportTemplate must be a string');
  }

  if (c.reportFormat !== undefined && c.reportFormat !== 'markdown' && c.reportFormat !== 'json') {
    errors.push('reportFormat must be "markdown" or "json"');
  }

  return { valid: errors.length === 0, errors };
}
