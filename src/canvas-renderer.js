/* eslint-env browser */
import {
  symbolToCharMap
} from './symbols.js';

export function draw(ctx, map, mapWidth, mapHeight, tileSize, players) {
  ctx.canvas.width = ctx.canvas.clientWidth * devicePixelRatio;
  ctx.canvas.height = ctx.canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = '${tileSize}px monospace';
  const numPlayers = players.length;
  const width = mapWidth * tileSize;
  const height = (mapHeight + numPlayers) * tileSize;
  ctx.save();
  ctx.translate((ctx.canvas.clientWidth - width) / 2 | 0 + 0.5, (ctx.canvas.clientHeight - height) / 2 | 0 + 0.5);

  for (let y = 0; y < mapHeight; ++y) {
    for (let x = 0; x < mapWidth; ++x) {
      const xx = x * tileSize;
      const yy = y * tileSize + tileSize;
      const char = symbolToCharMap.get(map[y * mapWidth + x]) || '-';
      ctx.fillText(char, xx, yy);
    }
  }

  {
    const y = mapHeight * tileSize + tileSize;
    for (let i = 0; i < numPlayers; ++i) {
      const player = players[i];
      ctx.fillStyle = player.dead ? 'red' : 'white';
      ctx.fillText(`Player ${i + 1}: ${player.score} ${player.dead ? '💀' : ''}`, 10, y + i * 16);
    }
  }
  ctx.restore();
}
