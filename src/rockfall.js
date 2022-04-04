/* eslint-env browser */
import * as twgl from '../3rdParty/twgl-full.module.js';
import TileMap from './tilemap.js';

let map;
let mapFlags;

const kSymSpace           =  32;    // space
const kSymBorder          =  97;    // border
const kSymDirt            =  98;    // dirt
const kSymDirtFace        =  99;    // Dirt E. Face
const kSymDirtFaceRight   = 100;    // Dirt E. Face
const kSymDirtFaceLeft    = 101;    // Dirt E. Face
const kSymButterfly       = 102;    // butterfly
const kSymGuard           = 103;    // guardian
const kSymDiamondExplode  = 104;    // diamond explosion
const kSymDiamondExplode2 = 105;    // diamond explosion
const kSymSpaceExplode    = 106;    // space explosion
const kSymSpaceExplode2   = 107;    // space explosion
const kSymAmoeba          = 108;    // amoeba
const kSymMagicWall       = 109;    // magic wall
const kSymEgg             = 110;    // monster egg
const kSymEggWiggle       = 111;    // egg wiggle
const kSymEggHatch        = 112;    // egg hatch
const kSymEggOpen         = 113;    // egg opening
const kSymWall            = 120;    // wall
const kSymDiamond         = 121;    // diamond
const kSymRock            = 122;    // rock

const kAgeWiggle = 50;    // time till egg wiggles
const kAgeCrack  = 58;    // time till egg cracks
const kAgeHatch  = 61;

// status flags bits
const kMoved    = 128;    // Status value when moved
const kUnmoved  = 127;
const kFall     = 64;     // added to status when falling
const kUnFall   = 191;    // Status value when FALLING
const kEggTime  = 63;
const kMoveBits = 3;

// input bits
const kUpBit    =  1;
const kDownBit  =  2;
const kLeftBit  =  4;
const kRightBit =  8;
const kFireBit  = 16;

const kAmoebaGrowthRate =  2;
const kCWise      = -1;
const kCCWise     =  1;

const mapWidth = 80;
const mapHeight = 25;
const mapArea = mapWidth * mapHeight;

let     amoebaGrowFlag  = 0;
let     amoebaChangeSym = 0;
const   numPlayers = 2;

// initial # of objects on screen
const  InitAmoebas = 1;       // amoeba
const  InitButterflies  = 5;  // butterflies
const  InitDiamonds  = 10;    // diamonds
const  InitGuards = 3;        // Guards
const  InitRocks  = 280;      // rocks
const  InitWalls  = 10;       // walls
const  InitMWalls = 2;        // magic walls.

let  amoebaCount = 0;
const  MaxAmoebas = 100;
const  amoebaMorph = kSymEgg; // what the amoeba changes into if it grows to MaxAmoebas

let  magicFlag = false;
let  magicTime = 250;

const explosionStack = [];
const players = [];

const kUp     = 0;
//const kRight  = 1;
const kDown   = 2;
const kLeft   = 3;
const directionMapOffset = [];        // offset to map pos in direction

const symbolToCharMap = new Map([
  [kSymSpace,           ' '],    // space
  [kSymBorder,          '🟪'],   // border
  [kSymDirt,            '🟫'],   // dirt
  [kSymDirtFace,        '🙂'],   // Dirty E. Face
  [kSymDirtFaceRight,   '👉'],   // Dirty E. Face
  [kSymDirtFaceLeft,    '👈'],   // Dirty E. Face
  [kSymButterfly,       '🦋'],   // butterfly
  [kSymGuard,           '👾'],   // guardian
  [kSymDiamondExplode,  '🔥'],   // diamond explosion
  [kSymDiamondExplode2, '💥'],   // diamond explosion
  [kSymSpaceExplode,    '🌩'],   // space explosion
  [kSymSpaceExplode2,   '💨'],   // space explosion
  [kSymAmoeba,          '🦠'],   // amoeba
  [kSymMagicWall,       '🏧'],   // magic wall
  [kSymEgg,             '🥚'],   // monster egg
  [kSymEggWiggle,       '🍆'],   // egg wiggle
  [kSymEggHatch,        '🐣'],   // egg hatch
  [kSymEggOpen,         '🥥'],   // egg opening
  [kSymWall,            '⬜️'],   // wall
  [kSymDiamond,         '💎'],   // diamond
  [kSymRock,            '🌑'],   // rock 🌑🌰🧅    // these are not available on Windows 10 -> 🪨
]);

