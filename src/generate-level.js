import {
  kUp,
  kDown,
  kLeft,
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
  kSymFire,
  kSymBalloon,
  kSymBomb,
  kSymSideWalker,
  kSymPatroller,
  kSymSpike,
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
  const mapFlags = new Uint16Array(mapArea);
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
  const w = mapWidth - 2;
  // Remove some in each direction of exit just to hopefully
  // give the player a path to exit
  {
    const rows = Math.min(5, mapHeight - 2);
    for (let i = 0; i < rows; ++i) {
       available.splice((mapHeight - i - 2) * w - 1, 1);
    }
    const cols = Math.min(4, mapWidth - 3);
    available.splice(available.length - cols, cols);
  }
  // Remove some in each direction of player just to hopefully
  // give the player an exit
  {
    for (let i = Math.min(6, mapHeight - 2); i >= 1; --i) {
       available.splice(i * w, 1);
    }
    available.splice(1, Math.min(5, mapWidth - 3));
  }

  shuffleArray(available, randFn);

  function placeIfDirt(pos, sym) {
    if (map[pos] !== kSymDirt) {
      return false;
    }
    map[pos] = sym;
    return true;
  }

  function place(sym, stat, rep, many, offset = 1, fn) {
    let count = 0;
    while (available.length && count < many) {
      const pos = available.pop();
      if (placeIfDirt(pos, sym)) {
        if (fn) {
          fn(pos);
        }
        count++;
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

  function placeSpike(pos) {
    const x = pos % mapWidth;
    const y = pos / mapWidth | 0;
    const newY = randFn() * y | 0;
    const newPos = mapWidth * newY + x;
    placeIfDirt(newPos, kSymSpike);
  }

  function placeSideWalker(pos) {
    const offset = randFn() < 0.5 ? 1 : mapWidth;
    mapFlags[pos] = offset === 1 ? kLeft : kUp;
    placeIfDirt(pos + offset, kSymSpace);
    placeIfDirt(pos - offset, kSymSpace);
  }

  function placePatroller(pos) {
    mapFlags[pos] = randFn() * 4 | 0;
  }

  place(kSymDiamond,    0,     kSymDirt,  settings.diamonds);
  place(kSymWall,       0,     kSymDirt,  settings.walls);
  place(kSymRock,       0,     kSymDirt,  settings.rocks);
  place(kSymGuard,      kUp,   kSymSpace, settings.guards, -1);
  place(kSymButterfly,  kDown, kSymSpace, settings.butterflies);
  place(kSymAmoeba,     0,     kSymDirt,  settings.amoebas);
  place(kSymMagicWall,  0,     kSymDirt,  settings.magicWalls);
  place(kSymFire,       0,     kSymDirt,  settings.fire);
  place(kSymBalloon,    0,     kSymDirt,  settings.balloons, 0, placeSpike);
  place(kSymBomb,       0,     kSymDirt,  settings.bombs);
  place(kSymSideWalker, 0,     kSymSpace, settings.sideWalkers, 0, placeSideWalker);
  place(kSymPatroller,  0,     kSymSpace, settings.patrollers, 0, placePatroller);

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