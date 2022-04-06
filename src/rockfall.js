/* eslint-env browser */
import * as twgl from '../3rdParty/twgl-full.module.js';
import {
  kUp,
  kLeft,
} from './directions.js';
import {
  basenameNoExt,
  lerp,
  minMagnitude,
  randInt,
} from './utils.js';
import {
  kSymSpace,
  kSymBorder,
  kSymDirt,
  kSymDirtFace,
  kSymDirtFaceRight,
  kSymDirtFaceLeft,
  kSymButterfly,
  kSymGuard,
  kSymDiamondExplode,
  kSymDiamondExplode2,
  kSymSpaceExplode,
  kSymSpaceExplode2,
  kSymAmoeba,
  kSymMagicWall,
  kSymEgg,
  kSymEggWiggle,
  kSymEggHatch,
  kSymEggOpen,
  kSymDiamond,
  kSymRock,
} from './symbols.js';
import {
  parseTiledLevel,
} from './tiled.js';
import {
  randomLevel,
} from './generate-level.js';
import {
  generateTileTexture,
} from './tile-texture-generator.js';
import TileMap from './tilemap.js';

async function main() {
  const levels = [];


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

  // initial # of objects on screen
  const settings = {
    level: 0,                         // level to use
    amoebas: 1,                       // number of amoebas
    butterflies: 5,                   // number of butterflies
    diamonds: 10,                     // number of diamonds
    guards: 3,                        // number of guardians
    rocks: 280,                       // number of rocks
    walls: 10,                        // number of walls
    magicWalls: 2,                    // number of magic walls
    maxAmoebas: 100,                  // how many amoebas with it turns into eggs
    magicTime: 250,                   // how many ticks the magic walls stay active
    tileSize: 32,                     // size of tiles (note: you can also Cmd/Ctrl +/- in browser)
    scrollRate: 0.0125,               // scroll speed
    diamondPoints: 100,               // points for collecting diamond
    eggPoints: 10,                    // points for collecting egg
    dirtPoints: 1,                    // points for digging dirt
    mapWidth: 80,                     // map width in tiles
    mapHeight: 25,                    // map height in tiles
    frameRate: 1 / 10,                // frame rate in seconds
    playerBoundsWidthPercent: 0.25,   // size of window to keep player inside
    playerBoundsHeightPercent: 0.25,  // size of window to keep player inside
  };
  for (const [k, v] of (new URLSearchParams(window.location.search).entries())) {
    if (settings[k] === undefined) {
      console.error(`unknown setting: ${k}`);
      continue;
    }
    settings[k] = parseFloat(v);
  }

  levels.push({
    name: 'Random',
    level: randomLevel(settings),
  });

  async function loadTiledLevel(url) {
    const res = await fetch(url);
    const data = await res.json();
    const level = parseTiledLevel(data);
    return {
      name: basenameNoExt(url),
      level,
    };
  }

  levels.push(...(await Promise.all([
    'tiled/magic-wall.tmj',
    'tiled/hatchery.tmj',
  ].map(loadTiledLevel))));

  async function loadLevel(file) {
    const data = JSON.parse(await file.text());
    const level = parseTiledLevel(data);
    startLevel(level);
  }

  const gl = document.querySelector('#playField').getContext('webgl2');
  const scoreElem = document.querySelector('#score');
  const loadingElem = document.querySelector('#loading');
  loadingElem.style.display = 'none';

  const keyState = new Map();
  window.addEventListener('keydown', e => {
    // console.log(e.code);
    keyState.set(e.code, true);
  });
  window.addEventListener('keyup', e => {
    keyState.set(e.code, false);
  });

  const tileSize = settings.tileSize;
  const tilesAcross = 32;
  const tilesDown = 32;
  function makeTileTexture(gl) {
    const canvas = generateTileTexture(tilesAcross, tilesDown, tileSize);
    // document.body.appendChild(canvas);
    return twgl.createTexture(gl, {
      src: canvas,
      minMag: gl.NEAREST,
    });
  }

  const level = levels[settings.level].level;
  let processFn = () => {};

  startLevel(level);

  function startLevel(level) {
    const mapWidth = level.mapWidth;
    const mapHeight = level.mapHeight;
    const map = level.map.slice();
    const mapFlags = level.mapFlags.slice();

    let     amoebaGrowFlag  = 0;
    let     amoebaChangeSym = 0;
    const   numPlayers = 2;

    let  amoebaCount = 0;
    const  amoebaMorph = kSymEgg; // what the amoeba changes into if it grows to MaxAmoebas

    let  magicFlag = false;
    let  magicTime = settings.magicTime;

    const explosionStack = [];
    const players = [];

    const directionMapOffset = [];        // offset to map pos in direction

    /*
        +-map
        V
        +----------------------------+
        |                            |
        |    +-screen                |
        |    v                       |
        |    +---------+             |
        |    |         |             |
        |    |   +-play|er bounds    |
        |    |   V     |             |
        |    |   +--+  |             |
        |    |   |  |  |             |
        |    |   +--+  |             |
        |    |         |             |
        |    |         |             |
        |    +---------+             |
        |                            |
        +----------------------------+
    */
    function computeTargetScrollPosition(gl, scrollX, scrollY, playerPos) {
        const mapWidthPixels = mapWidth * tileSize;
        const mapHeightPixels = mapHeight * tileSize;
        const screenWidthPixels = gl.drawingBufferWidth;
        const screenHeightPixels = gl.drawingBufferHeight;

        const maxRight = mapWidthPixels - screenWidthPixels;
        const maxBottom = mapHeightPixels - screenHeightPixels;

        // could use an invisible div for this then could use CSS to set
        // so like border/margin etc.
        const playerBoundsX = scrollX + screenWidthPixels * 0.5 - screenWidthPixels * settings.playerBoundsWidthPercent * 0.5;
        const playerBoundsY = scrollY + screenHeightPixels * 0.5 - screenHeightPixels * settings.playerBoundsHeightPercent * 0.5;
        const playerBoundsWidth = screenWidthPixels * settings.playerBoundsWidthPercent;
        const playerBoundsHeight = screenHeightPixels * settings.playerBoundsHeightPercent;
        const playerBoundsRight = playerBoundsX + playerBoundsWidth;
        const playerBoundsBottom = playerBoundsY + playerBoundsHeight;

        const px = (playerPos % mapWidth) * tileSize;
        const py = (playerPos / mapWidth | 0) * tileSize;

        let targetX = scrollX;
        let targetY = scrollY;

        if (px < playerBoundsX) {
          const off = playerBoundsX - px;
          if (off > 0) {
            targetX -= off;
          }
        }
        if (py < playerBoundsY) {
          const off = playerBoundsY - py;
          if (off > 0) {
            targetY -= off;
          }
        }
        if (px >= playerBoundsRight) {
          const off = px - playerBoundsRight;
          if (off > 0) {
            targetX += px - playerBoundsRight;
          }
        }
        if (py >= playerBoundsBottom) {
          const off = py - playerBoundsBottom;
          if (off > 0) {
            targetY += py - playerBoundsBottom;
          }
        }

        targetX = Math.min(Math.max(0, targetX), maxRight);
        targetY = Math.min(Math.max(0, targetY), maxBottom);
        targetX /= tileSize;
        targetY /= tileSize;

        return [targetX, targetY];
    }

    const tilesetTexture = makeTileTexture(gl);
    const mapAsUint8 = new Uint8Array(map.buffer);

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

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    let [scrollX, scrollY] = computeTargetScrollPosition(gl, 1000000, 1000000);

    const tileDrawOptions = {
      x: 0,
      y: 0,
      width:  mapWidth  * tileSize,
      height: mapHeight * tileSize,
      canvasWidth: 0, //this.canvas.width,
      canvasHeight: 0, //this.canvas.height,
      scrollX,
      scrollY,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      originX: 0,
      originY: 0,
    };

    function initWorld() {
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
        addScore(0, i);
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
        let dir = randInt(256) & kMoveBits;
        const oldDir = dir;
        do {
          const newPos = pos + directionMapOffset[dir];
          if (map[newPos] === kSymSpace ||
              map[newPos] === kSymDirt) {

            amoebaGrowFlag = true;
            if (randInt(256) < kAmoebaGrowthRate) {
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
      } else if (amoebaCount >= settings.maxAmoebas) {
        amoebaChangeSym = amoebaMorph;
      }
    }

    function addScore(points, playerNdx) {
      // TODO: add some effect
      players[playerNdx].score += points;
      scoreElem.textContent = players[0].score.toString().padStart(6, '0');
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
        addScore(settings.diamondPoints, playerNdx);
      }
      if (c <= kSymEgg && c >= kSymEggOpen) {
        addScore(settings.eggPoints, playerNdx);
      }
      if (c === kSymDirt) {
        addScore(settings.dirtPoints, playerNdx);
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

      magicTime = settings.magicTime;
      magicFlag = false;

      directionMapOffset[0] = -mapWidth;
      directionMapOffset[1] = 1;
      directionMapOffset[2] = mapWidth;
      directionMapOffset[3] = -1;
    }

    initGame();
    initWorld();

    let then = 0;
    let delay = 0;
    function process(now) {
      now *= 0.001;
      const deltaTime = Math.min(now - then, 0.1);
      then = now;

      delay -= deltaTime;
      while (delay <= 0) {
        delay += settings.frameRate;

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
      }

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      tilemap.uploadTilemap(gl);

      {
        const player = players[0];
        const [targetX, targetY] = computeTargetScrollPosition(gl, scrollX, scrollY, player.pos);
        const screenWidthPixels = gl.drawingBufferWidth;
        const screenHeightPixels = gl.drawingBufferHeight;

        tileDrawOptions.canvasWidth = screenWidthPixels;
        tileDrawOptions.canvasHeight = screenHeightPixels;

        const targetScrollX = lerp(scrollX, targetX, settings.scrollRate);
        const targetScrollY = lerp(scrollY, targetY, settings.scrollRate);

        const tilesPerTick = 1 / settings.frameRate;
        const maxSpeed = tilesPerTick / 60;
        const deltaX = minMagnitude(targetScrollX - scrollX, maxSpeed);
        const deltaY = minMagnitude(targetScrollY - scrollY, maxSpeed);

        scrollX += deltaX;
        scrollY += deltaY;

        tileDrawOptions.x = scrollX < 0 ? -scrollX * tileSize * 0.5 : 0;
        tileDrawOptions.y = scrollY < 0 ? -scrollY * tileSize * 0.5 : 0;

        tileDrawOptions.scrollX = (Math.max(0, scrollX) * tileSize | 0) / tileSize;
        tileDrawOptions.scrollY = (Math.max(0, scrollY) * tileSize | 0) / tileSize;
        tilemap.draw(gl, tileDrawOptions);
      }
    }

    processFn = process;

  }

  function process(now) {
    processFn(now);
    requestAnimationFrame(process);
  }
  requestAnimationFrame(process);

  const dropElem = gl.canvas;
  function getFirstFile(ev) {
    if (ev.dataTransfer.items) {
      const items = [...ev.dataTransfer.items].filter(item => item.kind === 'file');
      if (items.length) {
        return items[0].getAsFile();
      }
    } else {
      return ev.dataTransfer.files[0];
    }
    return undefined;
  }

  function dropHandler(ev) {
    ev.preventDefault();
    dropElem.classList.remove('dragging');

    const file = getFirstFile(ev);
    if (file) {
      loadLevel(file);
    }
  }

  function dragoverHandler(ev) {
    ev.preventDefault();
  }

  function dragenterHandler(/*ev*/) {
    dropElem.classList.add('dragging');
    dropElem.style.display = '';
  }

  function dragleaveHandler(/*ev*/) {
    dropElem.classList.remove('dragging');
  }

  dropElem.addEventListener('drop', dropHandler);
  dropElem.addEventListener('dragover', dragoverHandler);
  dropElem.addEventListener('dragenter', dragenterHandler);
  dropElem.addEventListener('dragleave', dragleaveHandler);
}

main();