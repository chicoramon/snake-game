# How to Add a New Theme to Snake Game

This guide covers every touchpoint needed to add a new theme to `snake-game.html`. The game is a single HTML file — all CSS, JS, and assets live inline.

---

## Overview: 4 Things to Create

1. **Theme definition** in `THEMES` — colors, music, SFX
2. **Food sprite** in `FOOD_SPRITES` — 16×16 pixel art grid
3. **Theme picker icon** in `THEME_ICON_URLS` — base64-encoded SVG pixel art
4. **Theme button** in HTML — the clickable card in the themes panel

---

## 1. Theme Definition (`THEMES` object, ~line 1498)

Add a new key to the `THEMES` object. Use a lowercase slug as the key (e.g. `megaman`, `pacman`, `pokemon`). Place it after the last theme and before the closing `};`.

### Required Properties

```js
themename: {
  name: 'Display Name',           // shown in theme picker
  bg: '#0a0a1a',                  // canvas background color (dark)
  grid: 'rgba(100,100,255,0.03)', // grid line color (very low alpha)
  snakeHead: '#00ff88',           // snake head fill color
  snakeTail: [0, 255, 136],      // RGB array for tail glow (no #)
  food: '#ffcc00',                // food sprite primary color
  foodGlow: 'rgba(255,204,0,0.5)', // food glow/pulse color
  foodAccent: '#ff6600',          // food secondary accent
  accent: '#00ff88',              // UI accent (score text, level-up)
  deathFlash: 'rgba(255,0,0,',   // death flash color (note trailing comma — appends alpha dynamically)
  trail: '#00ff88',               // snake afterimage trail color
  deathParticle: '#ffcc00',       // particle burst color on death
```

### Music (`music` object)

All music is procedurally generated with Web Audio. Each channel is an array of **4 arrays** — one per intensity level. Each inner array is a sequence of **frequencies** (Hz) or `0` for silence. Legacy themes normally use 48 steps; marquee themes should use `buildMusicArc(...)` to create a 128-step evolving score.

The engine defaults to intensity thresholds `[8, 16, 28]`. A theme can override them with `intensityThresholds`, and can use `minStepsPerIntensity` so a fast-scoring player cannot skip the musical introduction. Use `tempoGrowth` for a curved base-to-maximum BPM progression.

```js
  music: {
    bass: [
      [/* level 1: 48 freq values */],
      [/* level 2 */],
      [/* level 3 */],
      [/* level 4 */],
    ],
    melody: [ /* same 4-level structure */ ],
    arpeggio: [ /* same 4-level structure */ ],
    drums: [
      [/* level 1: 48 values, 0=silence, 1=kick, 2=hihat, 3=snare */],
      [/* level 2 */],
      [/* level 3 */],
      [/* level 4 */],
    ],
    bassType: 'triangle',      // oscillator type: 'triangle', 'square', 'sawtooth'
    melodyType: 'square',
    arpType: 'square',
    bassVol: 0.35,             // 0.0–1.0
    melodyVol: 0.14,
    arpVol: 0.07,
    baseBPM: 200,              // starting tempo
    maxBPM: 280,               // cap at high snake length
    bpmPerLen: 2,              // BPM increase per food eaten
    tempoGrowth: 32,           // optional smooth-curve length to max BPM
    intensityThresholds: [9,18,30],
    minStepsPerIntensity: 64,  // optional musical-time gate
  },
```

### Marquee audio standard

Use the Game of Thrones theme as the north-star implementation:

- Compose four 32-step movements: introduction, development, crescendo, and resolution.
- Keep every channel/intensity array the same length, preferably 96–128+ steps.
- Start with space and rests. Add density, register, percussion, and tempo progressively.
- Make the final movement resolve and breathe before looping; never repeat an unbroken climax.
- Gate intensity with both score thresholds and `minStepsPerIntensity`.
- Prefer `tempoGrowth` over an immediately fast `baseBPM`.
- Keep every musical voice inside the 8-bit palette: square/pulse leads, triangle bass, and coarse noise percussion. Do not use orchestral voice labels or cinematic synthesis.
- `percussion: '8bit-war'` creates an epic drum character with a stepped triangle body, square-wave click, and coarse held noise while preserving the console-era identity.

