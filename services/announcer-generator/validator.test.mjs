import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GENERATED_LINES_SCHEMA, validateGeneratedLines } from './validator.mjs';
import { buildGenerationPrompt, buildReviewPrompt, PROMPT_VERSION } from './prompt.mjs';

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

test('deterministic gate rejects bland achievement copy and off-brief categories', () => {
  const result = validateGeneratedLines({ lines: [
    valid({ messageKey: 'food:generic:001', template: 'Great job eating {total_food} food!' }),
    valid({ messageKey: 'runs:wrong-batch:001', category: 'runs', template: 'Run {total_runs} entered the archives. The paperwork has already escaped.' })
  ] }, { allowedCategories: ['food'] });
  assert.equal(result.accepted.length, 0);
  assert.match(result.errors[0].reasons.join(' '), /generic achievement copy/i);
  assert.match(result.errors[1].reasons.join(' '), /outside requested batch/i);
});

test('ungrounded copy is rejected except for an explicit new-player state', () => {
  const result = validateGeneratedLines({ lines: [
    valid({ messageKey: 'food:ungrounded:001', template: 'The buffet has entered protective custody.' }),
    valid({
      messageKey: 'career:new:001', familyKey: 'new-player', category: 'career',
      template: 'The ledger is empty. Management has described this as suspiciously peaceful.',
      conditions: { metric: 'total_runs', operator: 'eq', threshold: 0 }
    })
  ] });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].messageKey, 'career:new:001');
  assert.match(result.errors[0].reasons.join(' '), /not visibly grounded/i);
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

test('v2 prompt establishes the sharper Neon Fang comedy contract', () => {
  const generation = buildGenerationPrompt({ categories: ['deaths', 'controls'], targetCount: 12 });
  const review = buildReviewPrompt([valid()]);
  assert.equal(PROMPT_VERSION, 'arcade-announcer-v2-neon-fang');
  assert.match(generation, /deadpan arcade sports commentator/i);
  assert.match(generation, /north wall sends its regards/i);
  assert.match(generation, /safe-but-boring|generic mobile game's/i);
  assert.match(generation, /only these categories.*deaths, controls/i);
  assert.doesNotMatch(generation, /four[- ]year[- ]old/i);
  assert.match(review, /comedic craft >= 4\/5/i);
  assert.match(review, /Reject safe-but-boring lines/i);
  assert.match(review, /Do not lower the bar/i);
});

test('generator prevents thinking truncation, reports usage, and uses focused comedy batches', () => {
  assert.match(generatorSource, /thinkingConfig:\s*\{\s*thinkingBudget:\s*0\s*\}/);
  assert.match(generatorSource, /finishReason[\s\S]*?finishReason !== 'STOP'/);
  assert.match(generatorSource, /event:\s*'gemini-usage'/);
  assert.match(generatorSource, /GENERATION_BATCHES/);
  assert.match(generatorSource, /for \(const targetCount of \[12, 10\]\)/);
  assert.match(generatorSource, /allowedCategories:\s*categories/);
});
