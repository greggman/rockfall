/* eslint-env browser */

const map = [];
const mapStatus = [];

const kSymSpace  =  32;    // space
const kSymBorder =  97;    // border
const kSymDirt   =  98;    // dirt
const kSymDirtFace   =  99;    // Dirty E. Face
const kSymDirtFaceRight  = 100;    // Dirty E. Face
const kSymDirtFaceLeft  = 101;    // Dirty E. Face
const kSymButterfly   = 102;    // butterfly
const kSymGuard  = 103;    // guardian
const kSymDiamondExplode  = 104;    // diamond explosion
const kSymDiamondExplode2 = 105;    // diamond explosion
const kSymSpaceExplode  = 106;    // space explosion
const kSymSpaceExplode2 = 107;    // space explosion
const kSymAmoeba  = 108;    // amoeba
const kSymMagicWall  = 109;    // magic wall
const kSymEgg  = 110;    // monster egg
const kSymEggWiggle   = 111;    // egg wiggle
const kSymEggHatch   = 112;    // egg hatch
const kSymEggOpen   = 113;    // egg opening
const kSymWall   = 120;    // wall
const kSymDiamond   = 121;    // diamond
const kSymRock   = 122;    // rock

const kAgeWiggle   = 50;      // time till egg wiggles
const kAgeCrack  = 58;       // time till egg cracks
const kAgeHatch  = 61;

const kMoved  = 128;    // Status value when moved
const kUnmoved  = 127;
const kFall   = 64;     // added to status when falling
const kUnFall   = 191;    // Status value when FALLING
const kEggTime  = 63;
const kMoveBits = 3;
const kUp     = 0;
const kRight  = 1;
const kDown   = 2;
const kLeft   = 3;

const kUpBit = 1;
const kDownBit = 2;
const kLeftBit = 4;
const kRightBit = 8;
const kFireBit = 16;

const kGrowthRate =  2;
const kCWise      = (-1);
const kCCWise     = 1;

const mapWidth = 80;
const mapHeight = 25;
const mapArea = mapWidth * mapHeight;

let     DFAnm     = kSymDirtFaceRight;     // Dirt Face code
let     GrowFlag  = 0;
let     ChangeSym = 0;
const   NumPlayers = 1;

let     Input;

    // initial # of objects on screen
const  InitAmoebas = 1;        // amoeba
const  InitButterflies  = 5;        // butterflies
const  InitDiamonds  = 10;       // diamonds
const  InitGuards = 3;        // Guards
const  InitRocks  = 280;       // rocks
const  InitWalls  = 0;        // walls
const  InitMWalls = 0;        // magic walls.
let  AmebaCount = 0;
const  MaxAmebas = 100;
const  AmebaMorph = kSymEgg;
let  MagicFlag = false;
let  MagicTime = 250;


const explosionStack = [];            // explosion stack
const DFPos = [];        // Dirt Face's pos.
const Dead = [];        // Dirt Face death flag
const PushT = [];        // # of turns rocks have been pushed
const PushD = [];        // Rock Delay, number of times rock must be pushed.
const Score = [];
const Direction = [];

