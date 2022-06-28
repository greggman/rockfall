/* eslint-env browser */

import {
  // kUp,
  kDown,
  kLeft,
  kRight,
} from './directions.js';
import {
  kSymBorder,
  // kSymDiamond,
} from './symbols.js';
import { basenameNoExt } from './utils.js';

const kHFlip = 0x80000000;
const kVFlip = 0x40000000;
const kSwap  = 0x20000000;
const kDirBits = kHFlip | kVFlip | kSwap;
const kIdBits  = 0xFFFFFFFF ^ kDirBits;


const tiledDirBitsToDir = new Map([
  [0,                           0 ],   // F
  [kVFlip,                  kDown ],
  [kHFlip,                  kLeft ],
  [kVFlip | kHFlip,         kDown ],
  [kSwap | 0,               kLeft ],
  [kSwap | kVFlip,          kLeft ],
  [kSwap | kHFlip,          kRight],
  [kSwap | kVFlip | kHFlip, kRight],
]);

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
  const tiles = data.layers[0].data.map(v => {
    // tiled numbers from 1 to N
    // we number by row/col where row is (bits 15-8) 0xFF00 and col is (bits 7-0) 0x00FF
    // plus there are flip and rotation bits in top 0xFF000000
    v = Math.max(0, v - 1);
    return (v & 0x1F) | ((v & 0x3E0) << 3) | (v & 0xFFFF0000);
  });
  for (let y = 0; y < data.height; ++y) {
    map.set(tiles.slice(y * data.width, (y + 1) * data.width), (y + 1) * mapWidth + 1);
  }

  for (let i = 0; i < map.length; ++i) {
    const v = map[i];
    map[i] = v === 0xFFFFFFF ? 0 : (v & kIdBits);
    mapFlags[i] = tiledDirBitsToDir.get(v & kDirBits);
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