const gl = document.querySelector('#playField').getContext('webgl2');
const rgb = (r, g, b) => `rgb(${r * 256 | 0}, ${g * 256 | 0}, ${b * 256 | 0})`;

const tileSize = 32;
const tilesAcross = 128;
const tilesDown = 1;
function makeTileTexture(gl) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.style.margin = '5px';
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
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'black';
  for (const [id, char] of symbolToCharMap) {
    const x = id * tileSize;
    const y = 0;
    ctx.clearRect(x, y, tileSize, tileSize);
    ctx.fillText(char, x, y + 3);
  }
   document.body.appendChild(ctx.canvas);
  return twgl.createTexture(gl, {
    src: ctx.canvas,
    minMag: gl.NEAREST,
  });
}

const tilesetTexture = makeTileTexture(gl);
const mapBuffer = new ArrayBuffer(mapArea * 4);
const mapAsUint8 = new Uint8Array(mapBuffer);

const tilemap = new TileMap(gl, {
  mapTilesAcross: mapWidth,
  mapTilesDown: mapHeight,
  tilemap: mapAsUint8,
  tileset: {
    tilesAcross,
    tilesDown,
    tileWidth: tileSize,
    tileHeight: tileSize,
    texture: tilesetTexture,
  },
});

const tileDrawOptions = {
  x: 0,
  y: 0,
  width:  mapWidth  * tileSize,
  height: mapHeight * tileSize,
  canvasWidth: 0, //this.canvas.width,
  canvasHeight: 0, //this.canvas.height,
  scrollX: 0,
  scrollY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  originX: 0,
  originY: 0,
};

const kCharPostMagicWall = kSymWall;
const magicWallAnim = [
  '🟥',
  '🟧',
  '🟨',
  '🟩',
  '🟦',
  '🟪',
];

function random(max) {
  return Math.random() * max | 0;
}

