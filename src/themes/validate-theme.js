const REQUIRED_THEME_FIELDS = ['name', 'bg', 'grid', 'snakeHead', 'snakeTail', 'food', 'accent', 'music'];

export function validateThemeCatalog(themes, foodSprites) {
  for (const [id, theme] of Object.entries(themes)) {
    for (const field of REQUIRED_THEME_FIELDS) {
      if (!theme?.[field]) throw new Error(`Theme "${id}" is missing ${field}`);
    }
    if (!Array.isArray(theme.snakeTail) || theme.snakeTail.length !== 3) {
      throw new Error(`Theme "${id}" must define an RGB snakeTail`);
    }
    if (!foodSprites[id]?.grid?.length || !foodSprites[id]?.palette?.length) {
      throw new Error(`Theme "${id}" is missing a food sprite`);
    }
    if (!Array.isArray(theme.music.bass) || !Array.isArray(theme.music.melody)) {
      throw new Error(`Theme "${id}" is missing music layers`);
    }
    for (const layer of ['bass', 'melody', 'arpeggio', 'drums']) {
      if (!Array.isArray(theme.music[layer]) || theme.music[layer].length !== 4) {
        throw new Error(`Theme "${id}" must define four ${layer} progression stages`);
      }
      if (theme.music[layer].some(stage => !Array.isArray(stage) || stage.length === 0)) {
        throw new Error(`Theme "${id}" has an empty ${layer} progression stage`);
      }
    }
  }
}
