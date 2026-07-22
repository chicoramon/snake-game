(function exposeSnakeCore(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SnakeCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSnakeCore() {
  'use strict';

  const RULESET_VERSION = 'snake-rules-v1';
  const UINT32_RANGE = 0x100000000;
  const DEFAULT_DIRECTION = Object.freeze({ x: 1, y: 0 });

  function normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) {
      return Math.trunc(seed) >>> 0;
    }

    const value = String(seed ?? '');
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function createSeededRandom(seed) {
    let state = normalizeSeed(seed);

    const random = function seededRandom() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
    };

    random.getState = () => state >>> 0;
    random.kind = 'seeded';
    random.seed = normalizeSeed(seed);
    return random;
  }

  function createNativeRandom(randomSource = Math.random) {
    if (typeof randomSource !== 'function') {
      throw new TypeError('A random source function is required.');
    }

    const random = () => randomSource();
    random.kind = 'native';
    random.seed = null;
    return random;
  }

  function assertBoard(cols, rows) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 3 || rows < 1) {
      throw new RangeError('The board must have at least 3 columns and 1 row.');
    }
  }

  function createInitialSnake(cols, rows) {
    assertBoard(cols, rows);
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);
    return [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY }
    ];
  }

  function positionKey(position) {
    return `${position.x},${position.y}`;
  }

  function placeFood({ cols, rows, snake, random }) {
    assertBoard(cols, rows);
    if (!Array.isArray(snake)) throw new TypeError('Snake segments are required.');
    if (typeof random !== 'function') throw new TypeError('A gameplay random function is required.');

    const occupied = new Set(snake.map(positionKey));
    const availableCells = (cols * rows) - occupied.size;
    if (availableCells <= 0) return null;

    // This intentionally matches the existing rejection-sampling behavior so
    // Classic and Sprint consume random values exactly as before.
    let position;
    do {
      position = {
        x: Math.floor(random() * cols),
        y: Math.floor(random() * rows)
      };
    } while (occupied.has(positionKey(position)));

    return position;
  }

  function placeFoodFromFreeCells({ cols, rows, snake, random }) {
    assertBoard(cols, rows);
    if (!Array.isArray(snake)) throw new TypeError('Snake segments are required.');
    if (typeof random !== 'function') throw new TypeError('A gameplay random function is required.');

    const occupied = new Set(snake.map(positionKey));
    const freeCells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
      }
    }
    if (!freeCells.length) return null;

    // Daily mode consumes exactly one seeded value per food. The ordered list
    // makes that value reproducible even when different routes occupy
    // different cells at spawn time.
    const index = Math.min(freeCells.length - 1, Math.floor(random() * freeCells.length));
    return freeCells[index];
  }

  function normalizeDirection(direction) {
    if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.y)) return null;
    const x = Math.sign(direction.x);
    const y = Math.sign(direction.y);
    if (Math.abs(x) + Math.abs(y) !== 1) return null;
    return { x, y };
  }

  function directionsEqual(left, right) {
    return Boolean(left && right && left.x === right.x && left.y === right.y);
  }

  function acceptDirection(currentDirection, requestedDirection) {
    const current = normalizeDirection(currentDirection) || DEFAULT_DIRECTION;
    const requested = normalizeDirection(requestedDirection);
    if (!requested) return { ...current };
    if (current.x === -requested.x && current.y === -requested.y) return { ...current };
    return requested;
  }

  function advanceState(state, requestedDirection, options, random) {
    const cols = options && options.cols;
    const rows = options && options.rows;
    assertBoard(cols, rows);
    if (!state || !Array.isArray(state.snake) || !state.snake.length) {
      throw new TypeError('A non-empty snake state is required.');
    }

    const direction = acceptDirection(state.direction, requestedDirection);
    const head = {
      x: state.snake[0].x + direction.x,
      y: state.snake[0].y + direction.y
    };
    const hitWall = head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
    const hitSelf = state.snake.some(segment => segment.x === head.x && segment.y === head.y);

    if (hitWall || hitSelf) {
      return {
        ...state,
        direction,
        alive: false,
        event: 'collision'
      };
    }

    const snake = [{ ...head }, ...state.snake.map(segment => ({ ...segment }))];
    const ate = Boolean(state.food && head.x === state.food.x && head.y === state.food.y);
    if (!ate) snake.pop();

    const score = Math.max(0, Math.trunc(state.score || 0)) + (ate ? 1 : 0);
    const baseInterval = Number.isFinite(options.baseInterval) ? options.baseInterval : 110;
    const minInterval = Number.isFinite(options.minInterval) ? options.minInterval : 55;
    const speed = ate
      ? Math.max(minInterval, baseInterval - score * 2)
      : state.speed;
    const foodPlacement = options.foodPlacement === 'free-cells'
      ? placeFoodFromFreeCells
      : placeFood;
    const food = ate ? foodPlacement({ cols, rows, snake, random }) : state.food;

    return {
      ...state,
      snake,
      direction,
      food,
      score,
      speed,
      alive: true,
      event: ate ? 'eat' : 'move'
    };
  }

  function createReplay(metadata = {}) {
    return {
      formatVersion: 1,
      rulesetVersion: metadata.rulesetVersion || RULESET_VERSION,
      seed: metadata.seed == null ? null : normalizeSeed(metadata.seed),
      mode: metadata.mode || 'classic',
      theme: metadata.theme || 'default',
      board: {
        cols: metadata.cols,
        rows: metadata.rows
      },
      inputs: [],
      finalTick: 0,
      finalScore: 0,
      finishReason: null
    };
  }

  function recordDirection(replay, tick, direction) {
    if (!replay || !Array.isArray(replay.inputs)) return false;
    if (!Number.isInteger(tick) || tick < 0) return false;
    const normalized = normalizeDirection(direction);
    if (!normalized) return false;

    const lastInput = replay.inputs[replay.inputs.length - 1];
    if (lastInput && lastInput.tick === tick && lastInput.type === 'direction') {
      lastInput.x = normalized.x;
      lastInput.y = normalized.y;
      return true;
    }
    if (lastInput && lastInput.x === normalized.x && lastInput.y === normalized.y) return false;

    replay.inputs.push({ tick, type: 'direction', x: normalized.x, y: normalized.y });
    return true;
  }

  function finalizeReplay(replay, result = {}) {
    if (!replay) return null;
    replay.finalTick = Math.max(0, Math.trunc(result.tick || 0));
    replay.finalScore = Math.max(0, Math.trunc(result.score || 0));
    replay.finishReason = result.reason || null;
    return replay;
  }

  function simulateReplay(replay, options = {}) {
    if (!replay || replay.seed == null) {
      throw new TypeError('A seeded replay is required.');
    }
    if (replay.rulesetVersion !== RULESET_VERSION) {
      throw new Error(`Unsupported ruleset: ${replay.rulesetVersion}`);
    }

    const cols = replay.board?.cols;
    const rows = replay.board?.rows;
    assertBoard(cols, rows);
    const random = createSeededRandom(replay.seed);
    const foodPlacement = replay.mode === 'daily' || options.foodPlacement === 'free-cells'
      ? placeFoodFromFreeCells
      : placeFood;
    let state = {
      snake: createInitialSnake(cols, rows),
      direction: { ...DEFAULT_DIRECTION },
      food: null,
      score: 0,
      speed: Number.isFinite(options.baseInterval) ? options.baseInterval : 110,
      alive: true,
      event: 'start'
    };
    state.food = foodPlacement({ cols, rows, snake: state.snake, random });

    const inputsByTick = new Map();
    for (const input of replay.inputs || []) {
      if (input?.type !== 'direction' || !Number.isInteger(input.tick) || input.tick < 0) continue;
      inputsByTick.set(input.tick, { x: input.x, y: input.y });
    }

    const finalTick = Math.max(0, Math.trunc(replay.finalTick || 0));
    let ticksSimulated = 0;
    for (let tick = 0; tick < finalTick && state.alive; tick++) {
      state = advanceState(state, inputsByTick.get(tick) || state.direction, {
        cols,
        rows,
        baseInterval: options.baseInterval,
        minInterval: options.minInterval,
        foodPlacement: replay.mode === 'daily' ? 'free-cells' : options.foodPlacement
      }, random);
      ticksSimulated++;
    }

    const expectedCollision = replay.finishReason === 'collision';
    const verified = ticksSimulated === finalTick
      && state.score === Math.max(0, Math.trunc(replay.finalScore || 0))
      && (expectedCollision ? state.alive === false : state.alive === true);

    return {
      verified,
      score: state.score,
      ticksSimulated,
      alive: state.alive,
      event: state.event,
      food: state.food,
      snake: state.snake,
      direction: state.direction
    };
  }

  return Object.freeze({
    RULESET_VERSION,
    normalizeSeed,
    createSeededRandom,
    createNativeRandom,
    createInitialSnake,
    placeFood,
    placeFoodFromFreeCells,
    normalizeDirection,
    directionsEqual,
    acceptDirection,
    advanceState,
    createReplay,
    recordDirection,
    finalizeReplay,
    simulateReplay
  });
});