**Tip:** Start with the `default` theme's music arrays as a template. Replace frequencies with your theme's melody. Use `0` for rests. Common note frequencies:
- C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
- C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00

### Sound Effects

```js
  sfxEat: [
    // Array of SFX objects — one is randomly picked each eat
    { type: 'square', freqs: [523, 784, 1047], times: [0, 0.05, 0.1], dur: 0.18, vol: 0.15 }
  ],
  sfxDie: { type: 'sawtooth', freqStart: 440, freqEnd: 50, dur: 0.5, vol: 0.2 },
```

- `sfxEat`: array of objects. Each has `type` (oscillator), `freqs` (ascending pitch sequence), `times` (when each freq triggers), `dur` (total duration in seconds), `vol` (0.0–1.0).
- `sfxDie`: single object. `freqStart`→`freqEnd` sweeps down over `dur` seconds.

---

## 2. Food Sprite (`FOOD_SPRITES` object, ~line 2192)

Each food sprite is a **16×16 grid** where each cell is an index into a color palette.

```js
themename: {
  grid: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    // ... 16 rows total, each with 16 values
  ],
  palette: [null, '#FF3B30', '#CC2000', '#34C759', '#FF9999', '#3A1A00'],
  // palette[0] is always null (transparent). Indices 1–N map to colors.
},
```

**Rules:**
- Grid values reference palette indices: `0` = transparent, `1` = palette[1], etc.
- Keep sprites recognizable at small sizes — bold shapes, minimal detail.
- 4–6 colors is ideal. Use shading (light/dark variants) for 3D effect.
- The sprite is drawn centered in the food cell at ~90% of cell size.

**Design tips from existing sprites:**
- Apple (default): red body with green leaf, dark outline, highlight
- Coin (mario): gold disc with star emblem, dark border
- Rupee (zelda): green diamond with facet lines
- Ring (sonic): blue circle with white inner glow

---

## 3. Theme Picker Icon (`THEME_ICON_URLS` object, ~line 3302)

The theme picker shows a pixel-art icon for each theme. Icons are **base64-encoded SVGs** using `<rect>` elements with 12px or 10px grid cells on a ~192×192 canvas.

```js
THEME_ICON_URLS = {
  themename: 'data:image/svg+xml;base64,...',
};
```

### How to create the SVG:

1. Design a 16×16 (or similar) pixel art character/icon on graph paper
2. Map each pixel to a `<rect>` with class `px-{COLOR_LETTER}` (e.g. `px-R` for red)
3. Each rect: `x`, `y` = grid position × cell size (10 or 12), `width`/`height` = cell size
4. Set `shape-rendering="crispEdges"` on the SVG for sharp pixels
5. Wrap all rects in a `<g id="pixel-art">`
6. Base64-encode the SVG and prepend `data:image/svg+xml;base64,`

