/* eslint-env browser */

import {
  kSymBorder,
  // kSymDiamond,
} from './symbols.js';
import { basenameNoExt } from './utils.js';

export function parseTiledLevel(data, url) {
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

  const settings = {name: basenameNoExt(url)};
  for (const prop of data.properties || []) {
    const {name, value} = prop;
    settings[name] = value;
  }

  // let c = 0;
  // map.forEach(t => {
  //   c = c + (t === kSymDiamond ? 1 : 0);
  // });
  // console.log(url, 'num diamonds:', c);

  return {
    mapWidth,
    mapHeight,
    mapBuffer,
    map,
    mapFlags,
    settings,
  };
}