const symbolToCharMap = new Map([
  [kSymSpace,           ' '],    // space
  [kSymBorder,          '🅱️'],   // border
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
  [kSymMagicWall,       '🌈'],   // magic wall
  [kSymEgg,             '🥚'],   // monster egg
  [kSymEggWiggle,       '🍆'],   // egg wiggle
  [kSymEggHatch,        '🐣'],   // egg hatch
  [kSymEggOpen,         '🥥'],   // egg opening
  [kSymWall,            '🏨'],   // wall
  [kSymDiamond,         '💎'],   // diamond
  [kSymRock,            '🪨'],   // rock
]);

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
  //
  // Fill the map with dirt.
  //
  for (let i = 0; i < mapArea; i++) {
    map[i]  = kSymDirt;
    mapStatus[i] = {flags: 0, extra: 0};
  }

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

  place(kSymDiamond,  0,  kSymDirt,  InitDiamonds);
  place(kSymWall,  0,  kSymDirt,  InitWalls);
  place(kSymRock,  0,  kSymDirt,  InitRocks);
  place(kSymGuard, kUp,   kSymSpace, InitGuards);
  place(kSymButterfly,  kDown, kSymSpace, InitButterflies);
  place(kSymAmoeba, 0,  kSymDirt,  InitAmoebas);
  place(kSymMagicWall, 0,  kSymDirt,  InitMWalls);

  //
  // Place the players in the upper left and upper right
  //
  DFPos[0] = mapWidth + 1;
  DFPos[1] = mapWidth * 2 - 2;

  //
  // Draw and init both players
  //
  for (let i = 0; i < NumPlayers; i++) {
    const newPos = DFPos[i];
    map[newPos] = kSymDirtFace;
    Dead[i] = false;
    Score[i] = 0;
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
  AmebaCount++;
  if (ChangeSym === 0) {
    let dir = random(256) & kMoveBits;
    const oldDir = dir;
    do {
      const newPos = pos + Direction[dir];
      if (map[newPos] === kSymSpace ||
          map[newPos] === kSymDirt) {

        GrowFlag = true;
        if (random(256) < kGrowthRate) {
          mapStatus[newPos].flags |= kMoved;
          if (dir === kUp || dir === kLeft) {
            mapStatus[newPos].flags &= kUnmoved;
          }
          map[newPos] = kSymAmoeba;
          return;
        }
      }
      dir = (dir + 1) & kMoveBits;
    } while (dir !== oldDir);
  } else {
    map[pos] = ChangeSym;
    mapStatus[pos].flags = 0;
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
      mapStatus[newPos].flags = mapStatus[pos].flags | kFall | kMoved;
    } else if ((mapStatus[pos].flags & kFall) && downSym === kSymMagicWall) {
      let sym = kSymSpace;

      if (!MagicFlag) {
        MagicFlag = true;
      }

      const newPos = pos + mapWidth * 2;
      if (MagicTime && map[newPos] === kSymSpace) {
        switch (minSym) {
          case kSymEgg:     sym = kSymGuard;    break;
          case kSymDiamond: sym = kSymRock;     break;
          case kSymRock:    sym = kSymDiamond;  break;
        }
      }
      map[pos] = kSymSpace;

      if (sym !== kSymSpace) {
        map[newPos] = sym;
        mapStatus[newPos].flags = mapStatus[pos].flags | kFall | kMoved;
      }
    } else {
      if (leftDownSym === kSymSpace && leftSym === kSymSpace) {
        map[pos] = kSymSpace;
        const newPos = pos - 1;
        map[newPos] = minSym;
        mapStatus[newPos].flags = mapStatus[pos].flags | kFall;
      } else if (rightDownSym === kSymSpace && rightSym === kSymSpace) {
        map[pos] = kSymSpace;
        const newPos = pos + 1;
        map[newPos] = minSym;
        mapStatus[newPos].flags = mapStatus[pos].flags | kFall | kMoved;
      } else {
        mapStatus[pos].flags &= kUnFall;
      }
    }
  } else if ((mapStatus[pos].flags & kFall) && downSym >= kSymDirtFace && downSym <= kSymGuard) {
    addExplosion(downSym, pos - 1);
  } else {
    mapStatus[pos].flags &= kUnFall;
  }
}

