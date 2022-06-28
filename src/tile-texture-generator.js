/* eslint-env browser */
import {
  symbolToCharMap,
} from './symbols.js';
import {
  rgb,
} from './utils.js';

export function generateTileTexture(tilesAcross, tilesDown, tileSize) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = tilesAcross * tileSize;
  ctx.canvas.height = tilesDown * tileSize;
  ctx.font = `${tileSize / 2}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let y = 0; y < tilesDown; ++y) {
    for (let x = 0; x < tilesAcross; ++x) {
      const xOff = x * tileSize;
      const yOff = y * tileSize;
      ctx.fillStyle = rgb(Math.random(), Math.random(), Math.random());
      ctx.fillRect(xOff, yOff, tileSize, tileSize);
      ctx.fillStyle = 'black';
      ctx.fillText(x, xOff + tileSize / 2, yOff);
      ctx.fillText(y, xOff + tileSize / 2, yOff + tileSize / 2);
    }
  }
  ctx.font = `${tileSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'black';
  for (const [id, char] of symbolToCharMap) {
    const x = (id & 0xFF) * tileSize;
    const y = ((id >> 8) & 0xFF) * tileSize;
    ctx.clearRect(x, y, tileSize, tileSize);
    // add a clipping path so characters don't bleed into neighboring tiles.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, tileSize, tileSize);
    ctx.clip();
    ctx.fillText(char, x + tileSize / 2, y + tileSize / 10 | 0);
    ctx.restore();
  }
  return ctx.canvas;
}
