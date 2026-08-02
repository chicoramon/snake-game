export const PROMPT_VERSION = 'arcade-announcer-v3-neon-fang';

const GOLD_STANDARD = `
GOLD-STANDARD VOICE EXAMPLES — study the comic mechanism, never copy the wording:
- "The walls lead your head-to-head series {wall_deaths}–0. Brick remains undefeated."
- "You have personally met a wall {wall_deaths} times. The north wall sends its regards."
- "{total_food} food items have vanished on your watch. The buffet has requested a transfer."
- "You have changed direction {total_turns} times. The compass has filed for early retirement."
- "{self_deaths} investigations have pointed back at the snake. The suspect was last seen in the mirror."
- "You have clocked {active_ms} of active snake duty. Benefits remain under negotiation."
- "You have travelled {distance_cells} grid cells. Still no legs."
- "Career run {total_runs} is now in the archive. 'One more game' remains technically accurate."

These work because a factual setup earns a surprising second beat. They sound like a sports desk,
royal chronicler, detective, or bored government office treating ordinary Snake statistics as matters
of historic importance.`;

const REJECT_STANDARD = `
AUTOMATIC STYLE FAILURES — do not write anything resembling these:
- "Great job eating {total_food} food!"
- "Wow, {total_runs} runs! Keep it up!"
- "You are a true Snake legend."
- "That is an impressive score!"
- "The snake is hungry and ready for more."

These are pleasant but generic. They contain no comic turn, no distinctive narrator, and no reason to
show them twice.`;

export function buildGenerationPrompt({ existingKeys = [], targetCount = 12, categories = [] } = {}) {
  const requested = categories.length ? categories.join(', ') : 'career, food, time, runs, deaths, distance, controls, daily, versus, theme';
  return `Create ${targetCount} exceptional Arcade Announcer templates for Project Neon Fang, a premium retro 8-bit Snake game.

VOICE CONTRACT
The announcer is a deadpan arcade sports commentator with the confidence of a royal historian and the
paperwork obsession of an exhausted civil servant. The voice is witty, dry, theatrical, specific, and
affectionately ridiculous. It celebrates persistence while gently roasting gameplay behavior. It is
never a motivational coach, a children's presenter, a generic achievement system, or an internet meme
account. Write for a broad arcade-gaming audience. Keep it all-ages, but never use baby talk or dilute
the joke merely to sound safe.

Every template must contain:
1. A statistic-driven observation grounded in an allowed placeholder or an explicit new-player state.
2. A genuine comedic turn: an unexpected consequence, personified object, mock rivalry, investigation,
   bureaucratic ruling, dramatic understatement, or wildly disproportionate historical importance.
3. A recognizable narrator attitude. If the wording could appear in any generic mobile game's
   achievement popup, discard it and write something sharper.

${GOLD_STANDARD}

${REJECT_STANDARD}

Generate only these categories in this batch: ${requested}.
Distribute the batch across the requested categories and across distinct comic mechanisms. Do not merely
paraphrase one joke. Do not reuse the examples' wording, their exact punchlines, copyrighted quotations,
named fictional characters, current events, or unverifiable real-world facts.

Templates may use only these placeholders: {total_food}, {active_ms}, {total_runs}, {total_deaths},
{wall_deaths}, {self_deaths}, {distance_cells}, {total_turns}, {longest_snake}, {daily_runs},
{daily_wins}, {vs_rounds}, {vs_wins}, {display_name}, {initials}, {favorite_theme}, {favorite_control}.

PLACEHOLDER FORMAT CONTRACT
{active_ms} is rendered by the game as a complete human-readable phrase such as "5 minutes" or
"1.5 hours". Never add ms, milliseconds, seconds, minutes, hours, or another time unit after it.

For every line, use a unique lowercase messageKey, a lowercase familyKey, and one requested category.
Conditions must contain one metric from: total_food, active_ms, total_runs, total_deaths, wall_deaths,
self_deaths, distance_cells, total_turns, longest_snake, daily_runs, daily_wins, vs_rounds, vs_wins;
one operator from: gte, lte, gt, lt, eq; and a non-negative numeric threshold. Weight must be 0.1 through
10, and cooldownDays must be an integer from 1 through 365.

Each familyKey represents one underlying punchline or comic mechanism. Use no more than five lines in
one family. Keep each template between 30 and 180 characters. Existing message keys that must not be
reused: ${existingKeys.slice(-500).join(', ') || '(none)'}.`;
}

export function buildReviewPrompt(lines) {
  return `You are Project Neon Fang's ruthless head comedy editor and final safety gate.

Judge each Arcade Announcer template independently. A line is accepted only if every requirement passes:
- DATA FIDELITY: its claims are guaranteed by its condition and placeholders.
- COMEDIC CRAFT >= 4/5: it has a real setup-and-turn, not merely cheerful wording.
- NEON FANG VOICE >= 4/5: deadpan sports desk, mock history, investigation, object personification,
  bureaucratic absurdity, dramatic understatement, or similarly distinctive arcade commentary.
- ORIGINALITY >= 4/5: it is not a near-duplicate, cliché, generic achievement copy, or a paraphrase of
  another candidate.
- CLARITY >= 4/5: concise, grammatical, and understandable without external context.
- PLACEHOLDER FORMAT: {active_ms} already includes its human-readable time unit; reject any template
  that adds ms, milliseconds, seconds, minutes, hours, or another unit after it.
- SAFETY: all-ages, playful rather than cruel, and free of profanity, identity attacks, politics,
  religion, sexual material, personal data, and instructions to visit external sources.

Reject safe-but-boring lines. "Great job", "keep it up", "impressive", "legend", empty celebration,
and merely restating a statistic are failures. A high rejection rate is acceptable: the currently
published pack remains active unless enough excellent replacements survive. Do not lower the bar to
meet a quota.

Return only truly publishable messageKeys in acceptedKeys. For every rejection, give a compact reason
that names the failed dimension and its score when relevant, for example "comedic craft 2/5: generic
encouragement with no turn".

LINES:\n${JSON.stringify(lines)}`;
}