function doEnemy(pos, sym, searchDirection) {
  const scan = -searchDirection;
  let dir  = (mapStatus[pos].flags + searchDirection) & kMoveBits;

  for (let i = 0; i < 2; i++) {
    const newPos = pos + Direction[dir];
    if (map[newPos] === kSymSpace) {
      map[pos] = kSymSpace;
      mapStatus[newPos].flags = dir | kMoved;
      if (dir === kUp || dir === kLeft) {
        mapStatus[newPos].flags &= kUnmoved;
      }
      map[newPos] = sym;
      return;
    } else if ((map[newPos] === kSymDirtFace ||
                map[newPos] === kSymDirtFaceRight ||
                map[newPos] === kSymDirtFaceLeft) ||
                map[newPos] === kSymAmoeba ||
               ((mapStatus[newPos].flags & kFall) && dir === 0)) {
      addExplosion(sym, pos - (mapWidth + 1));
      return;
    }
    dir = (dir + scan) & kMoveBits;
  }

  mapStatus[pos].flags = dir;
}

function makeDoEnemyFn(searchDirection) {
  return function(pos, sym) {
    doEnemy(pos, sym, searchDirection);
  };
}

function doEgg(pos) {
  if (!(mapStatus[pos].flags & kFall)) {
    mapStatus[pos].flags += 1;
  }

  const age = mapStatus[pos].flags & kEggTime;
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

const tileTypeInfo = new Map([
  [ kSymRock, { fn: doMineral } ],
  [ kSymDiamond, { fn: doMineral } ],
  [ kSymGuard, { fn: makeDoEnemyFn(kCCWise) } ],
  [ kSymButterfly, { fn: makeDoEnemyFn(kCWise) } ],
  [ kSymEgg, { fn: doEgg } ],
  [ kSymEggWiggle, { fn: doEgg } ],
  [ kSymEggHatch, { fn: doEgg } ],
  [ kSymEggOpen, { fn: doEgg } ],
  [ kSymAmoeba, { fn: doAmoeba } ],
  [ kSymDiamondExplode, { fn: doExplode } ],
  [ kSymSpaceExplode, { fn: doExplode } ],
  [ kSymDiamondExplode2, { fn: doDiamondExplode, }],
  [ kSymSpaceExplode2, { fn: doSpaceExplode, }],
]);

function nextGen() {
  AmebaCount = 0;
  GrowFlag   = false;

  for (let si = 0; si < map.length; ++si) {
    const status = mapStatus[si];
    if (status.flags & kMoved) {
      mapStatus[si].flags &= kUnmoved;
    } else {
      const sym = map[si];
      const tileInfo = tileTypeInfo.get(sym);
      if (tileInfo) {
        const fn = tileInfo.fn;
        if (fn) {
          fn(si, sym);
        }
      }
    }
  }

  if (!GrowFlag) {
    ChangeSym = kSymDiamond;
  } else if (AmebaCount >= MaxAmebas) {
    ChangeSym = AmebaMorph;
  }
}

function addScore(points, playerNdx) {
  Score[playerNdx] = points;
}

function dirtFace(playerNdx) {
  let dirtFacePos = DFPos[playerNdx];
  let newOffset = 0;
  if (Input & kRightBit) {
     newOffset =     1; DFAnm = kSymDirtFaceRight;
  }
  if (Input & kLeftBit) {
     newOffset =    -1; DFAnm = kSymDirtFaceLeft;
  }
  if (Input & kDownBit) {
     newOffset =  mapWidth;
  }
  if (Input & kUpBit) {
     newOffset = -mapWidth;
  }

  map[dirtFacePos] = DFAnm;

  if (Input === 0) {                    // nothing pressed
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

  if (Input & kFireBit) {  // Fire Button, should be using better routines.
    if (c === kSymDirt || c === kSymDiamond || (c >= kSymEgg && c <= kSymEggHatch)) {
      map[newPos] = kSymSpace;
    }
  } else if (c === kSymDirt || c === kSymSpace || c === kSymDiamond || (c >= kSymEgg && c <= kSymEggHatch)) {

    // move Dirt Face
    map[dirtFacePos] = kSymSpace;
    dirtFacePos = newPos;
    map[dirtFacePos] = DFAnm;

  } else if (map[newPos] === kSymRock && (newOffset !== -mapWidth)) {

    // push rocks
    if (PushD[playerNdx] === newOffset) {
      PushT[playerNdx]--;
      if (PushT[playerNdx] === 0) {
       // move rock
        let Q = newPos;
        do {
          Q += newOffset;
          if (map[Q - mapWidth] === kSymRock) {
            Q = 0;
          }
        } while (map[Q] === kSymRock && Q !== 0);

        if (Q !== 0 && map[Q] === kSymSpace) {
          map[dirtFacePos] = kSymSpace;
          dirtFacePos = newPos;
          map[dirtFacePos] = DFAnm;
          map[Q] = kSymRock;
        }

        PushD[playerNdx] = 0;
      }
    } else { // start pushing rocks
      PushT[playerNdx] = 0;
      let Q = newPos;
      do {
        Q += newOffset;
        PushT[playerNdx]++;
      } while (map[Q] === kSymRock && map[Q - mapWidth] !== kSymRock);

      if (map[Q] !== kSymSpace) {
        PushD[playerNdx] = 0;  // can't push
      } else {
        PushD[playerNdx] = newOffset;  // can push
      }
    }
  }
  DFPos[playerNdx] = dirtFacePos;
}

function initGame() {
  explosionStack.length = 0;    //init explosion stack

  MagicTime = 400;
  MagicFlag = false;

  Direction[0] = -mapWidth;
  Direction[1] = 1;
  Direction[2] = mapWidth;
  Direction[3] = -1;
}

initGame();
initWorld();

const keyState = new Map();
window.addEventListener('keydown', e => {
  console.log(e.code);
  keyState.set(e.code, true);
});
window.addEventListener('keyup', e => {
  keyState.set(e.code, false);
});

const ctx = document.querySelector('#playField').getContext('2d');
function draw() {
  ctx.canvas.width = ctx.canvas.clientWidth;
  ctx.canvas.height = ctx.canvas.clientHeight;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = '14px monospace';

  for (let y = 0; y < mapHeight; ++y) {
    for (let x = 0; x < mapWidth; ++x) {
      const xx = x * 16;
      const yy = y * 16 + 16;
      const char = symbolToCharMap.get(map[y * mapWidth + x]) || '-';
      ctx.fillText(char, xx, yy);
    }
  }

  {
    ctx.fillStyle = 'white';
    const y = mapHeight * 16 + 16;
    for (let i = 0; i < NumPlayers; ++i) {
      ctx.fillText(`Player ${i + 1}: ${Score[i]}`, 10, y + i * 16);
    }
  }
}

const frameRate = 1 / 10;
let then = 0;
let delay = 0;
let magicFlag;
let magicTime;
function process(now) {
  now *= 0.001;
  const deltaTime = Math.min(now - then, 0.1);
  then = now;

  delay -= deltaTime;
  while (delay <= 0) {
    delay += frameRate;

    Input =
        ((keyState.get('KeyW')  || keyState.get('ArrowUp')   ) ? kUpBit    : 0) |
        ((keyState.get('KeyS')  || keyState.get('ArrowDown') ) ? kDownBit  : 0) |
        ((keyState.get('KeyA')  || keyState.get('ArrowLeft') ) ? kLeftBit  : 0) |
        ((keyState.get('KeyD')  || keyState.get('ArrowRight')) ? kRightBit : 0) |
        ((keyState.get('Space') || keyState.get('ShiftLeft'))  ? kFireBit  : 0);

    nextGen();
    explode();
    if (magicFlag & magicTime > 0) {
      magicTime = Math.max(0, magicTime - deltaTime);
    }

    for (let i = 0; i < NumPlayers; i++) {
      const newPos = DFPos[i];
      if (map[newPos] >= kSymDirtFace &&
          map[newPos] <= kSymDirtFaceLeft &&
          Dead[i] === false) {
        dirtFace(i);
      } else {
        Dead[i] = true;
      }
    }
    draw();
  }

  requestAnimationFrame(process);
}
requestAnimationFrame(process);