**Color classes used in existing icons** (use CSS fill directly on rects):
- `px-R` = Red (#c92525), `px-S` = Skin (#f1b36d), `px-K` = Black (#151515)
- `px-B` = Blue (#214fc6), `px-Y` = Yellow (#f0d13b), `px-G` = Green (#38a64a)
- `px-W` = White (#ffffff), `px-D` = Brown (#7a3a1d), `px-T` = Tan (#d94b36)
- `px-C` = Cyan (#1f9fd7), `px-E` = Earth (#7a4a25)

You can add new color letters as needed — just use the hex directly in the `fill` attribute.

**Fallback:** If `THEME_ICON_URLS[key]` is missing, the code falls back to drawing the food sprite on a canvas. So the icon is optional but recommended.

---

## 4. Theme Button in HTML (~line 1277)

Add a new `<div>` inside the `.theme-grid` container:

```html
<div class="theme-btn" data-theme="themename">
  <div class="theme-icon" id="ti-themename"></div>
  <span class="theme-name">Display Name</span>
</div>
```

- `data-theme` must match the key in `THEMES`
- `id` must be `ti-{key}` (matches the icon rendering loop)
- The `.selected` class is toggled dynamically — don't add it manually unless it should be the default

---

## Step-by-Step Checklist

1. [ ] Choose a theme name/slug (lowercase, no spaces)
2. [ ] Design color palette: bg, snake, food, accent, particles
3. [ ] Compose music arrays (4 levels × 4 channels; 128 evolving steps for marquee themes)
4. [ ] Write eat/die SFX
5. [ ] Add theme object to `THEMES`
6. [ ] Create 16×16 food sprite grid + palette → add to `FOOD_SPRITES`
7. [ ] Create pixel-art SVG icon → base64 encode → add to `THEME_ICON_URLS`
8. [ ] Add theme button HTML to `.theme-grid`
9. [ ] Test: open `snake-game.html` in browser, select theme, verify:
   - Background and grid look correct
   - Snake color matches
   - Food sprite renders and glows
   - Music plays at all 4 intensity levels
   - Eat and die SFX work
   - Theme picker icon displays correctly
   - Death particles and flash use the right colors

---

## Gotchas

- **Music arrays must all be the same length** within a channel. Marquee themes should use the same 128-step length across every channel and level.
- **Drums use integers**: 0=silence, 1=kick, 2=hihat, 3=snare. Don't use floats.
- **deathFlash** must end with a trailing comma — the code appends the alpha value as a string (e.g. `'rgba(255,0,0,'` → becomes `'rgba(255,0,0,0.8)'`).
- **snakeTail** is an RGB array `[r,g,b]` — not a hex string.
- **Food sprite palette[0]** must always be `null` (transparent background).
- **SVG icon base64** can be very long (~3–5KB encoded). That's normal for pixel art with many rects.
- **Theme order in HTML** determines display order in the picker grid.
- The `default` theme has no entry in `THEME_ICON_URLS` — it uses a canvas-rendered food sprite as fallback.

---

## Example: Minimal Theme Skeleton

```js
// In THEMES object:
megaman: {
  name: 'Mega Man',
  bg: '#0a0a2e', grid: 'rgba(50,100,255,0.03)',
  snakeHead: '#4fc3f7', snakeTail: [79, 195, 247],
  food: '#ffeb3b', foodGlow: 'rgba(255,235,59,0.5)', foodAccent: '#2196f3',
  accent: '#4fc3f7',
  deathFlash: 'rgba(79,195,247,',
  trail: '#4fc3f7', deathParticle: '#ffeb3b',
  music: {
    bass: [
      [130.81,0,130.81,0,196,0,196,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      // ... 3 more levels
    ],
    melody: [ /* ... */ ],
    arpeggio: [ /* ... */ ],
    drums: [ /* ... */ ],
    bassType: 'triangle', melodyType: 'square', arpType: 'square',
    bassVol: 0.35, melodyVol: 0.14, arpVol: 0.07,
    baseBPM: 180, maxBPM: 260, bpmPerLen: 2,
  },
  sfxEat: [
    { type: 'square', freqs: [660, 880, 1100], times: [0, 0.04, 0.08], dur: 0.15, vol: 0.18 }
  ],
  sfxDie: { type: 'sawtooth', freqStart: 440, freqEnd: 50, dur: 0.5, vol: 0.2 },
},
```

```js
// In FOOD_SPRITES object:
megaman: {
  grid: [
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
    // ... 15 more rows
  ],
  palette: [null, '#4FC3F7', '#0288D1', '#01579B', '#FFFFFF', '#FFEB3B'],
},
```

```js
// In THEME_ICON_URLS object:
megaman: 'data:image/svg+xml;base64,...',
```

```html
<!-- In theme-grid -->
<div class="theme-btn" data-theme="megaman">
  <div class="theme-icon" id="ti-megaman"></div>
  <span class="theme-name">Mega Man</span>
</div>
```