function place(sym, stat, rep, many) {
  let count = 0;
  while (count < many) {

    const r = random(mapHeight - 1) + 1;
    const c = random(mapWidth  - 1) + 1;

    const pos = r * mapWidth + c;
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

function initWorld() {
  map = new Uint32Array(mapBuffer);
  mapFlags = new Uint8Array(mapArea);
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

  place(kSymDiamond,   0,     kSymDirt,  InitDiamonds);
  place(kSymWall,      0,     kSymDirt,  InitWalls);
  place(kSymRock,      0,     kSymDirt,  InitRocks);
  place(kSymGuard,     kUp,   kSymSpace, InitGuards);
  place(kSymButterfly, kDown, kSymSpace, InitButterflies);
  place(kSymAmoeba,    0,     kSymDirt,  InitAmoebas);
  place(kSymMagicWall, 0,     kSymDirt,  InitMWalls);

  //
  // Place the players in the upper left and upper right
  //
  const playerStartPositions = [
    mapWidth + 1,
    mapWidth * 2 - 2,
  ];

  //
  // Draw and init both players
  //
  for (let i = 0; i < numPlayers; i++) {
    const pos = playerStartPositions[i];
    players.push({
      pos,
      dead: false,
      score: 0,
      pushTurns: 0,  // # of turns rocks have been pushed
      pushDelay: 0,  // Rock Delay, number of times rock must be pushed.
    });
    map[pos] = kSymDirtFace;
  }
}

function explode() {
  while (explosionStack.length > 0) {
    const explosion = explosionStack.pop();
    const sym = explosion.sym;
    let pos = explosion.pos;
    for (let y = 0; y < 3; y++) {
      for (let i = pos; i <= pos + 2; i++) {
        if (map[i] !== kSymBorder) {
          map[i] = sym;
        }
      }
      pos += mapWidth;
    }
  }
}

function addExplosion(sym, pos) {
  explosionStack.push({sym: sym === kSymButterfly ? kSymDiamondExplode : kSymSpaceExplode, pos});
}

function doAmoeba(pos) {
  amoebaCount++;
  if (amoebaChangeSym === 0) {
    let dir = random(256) & kMoveBits;
    const oldDir = dir;
    do {
      const newPos = pos + directionMapOffset[dir];
      if (map[newPos] === kSymSpace ||
          map[newPos] === kSymDirt) {

        amoebaGrowFlag = true;
        if (random(256) < kAmoebaGrowthRate) {
          mapFlags[newPos] |= kMoved;
          if (dir === kUp || dir === kLeft) {
            mapFlags[newPos] &= kUnmoved;
          }
          map[newPos] = kSymAmoeba;
          return;
        }
      }
      dir = (dir + 1) & kMoveBits;
    } while (dir !== oldDir);
  } else {
    map[pos] = amoebaChangeSym;
    mapFlags[pos] = 0;
  }
}

function doMineral(pos, minSym) {
  const leftDownOffset = mapWidth - 1;
  const rightDownOffset = mapWidth + 1;

  const leftDownSym = map[pos + leftDownOffset];
  const downSym  = map[pos + mapWidth];
  const rightDownSym = map[pos + rightDownOffset];
  const leftSym  = map[pos - 1];
  const rightSym  = map[pos + 1];

  if (downSym >= kSymMagicWall || downSym === kSymSpace) {
    if (downSym === kSymSpace) {
      map[pos] = kSymSpace;
      const newPos = pos + mapWidth;
      map[newPos] = minSym;
      mapFlags[newPos] = mapFlags[pos] | kFall | kMoved;
    } else if ((mapFlags[pos] & kFall) && downSym === kSymMagicWall) {
      let sym = kSymSpace;

      if (!magicFlag) {
        magicFlag = true;
      }

      const newPos = pos + mapWidth * 2;
      if (magicTime && map[newPos] === kSymSpace) {
        switch (minSym) {
          case kSymEgg:     sym = kSymGuard;    break;
          case kSymDiamond: sym = kSymRock;     break;
          case kSymRock:    sym = kSymDiamond;  break;
        }
      }
      map[pos] = kSymSpace;

      if (sym !== kSymSpace) {
        map[newPos] = sym;
        mapFlags[newPos] = mapFlags[pos] | kFall | kMoved;
      }
    } else {
      if (leftDownSym === kSymSpace && leftSym === kSymSpace) {
        map[pos] = kSymSpace;
        const newPos = pos - 1;
        map[newPos] = minSym;
        mapFlags[newPos] = mapFlags[pos] | kFall;
      } else if (rightDownSym === kSymSpace && rightSym === kSymSpace) {
        map[pos] = kSymSpace;
        const newPos = pos + 1;
        map[newPos] = minSym;
        mapFlags[newPos] = mapFlags[pos] | kFall | kMoved;
      } else {
        mapFlags[pos] &= kUnFall;
      }
    }
  } else if ((mapFlags[pos] & kFall) && downSym >= kSymDirtFace && downSym <= kSymGuard) {
    addExplosion(downSym, pos - 1);
  } else {
    mapFlags[pos] &= kUnFall;
  }
}

function doEnemy(pos, sym, searchDirection) {
  const scan = -searchDirection;
  let dir  = (mapFlags[pos] + searchDirection) & kMoveBits;

  for (let i = 0; i < 2; i++) {
    const newPos = pos + directionMapOffset[dir];
    if (map[newPos] === kSymSpace) {
      map[pos] = kSymSpace;
      mapFlags[newPos] = dir | kMoved;
      if (dir === kUp || dir === kLeft) {
        mapFlags[newPos] &= kUnmoved;
      }
      map[newPos] = sym;
      return;
    } else if ((map[newPos] === kSymDirtFace ||
                map[newPos] === kSymDirtFaceRight ||
                map[newPos] === kSymDirtFaceLeft) ||
                map[newPos] === kSymAmoeba ||
               ((mapFlags[newPos] & kFall) && dir === 0)) {
      addExplosion(sym, pos - (mapWidth + 1));
      return;
    }
    dir = (dir + scan) & kMoveBits;
  }

  mapFlags[pos] = dir;
}

function makeDoEnemyFn(searchDirection) {
  return function(pos, sym) {
    doEnemy(pos, sym, searchDirection);
  };
}

function doEgg(pos) {
  if (!(mapFlags[pos] & kFall)) {
    mapFlags[pos] += 1;
  }

  const age = mapFlags[pos] & kEggTime;
  if (age === kAgeWiggle) {
    map[pos] = kSymEggWiggle;
  } else if (age === kAgeCrack) {
    map[pos] = kSymEggHatch;
  } else if (age >= kAgeHatch) {
    map[pos] = kSymButterfly;
  }

  const sym = map[pos];
  if (sym !== kSymButterfly) {
    doMineral(pos, sym);
  }
}

function doExplode(pos) {
  map[pos] += 1;
}

function doDiamondExplode(pos) {
  map[pos] = kSymEgg;
}

function doSpaceExplode(pos) {
  map[pos] = kSymSpace;
}

const tileFnMap = new Map([
  [ kSymRock,            doMineral              ],
  [ kSymDiamond,         doMineral              ],
  [ kSymGuard,           makeDoEnemyFn(kCCWise) ],
  [ kSymButterfly,       makeDoEnemyFn(kCWise)  ],
  [ kSymEgg,             doEgg                  ],
  [ kSymEggWiggle,       doEgg                  ],
  [ kSymEggHatch,        doEgg                  ],
  [ kSymEggOpen,         doEgg                  ],
  [ kSymAmoeba,          doAmoeba               ],
  [ kSymDiamondExplode,  doExplode              ],
  [ kSymSpaceExplode,    doExplode              ],
  [ kSymDiamondExplode2, doDiamondExplode       ],
  [ kSymSpaceExplode2,   doSpaceExplode         ],
]);

function nextGen() {
  amoebaCount = 0;
  amoebaGrowFlag   = false;

  for (let si = 0; si < map.length; ++si) {
    const flags = mapFlags[si];
    if (flags & kMoved) {
      mapFlags[si] &= kUnmoved;
    } else {
      const sym = map[si];
      const fn = tileFnMap.get(sym);
      if (fn) {
        fn(si, sym);
      }
    }
  }

  if (!amoebaGrowFlag) {
    amoebaChangeSym = kSymDiamond;
  } else if (amoebaCount >= MaxAmoebas) {
    amoebaChangeSym = amoebaMorph;
  }
}

function addScore(points, playerNdx) {
  // TODO: add some effect
  players[playerNdx].score += points;
}

function dirtFace(playerNdx) {
  const player = players[playerNdx];
  const input = player.input;
  let dirtFacePos = player.pos;
  let newOffset = 0;
  let dfSym = kSymDirtFaceRight;
  if (input & kRightBit) {
     newOffset =     1; dfSym = kSymDirtFaceRight;
  }
  if (input & kLeftBit) {
     newOffset =    -1; dfSym = kSymDirtFaceLeft;
  }
  if (input & kDownBit) {
     newOffset =  mapWidth;
  }
  if (input & kUpBit) {
     newOffset = -mapWidth;
  }

  map[dirtFacePos] = dfSym;

  if (input === 0) {                    // nothing pressed
    map[dirtFacePos] = kSymDirtFace;
  }

  const newPos = dirtFacePos + newOffset;      // new position
  const c  = map[newPos];  // Chr at new position

  if (c === kSymDiamond) {
    addScore(100, playerNdx);
  }
  if (c <= kSymEgg && c >= kSymEggOpen) {
    addScore(10, playerNdx);
  }
  if (c === kSymDirt) {
    addScore(1, playerNdx);
  }

  if (input & kFireBit) {  // Fire Button, should be using better routines.
    if (c === kSymDirt || c === kSymDiamond || (c >= kSymEgg && c <= kSymEggHatch)) {
      map[newPos] = kSymSpace;
    }
  } else if (c === kSymDirt || c === kSymSpace || c === kSymDiamond || (c >= kSymEgg && c <= kSymEggHatch)) {

    // move Dirt Face
    map[dirtFacePos] = kSymSpace;
    dirtFacePos = newPos;
    map[dirtFacePos] = dfSym;

  } else if (map[newPos] === kSymRock && (newOffset !== -mapWidth)) {

    // push rocks
    if (player.pushDelay === newOffset) {
      player.pushTurns--;
      if (player.pushTurns === 0) {
       // move rock
        let q = newPos;
        do {
          q += newOffset;
          if (map[q - mapWidth] === kSymRock) {
            q = 0;
          }
        } while (map[q] === kSymRock && q !== 0);

        if (q !== 0 && map[q] === kSymSpace) {
          map[dirtFacePos] = kSymSpace;
          dirtFacePos = newPos;
          map[dirtFacePos] = dfSym;
          map[q] = kSymRock;
        }

        player.pushDelay = 0;
      }
    } else { // start pushing rocks
      player.pushTurns = 0;
      let q = newPos;
      do {
        q += newOffset;
        player.pushTurns++;
      } while (map[q] === kSymRock && map[q - mapWidth] !== kSymRock);

      if (map[q] !== kSymSpace) {
        player.pushDelay = 0;  // can't push
      } else {
        player.pushDelay = newOffset;  // can push
      }
    }
  }
  player.pos = dirtFacePos;
}

function initGame() {
  explosionStack.length = 0;    // init explosion stack

  magicTime = 400;
  magicFlag = false;

  directionMapOffset[0] = -mapWidth;
  directionMapOffset[1] = 1;
  directionMapOffset[2] = mapWidth;
  directionMapOffset[3] = -1;
}

initGame();
initWorld();

const keyState = new Map();
window.addEventListener('keydown', e => {
  // console.log(e.code);
  keyState.set(e.code, true);
});
window.addEventListener('keyup', e => {
  keyState.set(e.code, false);
});

/*
const ctx = document.querySelector('#twoD').getContext('2d');
function draw() {
  ctx.canvas.width = ctx.canvas.clientWidth * devicePixelRatio;
  ctx.canvas.height = ctx.canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = '16px monospace';
  const tileSize = 16;
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
*/

const frameRate = 1 / 10;
let then = 0;
let delay = 0;
function process(now) {
  now *= 0.001;
  const deltaTime = Math.min(now - then, 0.1);
  then = now;

  delay -= deltaTime;
  while (delay <= 0) {
    delay += frameRate;

    players[0].input =
        (keyState.get('KeyW')      ? kUpBit    : 0) |
        (keyState.get('KeyS')      ? kDownBit  : 0) |
        (keyState.get('KeyA')      ? kLeftBit  : 0) |
        (keyState.get('KeyD')      ? kRightBit : 0) |
        (keyState.get('ShiftLeft') ? kFireBit  : 0);
    players[1].input =
        (keyState.get('ArrowUp')    ? kUpBit    : 0) |
        (keyState.get('ArrowDown')  ? kDownBit  : 0) |
        (keyState.get('ArrowLeft')  ? kLeftBit  : 0) |
        (keyState.get('ArrowRight') ? kRightBit : 0) |
        (keyState.get('ShiftRight') ? kFireBit  : 0);

    nextGen();
    explode();
    if (magicFlag & magicTime > 0) {
      --magicTime;
      symbolToCharMap.set(
          kSymMagicWall,
          magicTime
              ? magicWallAnim[magicTime % magicWallAnim.length]
              : kCharPostMagicWall);
    }

    for (let i = 0; i < numPlayers; i++) {
      const player = players[i];
      const newPos = player.pos;
      if (map[newPos] >= kSymDirtFace &&
          map[newPos] <= kSymDirtFaceLeft &&
          player.dead === false) {
        dirtFace(i);
      } else {
        player.dead = true;
      }
    }

    // draw();
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    tilemap.uploadTilemap(gl);
    tileDrawOptions.canvasWidth = gl.canvas.width;
    tileDrawOptions.canvasHeight = gl.canvas.height;
    tilemap.draw(gl, tileDrawOptions);
  }

  requestAnimationFrame(process);
}
requestAnimationFrame(process);