export const PROMPT_VERSION = 'arcade-announcer-v1';

export function buildGenerationPrompt({ existingKeys = [], targetCount = 40 } = {}) {
  return `Create ${targetCount} short Arcade Announcer lines for a family-friendly retro 8-bit Snake game.

Voice: clever, warm, playful, lightly dramatic, occasionally tongue-in-cheek. Celebrate persistence and funny gameplay behavior. Gentle teasing is allowed; cruelty, humiliation, profanity, identity-based jokes, politics, religion, sexual material, current events, and personal data are forbidden. Suitable for a four-year-old to read with a parent.

The lines appear on a player's private Arcade Career screen. Cover food eaten, active playtime, runs, wall collisions, self-collisions, distance, turns, Daily Run, Vs play, themes, and new-player encouragement. Avoid copyrighted quotations and named fictional characters. Do not state unverifiable real-world facts.

Templates may use only these placeholders: {total_food}, {active_ms}, {total_runs}, {total_deaths}, {wall_deaths}, {self_deaths}, {distance_cells}, {total_turns}, {longest_snake}, {daily_runs}, {daily_wins}, {vs_rounds}, {vs_wins}, {display_name}, {initials}, {favorite_theme}, {favorite_control}.

For every line, use a unique lowercase messageKey, a lowercase familyKey, and one category from: career, food, time, runs, deaths, distance, controls, daily, versus, theme. Conditions must contain one metric from: total_food, active_ms, total_runs, total_deaths, wall_deaths, self_deaths, distance_cells, total_turns, longest_snake, daily_runs, daily_wins, vs_rounds, vs_wins; one operator from: gte, lte, gt, lt, eq; and a non-negative numeric threshold. Weight must be 0.1 through 10, and cooldownDays must be an integer from 1 through 365.

Each joke family represents one underlying punchline. Create multiple categories and no more than five lines in any family. Keep each template between 20 and 180 characters. Existing message keys that must not be reused: ${existingKeys.slice(-500).join(', ') || '(none)'}.`;
}

export function buildReviewPrompt(lines) {
  return `Act as the final child-safety and game-writing gate for these Arcade Announcer lines.

Accept only lines that are grammatical, concise, playful rather than cruel, appropriate for all ages, free of politics/religion/sexual content/profanity/personal data, and understandable without external context. Reject factual claims that cannot be guaranteed from the supplied statistic. Reject near-duplicate punchlines even when wording differs. Return every safe messageKey in acceptedKeys and explain every rejection briefly.

LINES:\n${JSON.stringify(lines)}`;
}
