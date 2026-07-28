// Shared, canvas-only sprite helper. Theme-picker previews and the live board
// deliberately use the same pixels so a selected food always matches its icon.
export function drawFoodSprite(ctx, cx, cy, cellSize, foodSprites, scale = 1, themeId = 'default') {
  const data = foodSprites[themeId] || foodSprites.default;
  const sprite = data.grid;
  const palette = data.palette;
  const pixelSize = (cellSize * scale * 0.9) / sprite.length;
  const originX = cx - (sprite[0].length * pixelSize) / 2;
  const originY = cy - (sprite.length * pixelSize) / 2;

  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < sprite.length; row++) {
    for (let column = 0; column < sprite[row].length; column++) {
      const value = sprite[row][column];
      if (!value) continue;
      ctx.fillStyle = palette[value];
      ctx.fillRect(
        Math.round(originX + column * pixelSize),
        Math.round(originY + row * pixelSize),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize)
      );
    }
  }
}
