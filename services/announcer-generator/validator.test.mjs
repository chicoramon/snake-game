import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GENERATED_LINES_SCHEMA, validateGeneratedLines } from './validator.mjs';

const generatorSource = readFileSync(new URL('./index.mjs', import.meta.url), 'utf8');

const valid = (overrides = {}) => ({
  messageKey: 'food:buffet:001',
  familyKey: 'food-buffet',
  category: 'food',
  template: 'You ate {total_food} snacks. The buffet has requested a transfer.',
  conditions: { metric: 'total_food', operator: 'gte', threshold: 100 },
  weight: 1,
  cooldownDays: 30,
  maxImpressions: 4,
  ...overrides
});

test('deterministic gate accepts valid structured copy', () => {
  const result = validateGeneratedLines({ lines: [valid()] });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.errors.length, 0);
});

test('deterministic gate rejects unsafe, duplicate, and unsupported copy', () => {
  const result = validateGeneratedLines({ lines: [
    valid({ messageKey: 'used:key' }),
    valid({ messageKey: 'unsafe:key', template: 'Visit https://bad.example now.' }),
    valid({ messageKey: 'placeholder:key', template: 'Unknown {private_email} value.' })
  ] }, { existingKeys: ['used:key'] });
  assert.equal(result.accepted.length, 0);
  assert.equal(result.errors.length, 3);
});

test('deterministic gate caps a joke family so one motif cannot dominate a pack', () => {
  const lines = Array.from({ length: 7 }, (_, index) => ({
    ...valid({
      messageKey: `food:family:${index}`,
      template: `You ate {total_food} snacks. Cabinet ${index} is empty.`
    })
  }));
  const result = validateGeneratedLines({ lines });
  assert.equal(result.accepted.length, 5);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].reasons.join(' '), /too many lines/i);
});

test('Gemini serving schema stays structural while deterministic code owns complex constraints', () => {
  const schema = JSON.stringify(GENERATED_LINES_SCHEMA);
  assert.doesNotMatch(schema, /"(?:enum|minItems|maxItems|minimum|maximum|anyOf)"/);
});

test('generator prevents thinking truncation, reports usage, and retries a smaller batch', () => {
  assert.match(generatorSource, /thinkingConfig:\s*\{\s*thinkingBudget:\s*0\s*\}/);
  assert.match(generatorSource, /finishReason[\s\S]*?finishReason !== 'STOP'/);
  assert.match(generatorSource, /event:\s*'gemini-usage'/);
  assert.match(generatorSource, /for \(const targetCount of \[40, 32\]\)/);
});
