import { GoogleGenAI } from '@google/genai';
import { buildGenerationPrompt, buildReviewPrompt, PROMPT_VERSION } from './prompt.mjs';
import { GENERATED_LINES_SCHEMA, REVIEW_SCHEMA, validateGeneratedLines } from './validator.mjs';

const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const project = required('GOOGLE_CLOUD_PROJECT');
const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const reviewModel = process.env.GEMINI_REVIEW_MODEL || model;
const supabaseUrl = required('SNAKE_SUPABASE_URL').replace(/\/$/, '');
const serviceRole = required('SNAKE_SUPABASE_SERVICE_ROLE_KEY');
const minimumPublishable = Math.max(20, Number(process.env.MIN_PUBLISHABLE_LINES) || 24);

const ai = new GoogleGenAI({ vertexai: true, project, location });
const headers = {
  apikey: serviceRole,
  authorization: `Bearer ${serviceRole}`,
  'content-type': 'application/json',
  prefer: 'return=representation'
};

async function rest(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function existingMessageKeys() {
  const rows = await rest('arcade_announcer_lines?select=message_key&order=created_at.desc&limit=1000');
  return rows.map(row => row.message_key);
}

async function generateJson({ selectedModel, prompt, schema, temperature }) {
  const response = await ai.models.generateContent({
    model: selectedModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      temperature,
      maxOutputTokens: 12000
    }
  });
  if (!response.text) throw new Error('Gemini returned no text');
  return JSON.parse(response.text);
}

async function main() {
  const existingKeys = await existingMessageKeys();
  const generated = await generateJson({
    selectedModel: model,
    prompt: buildGenerationPrompt({ existingKeys }),
    schema: GENERATED_LINES_SCHEMA,
    temperature: 1.1
  });
  const deterministic = validateGeneratedLines(generated, { existingKeys });
  const review = await generateJson({
    selectedModel: reviewModel,
    prompt: buildReviewPrompt(deterministic.accepted),
    schema: REVIEW_SCHEMA,
    temperature: 0.1
  });
  const acceptedKeys = new Set(review.acceptedKeys || []);
  const approved = deterministic.accepted.filter(line => acceptedKeys.has(line.messageKey));
  if (approved.length < minimumPublishable) {
    throw new Error(`Quality gate retained only ${approved.length} lines; ${minimumPublishable} required. Existing published content remains active.`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const [pack] = await rest('arcade_announcer_packs', {
    method: 'POST',
    body: JSON.stringify({
      slug: `gemini-${stamp}`,
      source: 'gemini-vertex-ai',
      model,
      prompt_version: PROMPT_VERSION,
      status: 'draft',
      quality_report: {
        generated: generated.lines?.length || 0,
        deterministicAccepted: deterministic.accepted.length,
        deterministicRejected: deterministic.errors,
        modelRejected: review.rejections || [],
        published: approved.length
      }
    })
  });
  await rest('arcade_announcer_lines', {
    method: 'POST',
    body: JSON.stringify(approved.map(line => ({
      pack_id: pack.id,
      message_key: line.messageKey,
      family_key: line.familyKey,
      category: line.category,
      template: line.template,
      conditions: line.conditions,
      weight: line.weight,
      cooldown_days: line.cooldownDays,
      max_impressions: line.maxImpressions
    })))
  });
  await rest('rpc/publish_arcade_announcer_pack', {
    method: 'POST',
    body: JSON.stringify({ p_pack_id: pack.id })
  });
  console.log(JSON.stringify({ packId: pack.id, published: approved.length, model, reviewModel }));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
