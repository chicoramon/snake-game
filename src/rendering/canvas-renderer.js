import { drawFoodSprite as drawFoodSpriteAsset } from './food-sprite.js';

// Canvas rendering and visual effects are intentionally isolated from the
// game rules. The module receives a read-only game-state snapshot and exposes
// event methods for gameplay to trigger without knowing how anything is drawn.
export function createCanvasRenderer({
  ctx,
  cellSize,
  cols,
  rows,
  canvasWidth,
  canvasHeight,
  foodSprites,
  getGameState
}) {
  let prevSnake = null;
  let foodPulse = 0;
  let deathFlash = 0;
  let foodScale = 1;
  let foodScaleTarget = 1;
  let dragonFireBurst = 0;
  let fighterImpactBurst = 0;
  let screenShake = 0;
  let shakeX = 0;
  let shakeY = 0;
  let deathSegments = [];
  let trailPoints = [];
  let fpsFrames = 0;
  let fpsLast = performance.now();
  const particles = [];
  const maxParticles = 200;
  const maxTrail = 12;

  const lerp = (a, b, t) => a + (b - a) * t;

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();
  }

  function spawnParticles(x, y, count, color, speedMultiplier, lifeMultiplier) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= maxParticles) {
        const dead = particles.findIndex(particle => particle.life <= 0);
        if (dead === -1) break;
        particles.splice(dead, 1);
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = (1 + Math.random() * 3) * speedMultiplier;
      const life = (0.3 + Math.random() * 0.5) * lifeMultiplier;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= dt / 1000;
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateDeathSegments(dt) {
    for (let i = deathSegments.length - 1; i >= 0; i--) {
      const segment = deathSegments[i];
      segment.x += segment.vx;
      segment.y += segment.vy;
      segment.vx *= 0.95;
      segment.vy *= 0.95;
      segment.rotation += segment.rotSpeed;
      segment.life -= dt / 1000;
      if (segment.life <= 0) deathSegments.splice(i, 1);
    }
  }

  function drawDeathSegments() {
    for (const segment of deathSegments) {
      ctx.save();
      ctx.translate(segment.x, segment.y);
      ctx.rotate(segment.rotation);
      ctx.globalAlpha = Math.max(0, segment.life);
      ctx.fillStyle = segment.color;
      ctx.fillRect(-segment.size / 2, -segment.size / 2, segment.size, segment.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawFoodSprite(cx, cy, scale, themeId) {
    drawFoodSpriteAsset(ctx, cx, cy, cellSize, foodSprites, scale, themeId);
  }

  function drawBoardPattern(theme) {
    if (theme.boardPattern === 'studs') {
      ctx.fillStyle = theme.studColor || theme.accent;
      ctx.globalAlpha = 0.18;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        ctx.beginPath();
        ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (theme.boardPattern === 'springfield') {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#FFFFFF';
      for (const cloud of [[55, 55, 44], [250, 105, 54], [330, 38, 34]]) {
        ctx.beginPath();
        ctx.arc(cloud[0], cloud[1], cloud[2] * 0.28, 0, Math.PI * 2);
        ctx.arc(cloud[0] + cloud[2] * 0.3, cloud[1] - 5, cloud[2] * 0.36, 0, Math.PI * 2);
        ctx.arc(cloud[0] + cloud[2] * 0.65, cloud[1], cloud[2] * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F14E28'; ctx.fillRect(0, canvasHeight - 92, canvasWidth, 92);
      ctx.fillStyle = '#FFD90F';
      ctx.beginPath();
      ctx.moveTo(35, canvasHeight - 92); ctx.lineTo(105, canvasHeight - 148); ctx.lineTo(175, canvasHeight - 92);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(52, canvasHeight - 92, 108, 66);
      ctx.fillStyle = '#70D1FE';
      ctx.fillRect(72, canvasHeight - 76, 25, 24); ctx.fillRect(116, canvasHeight - 76, 25, 24);
      ctx.fillStyle = '#94C11F'; ctx.fillRect(0, canvasHeight - 28, canvasWidth, 28);
      ctx.restore();
      return;
    }
    if (theme.boardPattern === 'winterfell') {
      ctx.save();
      ctx.globalAlpha = 0.16;
      for (let y = 0; y < canvasHeight; y += 30) {
        const offset = (Math.floor(y / 30) % 2) * 22;
        for (let x = -offset; x < canvasWidth; x += 44) {
          ctx.strokeStyle = '#7f8c99'; ctx.strokeRect(x, y, 42, 28);
        }
      }
      const horizon = canvasHeight - 74;
      ctx.fillStyle = '#171c24'; ctx.fillRect(0, horizon, canvasWidth, 74);
      for (let x = 0; x < canvasWidth; x += 52) {
        ctx.fillRect(x, horizon - 20, 34, 20); ctx.fillRect(x, horizon - 30, 9, 10); ctx.fillRect(x + 25, horizon - 30, 9, 10);
      }
      ctx.fillStyle = '#dce8f2';
      for (let i = 0; i < 24; i++) {
        const x = (i * 83 + 19) % canvasWidth; const y = (i * 137 + 31) % canvasHeight;
        ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }
      ctx.restore();
      return;
    }
    if (theme.boardPattern === 'kenstage') {
      ctx.save();
      ctx.globalAlpha = 0.18;
      const horizon = canvasHeight - 116;
      ctx.fillStyle = '#183650'; ctx.fillRect(0, horizon, canvasWidth, 116);
      ctx.fillStyle = '#3d81a5';
      for (let y = horizon + 10; y < canvasHeight - 38; y += 13) {
        const offset = ((y - horizon) / 13) % 2 ? 16 : 0;
        for (let x = -offset; x < canvasWidth; x += 38) ctx.fillRect(x, y, 23, 2);
      }
      ctx.fillStyle = '#ffd666';
      for (let x = 14; x < canvasWidth; x += 47) ctx.fillRect(x, horizon - 16 - (x % 3) * 4, 3, 3);
      ctx.fillStyle = '#c9d9e6';
      ctx.beginPath(); ctx.moveTo(66, horizon + 20); ctx.lineTo(248, horizon + 20); ctx.lineTo(218, horizon + 45); ctx.lineTo(92, horizon + 45); ctx.closePath(); ctx.fill();
      ctx.fillRect(124, horizon - 9, 72, 31);
      ctx.fillStyle = '#10253a'; ctx.fillRect(136, horizon - 2, 18, 12); ctx.fillRect(162, horizon - 2, 20, 12);
      ctx.fillStyle = '#8d1d27'; ctx.fillRect(0, canvasHeight - 43, canvasWidth, 5);
      for (let x = 10; x < canvasWidth; x += 62) ctx.fillRect(x, canvasHeight - 73, 6, 35);
      ctx.strokeStyle = '#9c5a31'; ctx.lineWidth = 2;
      for (let x = -canvasHeight; x < canvasWidth; x += 34) { ctx.beginPath(); ctx.moveTo(x, canvasHeight); ctx.lineTo(x + 48, canvasHeight - 38); ctx.stroke(); }
      ctx.restore();
    }
  }

  function drawDragonHeadAndFire(headX, headY, theme, direction, alive, paused) {
    const cx = headX + cellSize / 2;
    const cy = headY + cellSize / 2;
    const angle = Math.atan2(direction.y, direction.x);
    const idleBreath = alive && !paused ? Math.max(0, (Math.sin(foodPulse * 0.34) - 0.78) / 0.22) * 0.55 : 0;
    const fireStrength = Math.max(dragonFireBurst, idleBreath);
    dragonFireBurst = Math.max(0, dragonFireBurst - 0.022);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    if (fireStrength > 0.02) {
      const reach = 16 + fireStrength * 19;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.34 + fireStrength * 0.34;
      ctx.fillStyle = theme.fireOuter;
      ctx.beginPath(); ctx.moveTo(7, -5); ctx.quadraticCurveTo(reach * 0.55, -10, reach, 0); ctx.quadraticCurveTo(reach * 0.55, 10, 7, 5); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.62 + fireStrength * 0.26; ctx.fillStyle = theme.fireMid;
      ctx.beginPath(); ctx.moveTo(9, -3); ctx.quadraticCurveTo(reach * 0.58, -6, reach * 0.82, 0); ctx.quadraticCurveTo(reach * 0.58, 6, 9, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = theme.fireCore; ctx.beginPath(); ctx.moveTo(10, -1.5); ctx.lineTo(reach * 0.58, 0); ctx.lineTo(10, 1.5); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.fillStyle = theme.dragonScale; ctx.strokeStyle = '#11141a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(5, -8); ctx.lineTo(10, -4); ctx.lineTo(11, 4); ctx.lineTo(5, 8); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.dragonScaleLight; ctx.fillRect(1, -5, 7, 2);
    ctx.fillStyle = theme.dragonHorn;
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-10, -12); ctx.lineTo(0, -8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-10, 12); ctx.lineTo(0, 8); ctx.fill();
    ctx.fillStyle = theme.dragonEye; ctx.shadowColor = theme.dragonEye; ctx.shadowBlur = 6;
    ctx.fillRect(2, -5, 2.5, 2.5); ctx.fillRect(2, 2.5, 2.5, 2.5);
    ctx.shadowBlur = 0; ctx.restore();
  }

  function drawRivalGhost(ghost) {
    if (!ghost?.snake?.length) return;
    const age = Math.max(0, Date.now() - Number(ghost.receivedAt || 0));
    if (age >= 2200) return;
    const freshness = age <= 700 ? 1 : 1 - ((age - 700) / 1500);
    const transition = Math.min(1, Math.max(0, age / Math.max(80, Number(ghost.intervalMs || 100))));
    const previousSnake = ghost.previousSnake?.length === ghost.snake.length
      ? ghost.previousSnake
      : ghost.snake;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff5a8b';
    ctx.fillStyle = '#ff5a8b';
    ctx.lineWidth = 1.5;
    for (let index = ghost.snake.length - 1; index >= 0; index--) {
      const segment = ghost.snake[index];
      const previous = previousSnake[index] || segment;
      const x = lerp(previous.x, segment.x, transition) * cellSize;
      const y = lerp(previous.y, segment.y, transition) * cellSize;
      ctx.globalAlpha = freshness * (index === 0 ? 0.24 : 0.14);
      ctx.strokeRect(x + 3.5, y + 3.5, cellSize - 7, cellSize - 7);
      const offset = index % 2 ? 4 : 10;
      ctx.fillRect(x + offset, y + offset, 3, 3);
      if (index === 0) {
        ctx.globalAlpha = freshness * 0.3;
        ctx.fillRect(x + 7, y + 7, 6, 6);
      }
    }
    ctx.restore();
  }

  function draw(interpolation) {
    const { snake, direction, food, theme, themeId, alive, paused, rivalGhost } = getGameState();
    if (!snake?.length || !food || !theme) return;
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 0.5;
    for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
    drawBoardPattern(theme);
    drawRivalGhost(rivalGhost);

    const interpolateSnake = prevSnake && prevSnake.length === snake.length && interpolation < 1;
    const t = interpolateSnake ? Math.min(interpolation, 1) : 1;
    for (const trail of trailPoints) {
      const alpha = trail.alpha * 0.6;
      if (alpha < 0.02) continue;
      ctx.globalAlpha = alpha; ctx.fillStyle = theme.trail; ctx.beginPath(); ctx.arc(trail.x, trail.y, cellSize / 2 - 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = snake.length - 1; i >= 0; i--) {
      const segment = snake[i];
      const previous = interpolateSnake && prevSnake[i] ? prevSnake[i] : segment;
      const x = lerp(previous.x, segment.x, t) * cellSize;
      const y = lerp(previous.y, segment.y, t) * cellSize;
      const ratio = i / Math.max(snake.length, 1);
      const tail = theme.snakeTail;
      const color = (theme.snakeStyle === 'bricks' || theme.snakeStyle === 'cel' || theme.snakeStyle === 'fighter')
        ? theme.snakePalette[i % theme.snakePalette.length]
        : `rgb(${Math.round(tail[0] + tail[0] * 0.4 * (1 - ratio))},${Math.round(tail[1] - tail[1] * 0.3 * ratio)},${Math.round(tail[2] - tail[2] * 0.25 * ratio)})`;
      const padding = i === 0 ? 1 : 2;
      if (i === 0) { ctx.shadowColor = theme.snakeHead; ctx.shadowBlur = 12 + Math.sin(foodPulse * 2) * 3; }
      ctx.fillStyle = color;
      if (theme.snakeStyle === 'dragon') {
        ctx.save(); ctx.translate(x + cellSize / 2, y + cellSize / 2); ctx.fillStyle = i === 0 ? theme.dragonScaleLight : (i % 2 ? theme.dragonScale : color); ctx.strokeStyle = '#11141a'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, -2); ctx.lineTo(6, 6); ctx.lineTo(0, 8); ctx.lineTo(-6, 6); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (i > 0) { ctx.fillStyle = theme.dragonHorn; ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(0, -12); ctx.lineTo(3, -7); ctx.fill(); }
        if (i === 1) { ctx.globalAlpha = 0.82; ctx.fillStyle = '#8b2635'; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-15, -11); ctx.lineTo(-10, 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(15, -11); ctx.lineTo(10, 5); ctx.fill(); }
        ctx.restore();
      } else if (theme.snakeStyle === 'bricks') {
        ctx.fillRect(x + padding, y + padding + 2, cellSize - padding * 2, cellSize - padding * 2 - 2); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + padding, y + cellSize - padding - 3, cellSize - padding * 2, 3); ctx.fillStyle = color;
        for (const studX of [x + 6, x + 14]) { ctx.beginPath(); ctx.arc(studX, y + 5, i === 0 ? 3.2 : 2.8, 0, Math.PI * 2); ctx.fill(); }
      } else if (theme.snakeStyle === 'cel') {
        ctx.fillStyle = '#241F20'; roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, i === 0 ? 6 : 4); ctx.fillStyle = color; roundRect(x + padding + 2, y + padding + 2, cellSize - padding * 2 - 4, cellSize - padding * 2 - 4, i === 0 ? 4 : 2); ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + padding + 4, y + padding + 4, Math.max(3, cellSize - padding * 2 - 9), 2);
      } else if (theme.snakeStyle === 'fighter') {
        ctx.fillStyle = '#11131a'; roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, i === 0 ? 5 : 3); ctx.fillStyle = i === 0 ? theme.fighterSkin : (i % 3 === 0 ? theme.fighterGiShadow : theme.fighterGi); roundRect(x + padding + 1.5, y + padding + 1.5, cellSize - padding * 2 - 3, cellSize - padding * 2 - 3, i === 0 ? 4 : 2);
        if (i === 0) { ctx.fillStyle = theme.fighterHair; ctx.fillRect(x + 3, y + 2, 14, 4); ctx.fillRect(x + 5, y, 3, 4); ctx.fillRect(x + 11, y + 1, 4, 4); ctx.fillStyle = theme.fighterBand; ctx.fillRect(x + 2, y + 6, 16, 2); } else if (i % 4 === 0) { ctx.fillStyle = theme.fighterBand; ctx.fillRect(x + padding + 1, y + 8, cellSize - padding * 2 - 2, 4); } else { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + padding + 4, y + padding + 3, 4, 2); }
      } else roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, i === 0 ? 6 : 3);
      ctx.shadowBlur = 0;
    }

    const head = snake[0]; const previousHead = interpolateSnake && prevSnake[0] ? prevSnake[0] : head;
    const headX = lerp(previousHead.x, head.x, t) * cellSize; const headY = lerp(previousHead.y, head.y, t) * cellSize;
    if (theme.snakeStyle === 'dragon') drawDragonHeadAndFire(headX, headY, theme, direction, alive, paused);
    else {
      ctx.fillStyle = '#fff';
      const eyeOne = direction.x === 0 ? { x: 5, y: direction.y > 0 ? 12 : 5 } : { x: direction.x > 0 ? 12 : 5, y: 5 };
      const eyeTwo = direction.x === 0 ? { x: 13, y: direction.y > 0 ? 12 : 5 } : { x: direction.x > 0 ? 12 : 5, y: 13 };
      ctx.beginPath(); ctx.arc(headX + eyeOne.x, headY + eyeOne.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(headX + eyeTwo.x, headY + eyeTwo.y, 2.5, 0, Math.PI * 2); ctx.fill();
      if (theme.snakeStyle === 'fighter' && fighterImpactBurst > 0) {
        const strength = fighterImpactBurst; ctx.save(); ctx.translate(headX + cellSize / 2, headY + cellSize / 2); ctx.strokeStyle = theme.fighterSpark; ctx.lineWidth = 2; ctx.shadowColor = theme.fighterSpark; ctx.shadowBlur = 8;
        for (let ray = 0; ray < 8; ray++) { const angle = ray * Math.PI / 4 + foodPulse * 0.08; const inner = 11 + (1 - strength) * 5; const outer = inner + 9 * strength; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); ctx.stroke(); }
        ctx.restore(); fighterImpactBurst = Math.max(0, fighterImpactBurst - 0.065);
      }
    }
    foodPulse += 0.05; foodScale = lerp(foodScale, foodScaleTarget, 0.2); if (Math.abs(foodScale - foodScaleTarget) < 0.01) foodScaleTarget = 1;
    ctx.shadowColor = theme.food; ctx.shadowBlur = 8 + Math.sin(foodPulse) * 4; ctx.fillStyle = theme.food; ctx.beginPath(); ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, (cellSize / 2 - 2) * foodScale, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    drawFoodSprite(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, foodScale, themeId);
    drawParticles(); drawDeathSegments();
    if (deathFlash > 0) { ctx.fillStyle = theme.deathFlash + deathFlash + ')'; ctx.fillRect(0, 0, canvasWidth, canvasHeight); deathFlash -= 0.04; }
    if (paused && alive) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, canvasWidth, canvasHeight); ctx.fillStyle = theme.accent; ctx.font = 'bold 32px -apple-system, SF Pro Display'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PAUSED', canvasWidth / 2, canvasHeight / 2); }
  }

  function resetEffects() {
    prevSnake = null; particles.length = 0; deathSegments = []; trailPoints = [];
    deathFlash = 0; foodScale = 1; foodScaleTarget = 1; dragonFireBurst = 0; fighterImpactBurst = 0; screenShake = 0; shakeX = 0; shakeY = 0;
  }

  function capturePreviousSnake(snake) { prevSnake = snake.map(segment => ({ ...segment })); }
  function recordMove(snake) {
    const head = snake[0];
    if (!head) return;
    trailPoints.unshift({ x: head.x * cellSize + cellSize / 2, y: head.y * cellSize + cellSize / 2, alpha: 1 });
    if (trailPoints.length > maxTrail) trailPoints.pop();
    for (const trail of trailPoints) trail.alpha *= 0.7;
  }
  function triggerFoodEat({ food, theme }) {
    if (theme.snakeStyle === 'dragon') dragonFireBurst = 1;
    if (theme.snakeStyle === 'fighter') fighterImpactBurst = 1;
    spawnParticles(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, 12, theme.food, 2, 1);
    spawnParticles(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, 6, theme.foodAccent, 1.5, 0.7);
    foodScale = 0.3; foodScaleTarget = 1.6;
  }
  function triggerCollision({ snake, theme }) {
    deathFlash = 0.5; screenShake = 15; deathSegments = [];
    const tail = theme.snakeTail;
    for (let i = 0; i < snake.length; i++) {
      const segment = snake[i]; const angle = Math.random() * Math.PI * 2; const speed = 2 + Math.random() * 4; const ratio = i / Math.max(snake.length, 1);
      deathSegments.push({ x: segment.x * cellSize + cellSize / 2, y: segment.y * cellSize + cellSize / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: i === 0 ? cellSize * 0.8 : cellSize * 0.6, color: `rgb(${Math.round(tail[0] + tail[0] * 0.4 * (1 - ratio))},${Math.round(tail[1] - tail[1] * 0.3 * ratio)},${Math.round(tail[2] - tail[2] * 0.25 * ratio)})`, life: 1, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3 });
      spawnParticles(segment.x * cellSize + cellSize / 2, segment.y * cellSize + cellSize / 2, 3, theme.deathParticle, 1.5, 0.8);
    }
    const head = snake[0]; if (head) spawnParticles(head.x * cellSize + cellSize / 2, head.y * cellSize + cellSize / 2, 30, theme.deathParticle, 3, 1.5);
    trailPoints = [];
  }
  function update(dt) {
    updateParticles(dt); updateDeathSegments(dt);
    if (screenShake > 0) { shakeX = (Math.random() - 0.5) * screenShake * 1.2; shakeY = (Math.random() - 0.5) * screenShake * 1.2; screenShake *= 0.85; if (screenShake < 0.5) { screenShake = 0; shakeX = 0; shakeY = 0; } }
  }
  function drawFrame(interpolation) { if (screenShake > 0) { ctx.save(); ctx.translate(shakeX, shakeY); } draw(interpolation); if (screenShake > 0) ctx.restore(); }
  function hasActiveEffects() { return deathFlash > 0 || deathSegments.length > 0 || particles.length > 0; }
  function updateFps(element) { fpsFrames++; const now = performance.now(); if (now - fpsLast >= 500) { element.textContent = `${Math.round(fpsFrames / ((now - fpsLast) / 1000))} FPS`; fpsFrames = 0; fpsLast = now; } }

  return { resetEffects, capturePreviousSnake, recordMove, triggerFoodEat, triggerCollision, update, draw: drawFrame, hasActiveEffects, updateFps };
}
