import {
  kUp,
  kDown,
} from './directions.js';
import {
  kSymDirt,
  kSymBorder,
  kSymSpace,
  kSymDiamond,
  kSymWall,
  kSymRock,
  kSymGuard,
  kSymButterfly,
  kSymAmoeba,
  kSymMagicWall,
} from './symbols.js';
import {
  shuffleArray,
  PseudoRandomNumberGenerator,
} from './utils.js';

export function randomLevel(settings) {
  const r = new PseudoRandomNumberGenerator(settings.seed);
  const randFn = r.random.bind(r);

  const mapWidth = settings.mapWidth;
  const mapHeight = settings.mapHeight;
  const mapArea = mapWidth * mapHeight;

  const mapBuffer = new ArrayBuffer(mapArea * 4);
  const map = new Uint32Array(mapBuffer);
  const mapFlags = new Uint8Array(mapArea);
  map.fill(kSymDirt);

  for (let i = 0; i < mapWidth; i++) {
    map[i] = kSymBorder;
    const pos = mapArea - 1 - i;
    map[pos] = kSymBorder;
  }

  for (let i = 0; i < mapHeight; i++) {
    let pos = i * mapWidth;
    map[pos] = kSymBorder;
    pos += mapWidth - 1;
    map[pos] = kSymBorder;
  }

  const available = [];
  for (let y = 1; y < mapHeight - 1; ++y) {
    for (let x = 1; x < mapWidth - 1; ++x) {
      available.push(y * mapWidth + x);
    }
  }
  // remove 5 in each direction of player just to hopefully
  // give the player an exit
  const w = mapWidth - 2;
  for (let i = Math.min(6, mapHeight - 2); i >= 1; --i) {
     available.splice(i * w, 1);
  }
  available.splice(1, Math.min(5, mapWidth - 3));
  shuffleArray(available, randFn);

  function place(sym, stat, rep, many, offset = 1) {
    let count = 0;
    while (available.length && count < many) {
      const pos = available.pop();
      if (map[pos] === kSymDirt) {
        count++;
        map[pos] = sym;

        const offsets = [
          offset,
          mapWidth,
          mapWidth + offset,
        ];
        for (const off of offsets) {
          const newPos = pos + off;
          if (map[newPos] === kSymDirt) {
            map[newPos] = rep;
          }
        }
      }
    }
  }

  place(kSymDiamond,   0,     kSymDirt,  settings.diamonds);
  place(kSymWall,      0,     kSymDirt,  settings.walls);
  place(kSymRock,      0,     kSymDirt,  settings.rocks);
  place(kSymGuard,     kUp,   kSymSpace, settings.guards, -1);
  place(kSymButterfly, kDown, kSymSpace, settings.butterflies);
  place(kSymAmoeba,    0,     kSymDirt,  settings.amoebas);
  place(kSymMagicWall, 0,     kSymDirt,  settings.magicWalls);

  return {
    mapWidth,
    mapHeight,
    mapBuffer,
    map,
    mapFlags,
    settings: {
      name: 'Random',
      license: '-',
    },
  };
}