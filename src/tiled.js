/* eslint-env browser */

import {
  kSymBorder,
} from './symbols.js';

export function parseTiledLevel(data) {
  // add space for a border
  const mapWidth = data.width + 2;
  const mapHeight = data.height + 2;
  const mapArea = mapWidth * mapHeight;

  const mapBuffer = new ArrayBuffer(mapArea * 4);
  const map = new Uint32Array(mapBuffer);
  const mapFlags = new Uint8Array(mapArea);

  // copy each line into the middle
  map.fill(kSymBorder);
  const tiles = data.layers[0].data.map(v => v - 1);
  for (let y = 0; y < data.height; ++y) {
    map.set(tiles.slice(y * data.width, (y + 1) * data.width), (y + 1) * mapWidth + 1);
  }

  const custom = {};
  for (const prop of data.properties || []) {
    const {name, value} = prop;
    custom[name] = value;
  }

  return {
    mapWidth,
    mapHeight,
    mapBuffer,
    map,
    mapFlags,
    requiredScore: custom.requiredScore,
  };
}