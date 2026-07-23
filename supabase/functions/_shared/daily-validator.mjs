export const DAILY_RULESET_VERSION = 'snake-rules-v1';
const UINT32_RANGE = 0x100000000;

function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function initialSnake(cols, rows) {
  const x = Math.floor(cols / 2);
  const y = Math.floor(rows / 2);
  return [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
}

function placeFood(cols, rows, snake, random) {
  const occupied = new Set(snake.map(segment => `${segment.x},${segment.y}`));
  const free = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  return free[Math.min(free.length - 1, Math.floor(random() * free.length))];
}

function normalizeDirection(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  const x = Math.sign(value.x);
  const y = Math.sign(value.y);
  return Math.abs(x) + Math.abs(y) === 1 ? { x, y } : null;
}

function acceptDirection(current, requested) {
  const next = normalizeDirection(requested);
  if (!next || (current.x === -next.x && current.y === -next.y)) return { ...current };
  return next;
}

export function validateDailyReplay(replay, challenge, submitted = {}) {
  const fail = reason => ({ verified: false, reason });
  if (!replay || typeof replay !== 'object') return fail('Replay is missing');
  if (replay.formatVersion !== 1) return fail('Unsupported replay format');
  if (replay.rulesetVersion !== challenge.rulesetVersion || replay.rulesetVersion !== DAILY_RULESET_VERSION) {
    return fail('Ruleset mismatch');
  }
  if (replay.mode !== 'daily') return fail('Mode mismatch');
  if ((Number(replay.seed) >>> 0) !== (Number(challenge.seed) >>> 0)) return fail('Seed mismatch');
  if (replay.theme !== challenge.theme) return fail('Theme mismatch');
  if (replay.board?.cols !== challenge.boardCols || replay.board?.rows !== challenge.boardRows) {
    return fail('Board mismatch');
  }
  if (!['time', 'collision'].includes(replay.finishReason)) return fail('Invalid finish reason');
  if (!Number.isInteger(replay.finalTick) || replay.finalTick < 1 || replay.finalTick > 1200) {
    return fail('Invalid replay length');
  }
  if (!Array.isArray(replay.inputs) || replay.inputs.length > 1200) return fail('Invalid inputs');

  const inputs = new Map();
  let previousTick = -1;
  for (const input of replay.inputs) {
    const direction = normalizeDirection(input);
    if (input?.type !== 'direction' || !Number.isInteger(input.tick) || input.tick < 0 || input.tick >= replay.finalTick || !direction) {
      return fail('Invalid direction input');
    }
    if (input.tick < previousTick) return fail('Inputs are out of order');
    previousTick = input.tick;
    inputs.set(input.tick, direction);
  }

  const random = seededRandom(challenge.seed);
  let snake = initialSnake(challenge.boardCols, challenge.boardRows);
  let direction = { x: 1, y: 0 };
  let food = placeFood(challenge.boardCols, challenge.boardRows, snake, random);
  let score = 0;
  let speed = 110;
  let elapsedMs = 0;
  let finalFoodMs = null;
  let alive = true;

  for (let tick = 0; tick < replay.finalTick; tick++) {
    if (!alive) return fail('Replay continues after collision');
    direction = acceptDirection(direction, inputs.get(tick));
    const stepMs = speed;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    elapsedMs += stepMs;
    const hitWall = head.x < 0 || head.x >= challenge.boardCols || head.y < 0 || head.y >= challenge.boardRows;
    const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
    if (hitWall || hitSelf) {
      alive = false;
      continue;
    }

    snake = [{ ...head }, ...snake];
    const ate = Boolean(food && head.x === food.x && head.y === food.y);
    if (ate) {
      score++;
      finalFoodMs = elapsedMs;
      speed = Math.max(55, 110 - score * 2);
      food = placeFood(challenge.boardCols, challenge.boardRows, snake, random);
    } else {
      snake.pop();
    }
  }

  if (replay.finishReason === 'collision' && alive) return fail('Expected collision did not occur');
  if (replay.finishReason === 'time' && !alive) return fail('Unexpected collision');
  if (replay.finishReason === 'time' && (elapsedMs > challenge.durationMs || challenge.durationMs - elapsedMs >= speed)) {
    return fail('Run did not end at the daily time limit');
  }
  if (elapsedMs > challenge.durationMs + 110) return fail('Run exceeds the daily time limit');
  if (score !== replay.finalScore || score !== submitted.score) return fail('Score mismatch');
  if ((submitted.finalFoodMs ?? null) !== finalFoodMs) return fail('Final-food time mismatch');

  return {
    verified: true,
    reason: null,
    score,
    finalFoodMs,
    elapsedMs,
    finishReason: replay.finishReason
  };
}
