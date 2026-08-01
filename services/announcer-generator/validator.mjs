const KEY_PATTERN = /^[a-z0-9:_-]{3,120}$/;
const FAMILY_PATTERN = /^[a-z0-9:_-]{2,80}$/;
const CATEGORIES = new Set(['career', 'food', 'time', 'runs', 'deaths', 'distance', 'controls', 'daily', 'versus', 'theme']);
const METRICS = new Set([
  'total_food', 'active_ms', 'total_runs', 'total_deaths', 'wall_deaths',
  'self_deaths', 'distance_cells', 'total_turns', 'longest_snake',
  'daily_runs', 'daily_wins', 'vs_rounds', 'vs_wins'
]);
const OPERATORS = new Set(['gte', 'lte', 'gt', 'lt', 'eq']);
const PLACEHOLDERS = new Set([...METRICS, 'display_name', 'initials', 'favorite_theme', 'favorite_control']);
const FORBIDDEN = [
  /https?:\/\//i,
  /\b(?:suicide|self[- ]harm|sexual|porn|racist|religion|politic|election|president)\b/i,
  /\b(?:idiot|stupid|loser|fat|ugly|hate)\b/i
];

export const GENERATED_LINES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lines'],
  properties: {
    lines: {
      type: 'array',
      minItems: 30,
      maxItems: 60,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['messageKey', 'familyKey', 'category', 'template', 'conditions', 'weight', 'cooldownDays'],
        properties: {
          messageKey: { type: 'string' },
          familyKey: { type: 'string' },
          category: { type: 'string', enum: [...CATEGORIES] },
          template: { type: 'string' },
          conditions: {
            type: 'object',
            additionalProperties: false,
            required: ['metric', 'operator', 'threshold'],
            properties: {
              metric: { type: 'string', enum: [...METRICS] },
              operator: { type: 'string', enum: [...OPERATORS] },
              threshold: { type: 'number', minimum: 0 }
            }
          },
          weight: { type: 'number', minimum: 0.1, maximum: 10 },
          cooldownDays: { type: 'integer', minimum: 1, maximum: 365 },
          maxImpressions: { anyOf: [{ type: 'integer', minimum: 1, maximum: 20 }, { type: 'null' }] }
        }
      }
    }
  }
};

export const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['acceptedKeys', 'rejections'],
  properties: {
    acceptedKeys: { type: 'array', items: { type: 'string' } },
    rejections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['messageKey', 'reason'],
        properties: { messageKey: { type: 'string' }, reason: { type: 'string' } }
      }
    }
  }
};

function placeholders(template) {
  return [...String(template).matchAll(/\{([a-z0-9_]+)\}/gi)].map(match => match[1].toLowerCase());
}

export function validateGeneratedLines(input, { existingKeys = [] } = {}) {
  const errors = [];
  const accepted = [];
  const seen = new Set(existingKeys);
  const families = new Map();
  for (const [index, raw] of (Array.isArray(input?.lines) ? input.lines : []).entries()) {
    const line = {
      messageKey: String(raw?.messageKey || '').toLowerCase(),
      familyKey: String(raw?.familyKey || '').toLowerCase(),
      category: String(raw?.category || '').toLowerCase(),
      template: String(raw?.template || '').trim(),
      conditions: raw?.conditions,
      weight: Number(raw?.weight),
      cooldownDays: Number(raw?.cooldownDays),
      maxImpressions: raw?.maxImpressions == null ? null : Number(raw.maxImpressions)
    };
    const lineErrors = [];
    if (!KEY_PATTERN.test(line.messageKey) || seen.has(line.messageKey)) lineErrors.push('invalid or duplicate message key');
    if (!FAMILY_PATTERN.test(line.familyKey)) lineErrors.push('invalid family key');
    if (!CATEGORIES.has(line.category)) lineErrors.push('invalid category');
    if (line.template.length < 8 || line.template.length > 240) lineErrors.push('invalid template length');
    if (FORBIDDEN.some(pattern => pattern.test(line.template))) lineErrors.push('blocked vocabulary');
    if (placeholders(line.template).some(name => !PLACEHOLDERS.has(name))) lineErrors.push('unsupported placeholder');
    if (!METRICS.has(line.conditions?.metric) || !OPERATORS.has(line.conditions?.operator) || !Number.isFinite(Number(line.conditions?.threshold)) || Number(line.conditions.threshold) < 0) lineErrors.push('invalid conditions');
    if (!Number.isFinite(line.weight) || line.weight < 0.1 || line.weight > 10) lineErrors.push('invalid weight');
    if (!Number.isInteger(line.cooldownDays) || line.cooldownDays < 1 || line.cooldownDays > 365) lineErrors.push('invalid cooldown');
    if (line.maxImpressions !== null && (!Number.isInteger(line.maxImpressions) || line.maxImpressions < 1 || line.maxImpressions > 20)) lineErrors.push('invalid max impressions');
    if (lineErrors.length) {
      errors.push({ index, messageKey: line.messageKey, reasons: lineErrors });
      continue;
    }
    const familyCount = families.get(line.familyKey) || 0;
    if (familyCount >= 5) {
      errors.push({ index, messageKey: line.messageKey, reasons: ['too many lines in one joke family'] });
      continue;
    }
    seen.add(line.messageKey);
    families.set(line.familyKey, familyCount + 1);
    accepted.push(line);
  }
  return { accepted, errors };
}
