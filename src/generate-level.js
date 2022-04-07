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
} from './utils.js';

export function randomLevel(settings) {
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

  // This is a lot of memory but whatever
  const available = [];
  for (let y = 1; y < mapHeight - 1; ++y) {
    for (let x = 1; x < mapWidth - 1; ++x) {
      available.push(y * mapWidth + x);
    }
  }
  shuffleArray(available);

  function place(sym, stat, rep, many) {
    let count = 0;
    while (available.length && count < many) {
      const pos = available.pop();
      if (map[pos] === kSymDirt) {
        count++;
        map[pos] = sym;

        if (map[pos + 1] === kSymDirt) {
          map[pos + 1] = rep;
        }

        if (map[pos + mapWidth + 1] === kSymDirt) {
          map[pos + mapWidth + 1] = rep;
        }

        if (map[pos + mapWidth] === kSymDirt) {
          map [pos + mapWidth] = rep;
        }
      }
    }
  }

  place(kSymDiamond,   0,     kSymDirt,  settings.diamonds);
  place(kSymWall,      0,     kSymDirt,  settings.walls);
  place(kSymRock,      0,     kSymDirt,  settings.rocks);
  place(kSymGuard,     kUp,   kSymSpace, settings.guards);
  place(kSymButterfly, kDown, kSymSpace, settings.butterflies);
  place(kSymAmoeba,    0,     kSymDirt,  settings.amoebas);
  place(kSymMagicWall, 0,     kSymDirt,  settings.magicWalls);

  return {
    mapWidth,
    mapHeight,
    mapBuffer,
    map,
    mapFlags,
    requiredScore: settings.requiredScore,
  };
}