const DEFAULT_SNAKE_LENGTH = 3;

function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function classifyCollision({ snake, direction, cols, rows, wrapWalls = false } = {}) {
  if (!Array.isArray(snake) || !snake.length || !direction) return 'unknown';
  const next = {
    x: snake[0].x + Number(direction.x || 0),
    y: snake[0].y + Number(direction.y || 0)
  };
  if (!wrapWalls && (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows)) return 'wall';
  const target = wrapWalls
    ? { x: (next.x + cols) % cols, y: (next.y + rows) % rows }
    : next;
  return snake.some(segment => segment.x === target.x && segment.y === target.y)
    ? 'self'
    : 'unknown';
}

export function createCareerRunTracker({ initialSnakeLength = DEFAULT_SNAKE_LENGTH } = {}) {
  let active = null;

  function begin({ runId, mode, theme, controlMethod } = {}) {
    active = {
      runId: String(runId || ''),
      mode: String(mode || 'classic'),
      theme: String(theme || 'default'),
      controlMethod: String(controlMethod || 'unknown'),
      mixedControls: false,
      activeMs: 0,
      distanceCells: 0,
      turns: 0,
      longestSnake: Math.max(1, Math.trunc(nonNegativeNumber(initialSnakeLength)) || DEFAULT_SNAKE_LENGTH),
      collisionCause: null,
      finished: false
    };
    return active;
  }

  function addActiveTime(ms) {
    if (!active || active.finished) return;
    active.activeMs += Math.min(nonNegativeNumber(ms), 1000);
  }

  function recordTurn() {
    if (!active || active.finished) return;
    active.turns++;
  }

  function recordMove({ snakeLength } = {}) {
    if (!active || active.finished) return;
    active.distanceCells++;
    active.longestSnake = Math.max(active.longestSnake, Math.trunc(nonNegativeNumber(snakeLength)) || 0);
  }

  function recordControlMethod(method, { mixed = false } = {}) {
    if (!active || active.finished) return;
    if (method) active.controlMethod = String(method);
    active.mixedControls ||= mixed;
  }

  function recordCollision(cause) {
    if (!active || active.finished) return;
    active.collisionCause = ['wall', 'self'].includes(cause) ? cause : 'unknown';
  }

  function finish({ score = 0, reason = 'unknown', snakeLength, controlMethod, mixedControls = false } = {}) {
    if (!active || active.finished) return null;
    active.finished = true;
    const finalLength = Math.max(
      active.longestSnake,
      Math.trunc(nonNegativeNumber(snakeLength)) || 0,
      DEFAULT_SNAKE_LENGTH + Math.trunc(nonNegativeNumber(score))
    );
    const snapshot = {
      version: 1,
      runId: active.runId,
      mode: active.mode,
      theme: active.theme,
      controlMethod: mixedControls ? 'mixed' : String(controlMethod || active.controlMethod || 'unknown'),
      mixedControls: mixedControls || active.mixedControls,
      score: Math.trunc(nonNegativeNumber(score)),
      activeMs: Math.round(active.activeMs),
      distanceCells: active.distanceCells,
      turns: active.turns,
      longestSnake: finalLength,
      finishReason: String(reason || 'unknown'),
      collisionCause: reason === 'collision' ? (active.collisionCause || 'unknown') : null
    };
    return Object.freeze(snapshot);
  }

  return {
    begin,
    addActiveTime,
    recordTurn,
    recordMove,
    recordControlMethod,
    recordCollision,
    finish,
    get active() { return !!active && !active.finished; }
  };
}
