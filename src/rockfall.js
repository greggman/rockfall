/* eslint-env browser */
import * as twgl from '../3rdParty/twgl-full.module.js';
import {
  clearDebugText,
  ctx as debugCtx,
  init as initDebug,
  setDebugText,
} from './debug.js';
import {
  kUp,
  kLeft,
} from './directions.js';
import {
  GamepadManager,
} from './gamepad.js';
import {
  randomLevel,
} from './generate-level.js';
import {
  kUpBit,
  kDownBit,
  kLeftBit,
  kRightBit,
  kFireBit,
} from './input.js';
import {
  initKeyboard,
} from './keyboard.js';
import {
  tutorialLevelPaths,
  levelPaths,
 } from './levels.js';
import {
  init as initSounds,
  sounds,
  playSound,
} from './sounds.js';
import {
  kSymSpace,
  kSymBorder,
  kSymDirt,
  kSymDirtFace,
  kSymDirtFaceUp,
  kSymDirtFaceDown,
  kSymDirtFaceRight,
  kSymDirtFaceLeft,
  kSymButterfly,
  kSymGuard,
  kSymSideWalker,
  kSymPatroller,
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
  kSymBomb,
  kSymBombTriggered,
  kSymExit,
  kSymOpenExit,
  kSymWall,
  kSymDoor,
  kSymBalloon,
  kSymSpike,
  kSymFire,
  symDirtFaceSet,
  symRockFallSet,
  symExplodeFromRockSet,
  symOpenToPlayerSet,
  symPushableSet,
  symEnemyKillsSet,
  symBurnableSet,
} from './symbols.js';
import {
  generateTileTexture,
} from './tile-texture-generator.js';
import {
  parseTiledLevel,
} from './tiled.js';
import TileMap from './tilemap.js';
import {
  initTouch,
} from './touch.js';
import {
  applyQuerySettings,
  basenameNoExt,
  clamp,
  lerp,
  minMagnitude,
  mixArray,
  rand,
  randInt,
  snorm32,
} from './utils.js';

async function main() {
  const levels = [];
  const gamepadManager = new GamepadManager();

  const kAgeWiggle = 50;    // time till egg wiggles
  const kAgeCrack  = 58;    // time till egg cracks
  const kAgeHatch  = 61;

  // status flags bits
  const kMoved    = 128;    // Status value when moved
  const kUnmoved  = 127;
  const kFall     = 64;     // added to status when falling
  const kUnFall   = 191;    // Status value when FALLING
  const kEggTime  = 63;
  const kFireTime = 63;
  const kMoveBits = 3;

  const kCWise      = -1;
  const kCCWise     =  1;

  // initial # of objects on screen
  const settings = {
    level: 't1',                      // level to use
    seed: 0,                          // seed for random level
    amoebas: 1,                       // number of amoebas
    butterflies: 5,                   // number of butterflies
    diamonds: 15,                     // number of diamonds
    guards: 3,                        // number of guardians
    rocks: 280,                       // number of rocks
    walls: 10,                        // number of walls
    magicWalls: 2,                    // number of magic walls
    fire: 0,                          // number of fire
    maxAmoebas: 100,                  // how many amoebas with it turns into eggs
    amoebaGrowthRate: 200,            // lower is faster
    amoebaMinTicksToGrow: 100,        // Force the amoeba to grow within this many ticks
    fireSpreadRate: 10,               // lower is faster
    maxFireAge: 40,                   // Frames when fire dies (must be less than 63)
    magicTime: 250,                   // how many ticks the magic walls stay active,
    tileSize: 32,                     // size of tiles (note: you can also Cmd/Ctrl +/- in browser)
    scrollRate: 0.0125,               // scroll speed
    diamondPoints: 100,               // points for collecting diamond
    eggPoints: 10,                    // points for collecting egg
    dirtPoints: 1,                    // points for digging dirt
    mapWidth: 80,                     // map width in tiles
    mapHeight: 25,                    // map height in tiles
    frameRate: 1 / 10,                // frame rate in seconds
    timeLimit: 1500,                  // time limit in seconds
    colorVariation: 1,                // color variation multiplier. Set to 0 for no variation.
    playerBoundsWidthPercent: 0.125,  // size of window to keep player inside
    playerBoundsHeightPercent: 0.125, // size of window to keep player inside
    requiredCount: 15,                // required count (eggs + diamonds)
    endDuration: 3,                   // time until reset after level ends
    canPushWithRocksAbove: true,      // can push with rocks above.
    maxPushRocks: 100000,             // max rocks that can be pushed
    pushTurnsPerRock: 1,              // turns per rock to push (set to 0 for same speed regardless of number of rocks)
    minRockPushTurns: 1,              // number of turns until you can start pushing rocks (set to 0 for instant)
    showTiles: false,                 // So we can save a new .png
    testSounds: false,                // Test the sounds
    debugScrolling: false,
    debugTouch: false,
  };
  function randomizeLevel0() {
    settings.seed = randInt(0x7FFFFFFF);
  }
  randomizeLevel0();

  const g_settings = settings;
  applyQuerySettings(settings);

  // Per symbol, how much to adjust hue, saturation, value.
  // a single number will by -v/+v, An array of 2 numbers
  // specifies min,max
  const colorRanges = new Map([
    [kSymDirt,       [0.02, [-0.1, -0.2], [0.1, 0.2]]],
    [kSymButterfly,  [0.1 , 0.0, 0.0]],
    [kSymGuard,      [0.2 , 0.2, 0.2]],
    [kSymPatroller,  [[0.0, 0.2] , 0.2, 0.0]],
    [kSymSideWalker, [0.05, 0.2, 0.2]],
    [kSymRock,       [0.04, 0.1, 0.1]],
    [kSymAmoeba,     [0.1,  0.1, 0.1]],
    [kSymWall,       [0,    0, [-0.6, -0.7]]],
    [kSymFire,       [0.05, 0.0, 0.0]],
  ]);

  function getColorForSym(sym) {
    const ranges = colorRanges.get(sym);
    return ranges ? snorm32(...ranges.map(v => {
      const [min, max] = Array.isArray(v) ? v : [-v, v];
      return rand(min, max) * settings.colorVariation;
    }), 0) : 0;
  }

  function prepTiledLevel(data, url) {
    const level = parseTiledLevel(data, url);
    const {name, author, license} = level.settings;
    const fullName = `${name}(${license ? `${license}` : 'CC-BY'})${author ? ` by: ${author}` : ''}`;
    return {
      name: fullName,
      filename: basenameNoExt(url),
      level,
    };
  }

  async function loadTiledLevel(url) {
    const res = await fetch(url);
    const data = await res.json();
    return prepTiledLevel(data, url);
  }

  levels.push(...(await Promise.all([...tutorialLevelPaths, ...levelPaths].map(loadTiledLevel))));
  const randomLevelNdx = tutorialLevelPaths.length;
  levels.splice(randomLevelNdx, 0, {
    name: 'Random',
    filename: 'random',
    level: randomLevel(settings),
  });

  const levelFilenameToIndex = filename => levels.findIndex(lvl => lvl.filename === filename);

  {
    let ndx = levelFilenameToIndex(settings.level);
    if (ndx < 0) {
      ndx = parseInt(settings.level);
      if (Number.isNaN(ndx)) {
        ndx = 0;
      }
    }
    settings.level = levels[ndx].filename;
  }

  async function loadLevel(file) {
    const data = JSON.parse(await file.text());
    const level = prepTiledLevel(data, file.name);
    const ndx = levels.findIndex(l => l.filename === level.filename);
    if (ndx >= 0) {
      levels.splice(ndx, 1);
    }
    levels.push(level);
    settings.level = level.filename;
    updateLevelSelection();
    restart();
  }

  if (settings.testSounds) {
    const parent = document.createElement('div');
    parent.style.position = 'absolute';
    parent.style.left = '0';
    parent.style.top = '0';
    document.body.appendChild(parent);
    for (const id of Object.keys(sounds)) {
      const elem = document.createElement('button');
      elem.type = 'button';
      elem.textContent = id;
      elem.addEventListener('click', () => {
        console.log(id);
        playSound(id);
      });
      parent.appendChild(elem);
    }
  }

  const gl = document.querySelector('#playField').getContext('webgl2', {alpha: false});
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  const restartElem = document.querySelector('#restart');
  const scoreElem = document.querySelector('#score');
  const splashElem = document.querySelector('#splash');
  const loadingElem = document.querySelector('#loading');
  const nameElem = document.querySelector('#name');
  const goalElem = document.querySelector('#goal');
  const timeElem = document.querySelector('#time');
  const dieElem = document.querySelector('#die');
  const startElem = document.querySelector('#start');
  const levelNameElem = document.querySelector('#level-name');
  const levelDescElem = document.querySelector('#level-description');

  startElem.addEventListener('animationend', () => {
    startElem.classList.remove('slide-in-out');
    startElem.classList.add('slide-off');
  });

  let processFn = () => {};
  let killPlayerFn = () => {};

  initDebug(settings);

  const restart = () => {
    setLevelByFilename(settings.level);
  };

  const restartAndRandomize = () => {
    randomizeLevel0();
    restart();
  };

  function setLevelByFilename(filename) {
    setLevelByIndex(levelFilenameToIndex(filename));
  }

  function setLevelByIndex(ndx) {
    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);
    params.set('level', levels[ndx].filename);
    params.delete('seed');
    if (ndx === randomLevelNdx) {
      params.set('seed', settings.seed);
    }
    url.search = params.toString();
    window.history.replaceState({}, '', url.toString());
    settings.level = levels[ndx].filename;
    if (ndx === randomLevelNdx) {
      levels[randomLevelNdx].level = randomLevel(settings);
    }
    startLevel(levels[ndx]);
  }

  restartElem.addEventListener('click', restartAndRandomize);
  scoreElem.addEventListener('click', restartAndRandomize);
  timeElem.addEventListener('click', restartAndRandomize);
  dieElem.addEventListener('click', () => killPlayerFn());

  loadingElem.style.display = 'none';
  const hideSplash = () => {
    initSounds();
    splashElem.style.display = 'none';
  };
  function hideSplashOnUseGesture() {
    window.removeEventListener('keydown', hideSplashOnUseGesture, {once: true});
    hideSplash();
    restart();
  }
  splashElem.addEventListener('click', hideSplashOnUseGesture);
  window.addEventListener('keydown', hideSplashOnUseGesture, {once: true});

  const getTouchBits = initTouch(gl.canvas, settings);
  const getKeyBits = initKeyboard(window);

  const tileSize = settings.tileSize;
  const tilesAcross = 32;
  const tilesDown = 32;
  let tileTexture32x32;
  function makeTileTexture(gl) {
    if (!settings.showTiles && settings.tileSize === 32) {
      if (!tileTexture32x32) {
        tileTexture32x32 = twgl.createTexture(gl, {
          src: 'tiled/rockfall-tiles.png',
          minMag: gl.NEAREST,
        });
      }
      return tileTexture32x32;
    }
    const canvas = generateTileTexture(tilesAcross, tilesDown, tileSize);
    if (settings.showTiles) {
      document.body.appendChild(canvas);
    }
    return twgl.createTexture(gl, {
      src: canvas,
      minMag: gl.NEAREST,
    });
  }

  function updateLevelSelection() {
    const selectElem = document.createElement('select');
    nameElem.innerHTML = '';
    nameElem.appendChild(selectElem);
    const currentNdx = levelFilenameToIndex(settings.level);
    for (let i = 0; i < levels.length; ++i) {
      const level = levels[i];
      const elem = document.createElement('option');
      elem.textContent = level.name;
      if (i === currentNdx) {
        elem.selected = true;
      }
      selectElem.appendChild(elem);
    }
    selectElem.addEventListener('change', () => {
      const ndx = selectElem.selectedIndex;
      if (ndx === randomLevelNdx) {
        randomizeLevel0();
      }
      setLevelByIndex(ndx);
    });
  }
  updateLevelSelection();

  let magicSound;
  let currentLevel;
  setLevelByFilename(settings.level);

  function startLevel({level}) {
    currentLevel = level;
    updateLevelSelection();
    runLevel();
  }

  function runLevel() {
    const level = currentLevel;
    const mapWidth = level.mapWidth;
    const mapHeight = level.mapHeight;
    const map = level.map.slice();
    const mapFlags = level.mapFlags.slice();
    const mapColors = new Uint32Array(map.length);
    let finished = false;
    let killPlayer = false;
    let ticks = 0;
    let endTimer = 0;

    const settings = {
      ...g_settings,
      ...level.settings,
    };
    applyQuerySettings(settings);

    goalElem.classList.remove('exit-open');
    timeElem.style.color = '';
    startElem.style.display = '';
    levelNameElem.textContent = settings.name || settings.filename;
    levelDescElem.textContent = settings.description || '';
    startElem.classList.remove('slide-off');
    startElem.classList.add('slide-in-out');
    let timeLimitTicks = Math.ceil(settings.timeLimit / settings.frameRate);
    const requiredCount = settings.requiredCount || 1;

    const numCountDigits = (Math.log10(requiredCount) | 0) + 1;
    const updateGoal = (count) => {
      goalElem.textContent = `${count.toString().padStart(numCountDigits, '0')}/${requiredCount.toString().padStart(numCountDigits, '0')}`;
    };

    if (magicSound) {
      magicSound.stop();
      magicSound = undefined;
    }

    const playerStartPositions = [
      mapWidth + 1,
      mapWidth * 2 - 2,
    ];
    const exits = [];

    function setTile(pos, sym, color, flags) {
      map[pos] = sym;
      mapColors[pos] = color === undefined ? getColorForSym(sym) : color;
      if (flags !== undefined) {
        mapFlags[pos] = flags;
      }
    }

    // find starting position
    {
      const starts = [];
      for (let i = 0; i < map.length; ++i) {
        switch (map[i]) {
          case kSymDirtFace:
          case kSymDirtFaceUp:
          case kSymDirtFaceDown:
          case kSymDirtFaceLeft:
          case kSymDirtFaceRight:
            starts.push(i);
            break;
          case kSymExit:
            exits.push(i);
            break;
        }
      }
      if (starts.length) {
        const ndx = randInt(starts.length);
        playerStartPositions[0] = starts[ndx];
        starts.splice(ndx, 1);
        for (const pos of starts) {
          map[pos] = kSymDirt;
        }
      }
      if (!exits.length) {
        const pos = mapWidth * mapHeight - mapWidth - 1;
        map[pos] = kSymExit;
        exits.push(pos);
      }
    }

    let     amoebaGrowFlag  = 0;
    let     amoebaChangeSym = 0;
    let     amoebaTicksSinceLastGrow = 0;
    let     flashTime = 0;
    let     flashDuration = 30;
    let     flashColor;

    const flashScreen = function(duration, color) {
      flashTime = duration;
      flashDuration = duration;
      flashColor = color;
    };

    const   numPlayers = 1;

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
    function computeTargetScrollPosition(gl, scrollTileX, scrollTileY, playerPos) {
      const mapWidthPixels = mapWidth * tileSize;
      const mapHeightPixels = mapHeight * tileSize;
      const screenWidthPixels = gl.drawingBufferWidth;
      const screenHeightPixels = gl.drawingBufferHeight;

      const maxRight = mapWidthPixels - screenWidthPixels;
      const maxBottom = mapHeightPixels - screenHeightPixels;

      // could use an invisible div for this then could use CSS to set
      // so like border/margin etc.
      const playerBoundsX = scrollTileX * tileSize + screenWidthPixels * 0.5 - screenWidthPixels * settings.playerBoundsWidthPercent * 0.5;
      const playerBoundsY = scrollTileY * tileSize + screenHeightPixels * 0.5 - screenHeightPixels * settings.playerBoundsHeightPercent * 0.5;
      const playerBoundsWidth = screenWidthPixels * settings.playerBoundsWidthPercent;
      const playerBoundsHeight = screenHeightPixels * settings.playerBoundsHeightPercent;
      const playerBoundsRight = playerBoundsX + playerBoundsWidth;
      const playerBoundsBottom = playerBoundsY + playerBoundsHeight;

      const px = (playerPos % mapWidth + 0.5) * tileSize;
      const py = ((playerPos / mapWidth | 0) + 0.5) * tileSize;

      let targetX = scrollTileX * tileSize;
      let targetY = scrollTileY * tileSize;

      const newPx = clamp(px, playerBoundsX, playerBoundsRight);
      const newPy = clamp(py, playerBoundsY, playerBoundsBottom);

      const deltaX = px - newPx;
      const deltaY = py - newPy;

      targetX += deltaX;
      targetY += deltaY;

      targetX = Math.min(Math.max(0, targetX), maxRight);
      targetY = Math.min(Math.max(0, targetY), maxBottom);

      if (settings.debugScrolling && debugCtx) {
        const ctx = debugCtx;
        ctx.save();
        ctx.translate(-scrollTileX * tileSize, -scrollTileY * tileSize);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(
            playerBoundsX,
            playerBoundsY,
            playerBoundsWidth,
            playerBoundsHeight);
        ctx.fillStyle = 'red';
        ctx.fillRect(px - 3, py - 3, 6, 6);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(newPx - 3, newPy - 3, 6, 6);
        ctx.restore();


        ctx.save();
        const {width, height} = ctx.canvas;
        ctx.translate(width / 2, height / 2);
        ctx.strokeStyle = 'lightgreen';
        ctx.fillStyle = 'lightgreen';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.lineTo(0, 0);
        ctx.lineTo(px - newPx, py - newPy);
        ctx.stroke();
        ctx.restore();
      }

      return [targetX / tileSize, targetY / tileSize];
    }

    const tilesetTexture = makeTileTexture(gl);
    const mapAsUint8 = new Uint8Array(map.buffer);
    const mapColorsAsInt8 = new Int8Array(mapColors.buffer);

    // colorize map
    for (let i = 0; i < mapColors.length; ++i) {
      mapColors[i] = getColorForSym(map[i]);
    }

    const tilemap = new TileMap(gl, {
      mapTilesAcross: mapWidth,
      mapTilesDown: mapHeight,
      tilemap: mapAsUint8,
      tilemapColors: mapColorsAsInt8,
      tileset: {
        tilesAcross,
        tilesDown,
        tileWidth: tileSize,
        tileHeight: tileSize,
        texture: tilesetTexture,
      },
    });

    function initWorld() {
      //
      // Draw and init both players
      //
      for (let i = 0; i < numPlayers; i++) {
        const pos = playerStartPositions[i];
        players.push({
          pos,
          dead: false,
          score: 0,
          count: 0,      // items collection
          pushTurns: 0,  // # of turns rocks have been pushed
          pushDelay: 0,  // Rock Delay, number of times rock must be pushed.
          underSym: kSymSpace,
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
            const c = map[i];
            if (c === kSymBomb) {
              setTile(i, kSymBombTriggered);
            } else if (c !== kSymBorder) {
              setTile(i, sym);
            }
          }
          pos += mapWidth;
        }
      }
    }

    function addExplosion(sym, pos) {
      playSound('explode');
      explosionStack.push({sym: sym === kSymButterfly ? kSymDiamondExplode : kSymSpaceExplode, pos});
    }

    function doAmoeba(pos) {
      amoebaCount++;
      if (amoebaChangeSym === 0) {
        // This really shouldn't be done like this
        const h = Math.sin(pos * 2.371 + ticks * 0.1) * 0.1;
        const s = Math.sin(pos * 1.71 + ticks * 0.13) * 0.1;
        const v = Math.sin(pos * 4.21 + ticks * 0.17) * 0.1;
        const color = snorm32(h, s, v, 0);
        setTile(pos, kSymAmoeba, color, mapFlags[pos]);
        let dir = randInt(256) & kMoveBits;
        const oldDir = dir;
        do {
          const newPos = pos + directionMapOffset[dir];
          if (map[newPos] === kSymSpace ||
              map[newPos] === kSymDirt) {

            amoebaGrowFlag = true;
            if (randInt(settings.amoebaGrowthRate) === 0 || amoebaTicksSinceLastGrow > settings.amoebaMinTicksToGrow) {
              amoebaTicksSinceLastGrow = 0;
              mapFlags[newPos] |= kMoved;
              if (dir === kUp || dir === kLeft) {
                mapFlags[newPos] &= kUnmoved;
              }
              setTile(newPos, kSymAmoeba);
              playSound('grow');
              return;
            }
          }
          dir = (dir + 1) & kMoveBits;
        } while (dir !== oldDir);
      } else {
        setTile(pos, amoebaChangeSym, undefined, randInt(4));
      }
    }

    function doFire(pos) {
      const time = mapFlags[pos] & kFireTime;
      if (time === settings.maxFireAge) {
        map[pos] = kSymSpace;
      } else {
        setTile(pos, kSymFire, undefined, time + 1);
        const dir = randInt(256) & kMoveBits;
        const newPos = pos + directionMapOffset[dir];
        const sym = map[newPos];
        if (symBurnableSet.has(sym) && randInt(settings.fireSpreadRate) === 0) {
          setTile(newPos, kSymFire, undefined, 0);
          playSound('burn');
        }
      }
    }


    const mineralSoundsMap = new Map([
      [kSymRock,    'rock'   ],
      [kSymDiamond, 'diamond'],
      [kSymEgg,     'eggFall'],
    ]);

    function doStack(pos, minSym, dir) {
      const nextRow = mapWidth * dir;
      const leftNextOffset = nextRow - 1;
      const rightNextOffset = nextRow + 1;

      const leftNextSym = map[pos + leftNextOffset];
      const nextSym  = map[pos + nextRow];
      const rightNextSym = map[pos + rightNextOffset];
      const leftSym  = map[pos - 1];
      const rightSym  = map[pos + 1];

      if (symRockFallSet.has(nextSym)) {
        if (nextSym === kSymSpace) {
          map[pos] = kSymSpace;
          const newPos = pos + nextRow;
          setTile(newPos, minSym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
          if (map[newPos + nextRow] !== kSymSpace) {
            const sound = mineralSoundsMap.get(minSym);
            if (sound) {
              playSound(sound, rand(0.1));
            }
          }
        } else if ((mapFlags[pos] & kFall) && nextSym === kSymMagicWall) {
          let sym = kSymSpace;

          if (!magicFlag) {
            magicFlag = true;
            if (magicTime) {
              magicSound = playSound('magic', 0, true);
            }
          }

          const newPos = pos + nextRow * 2;
          if (magicTime && map[newPos] === kSymSpace) {
            switch (minSym) {
              case kSymEgg:     sym = kSymGuard;    break;
              case kSymDiamond: sym = kSymRock;     break;
              case kSymRock:    sym = kSymDiamond;  break;
              case kSymBalloon: sym = kSymBalloon;  break;
            }
          }
          map[pos] = kSymSpace;

          if (sym !== kSymSpace) {
            setTile(newPos, sym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
          }
        } else if (minSym === kSymBalloon && nextSym === kSymSpike) {
          map[pos] = kSymDiamond;
          playSound('diamondSpikeBirth', rand(0.1));
        } else {
          if (leftNextSym === kSymSpace && leftSym === kSymSpace) {
            map[pos] = kSymSpace;
            const newPos = pos - 1;
            setTile(newPos, minSym, mapColors[pos], mapFlags[pos] | kFall);
          } else if (rightNextSym === kSymSpace && rightSym === kSymSpace) {
            map[pos] = kSymSpace;
            const newPos = pos + 1;
            setTile(newPos, minSym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
          } else {
            mapFlags[pos] &= kUnFall;
          }
        }
      } else if ((mapFlags[pos] & kFall) && symExplodeFromRockSet.has(nextSym) && minSym !== kSymBalloon) {
        addExplosion(nextSym, pos - 1);
      } else {
        mapFlags[pos] &= kUnFall;
      }
    }

    function doMineral(pos, sym) {
      doStack(pos, sym, 1);
    }

    function doBalloon(pos, sym) {
      doStack(pos, sym, -1);
    }

    function doBomb(pos, sym) {
      const newPos = pos + mapWidth;
      const downSym  = map[newPos];
      if (downSym === kSymSpace) {
        map[pos] = kSymSpace;
        setTile(newPos, sym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
      } else if ((mapFlags[pos] & kFall) && downSym !== kSymDirt) {
        map[pos] = kSymSpace;
        addExplosion(downSym, pos - 1);
      } else {
        mapFlags[pos] &= kUnFall;
      }
    }

    function doEnemy(pos, sym, searchDirection, followWall) {
      const scan = -searchDirection;
      let dir  = (mapFlags[pos] + (followWall ? searchDirection : 0)) & kMoveBits;

      for (let i = 0; i < 2; i++) {
        const newPos = pos + directionMapOffset[dir];
        if (map[newPos] === kSymSpace) {
          map[pos] = kSymSpace;
          mapFlags[newPos] = dir | kMoved;
          if (dir === kUp || dir === kLeft) {
            mapFlags[newPos] &= kUnmoved;
          }
          setTile(newPos, sym, mapColors[pos]);
          return;
        } else if (symEnemyKillsSet.has(map[newPos]) ||
                   ((mapFlags[newPos] & kFall) && dir === 0)) {
          map[newPos] = kSymSpace;
          addExplosion(sym, pos - (mapWidth + 1));
          return;
        }
        dir = (dir + scan) & kMoveBits;
      }

      mapFlags[pos] = dir;
    }

    function makeDoEnemyFn(searchDirection, followWall = true) {
      return function(pos, sym) {
        doEnemy(pos, sym, searchDirection, followWall);
      };
    }

    function doEgg(pos) {
      if (!(mapFlags[pos] & kFall)) {
        mapFlags[pos] += 1;
      }

      const age = mapFlags[pos] & kEggTime;
      if (age === kAgeWiggle) {
        map[pos] = kSymEggWiggle;
        playSound('hatch', rand(0, 0.1));
      } else if (age === kAgeCrack) {
        map[pos] = kSymEggHatch;
        playSound('hatch', rand(0, 0.1));
      } else if (age >= kAgeHatch) {
        setTile(pos, kSymButterfly, getColorForSym(kSymButterfly));
        playSound('hatch', rand(0, 0.1));
      }

      const sym = map[pos];
      if (sym !== kSymButterfly) {
        doMineral(pos, sym);
      }
    }

    function doNewExplosion(pos) {
      addExplosion(kSymSpaceExplode, pos - mapWidth - 1);
    }

    function doExplode(pos) {
      map[pos] += 1;
      mapColors[pos] = 0;
    }

    function doDiamondExplode(pos) {
      setTile(pos, kSymEgg);
    }

    function doSpaceExplode(pos) {
      setTile(pos, kSymSpace);
    }

    // remove this! we should use tile animation for this
    function doMagicWall(pos) {
      mapColors[pos] = magicTime
          ? (magicFlag
              ? (ticks % 6 / 6 * 256 | 0)
              : 0)
          : 0x00C08000;
    }

    const tileFnMap = new Map([
      [ kSymRock,            doMineral              ],
      [ kSymDiamond,         doMineral              ],
      [ kSymBalloon,         doBalloon              ],
      [ kSymGuard,           makeDoEnemyFn(kCCWise) ],
      [ kSymButterfly,       makeDoEnemyFn(kCWise)  ],
      [ kSymPatroller,       makeDoEnemyFn(kCWise, false) ],
      [ kSymSideWalker,      makeDoEnemyFn(2, false) ],
      [ kSymEgg,             doEgg                  ],
      [ kSymEggWiggle,       doEgg                  ],
      [ kSymEggHatch,        doEgg                  ],
      [ kSymEggOpen,         doEgg                  ],
      [ kSymAmoeba,          doAmoeba               ],
      [ kSymDiamondExplode,  doExplode              ],
      [ kSymSpaceExplode,    doExplode              ],
      [ kSymDiamondExplode2, doDiamondExplode       ],
      [ kSymSpaceExplode2,   doSpaceExplode         ],
      [ kSymMagicWall,       doMagicWall,           ],  // REMOVE THIS!
      [ kSymBomb,            doBomb,                ],
      [ kSymBombTriggered,   doNewExplosion,        ],
      [ kSymFire,            doFire,                ],
    ]);

    const collectableMap = new Map([
      [kSymDiamond,   { sound: 'coin',       score: settings.diamondPoints, count: 1 }],
      [kSymEgg,       { sound: 'eggCollect', score: settings.eggPoints,     count: 1 }],
      [kSymEggWiggle, { sound: 'eggCollect', score: settings.eggPoints,     count: 1 }],
      [kSymEggHatch,  { sound: 'eggCollect', score: settings.eggPoints,     count: 1 }],
      [kSymEggOpen,   { sound: 'eggCollect', score: settings.eggPoints,     count: 1 }],
      [kSymDirt,      { sound: 'step',       score: settings.dirtPoints,    count: 0 }],
    ]);

    function nextGen() {
      ++ticks;
      if (!finished && !players[0].dead) {
        timeElem.textContent = Math.ceil(Math.max(0, timeLimitTicks - ticks) * settings.frameRate).toString().padStart(4, '0');
      }

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

      if (!amoebaChangeSym) {
        if (!amoebaGrowFlag) {
          amoebaChangeSym = kSymDiamond;
          playSound('amoebaToDiamonds');
        } else if (amoebaCount >= settings.maxAmoebas) {
          amoebaChangeSym = amoebaMorph;
          playSound('amoebaToEggs');
        } else {
          ++amoebaTicksSinceLastGrow;
        }
      }
    }

    function addScore(points, playerNdx) {
      // TODO: add some effect
      const player = players[playerNdx];
      player.score += points;
      scoreElem.textContent = players[0].score.toString().padStart(6, '0');
    }

    function addCount(playerNdx) {
      const player = players[playerNdx];
      const oldCount = player.count;
      ++player.count;
      if (oldCount < requiredCount && player.count >= requiredCount) {
        flashScreen(60, [1, 1, 0, 1]);
        goalElem.classList.add('exit-open');
        playSound('open');
        for (const pos of exits) {
          setTile(pos, kSymOpenExit);
        }
      }
      updateGoal(player.count);
    }

    function dirtFace(playerNdx) {
      if (finished) {
        return;
      }

      const player = players[playerNdx];
      if (ticks === timeLimitTicks || killPlayer) {
        addExplosion(kSymSpace, player.pos - mapWidth - 1);
        playSound('explode');
        return;
      }

      const input = player.input;
      let dirtFacePos = player.pos;
      let newOffset = 0;
      let dfSym = kSymDirtFaceRight;
      if (input & kDownBit) {
         newOffset =  mapWidth; dfSym = kSymDirtFaceDown;
      }
      if (input & kUpBit) {
         newOffset = -mapWidth; dfSym = kSymDirtFaceUp;
      }
      if (input & kRightBit) {
         newOffset =     1; dfSym = kSymDirtFaceRight;
      }
      if (input & kLeftBit) {
         newOffset =    -1; dfSym = kSymDirtFaceLeft;
      }

      setTile(dirtFacePos, dfSym);

      if (input === 0) {                    // nothing pressed
        map[dirtFacePos] = kSymDirtFace;
      }

      const newPos = dirtFacePos + newOffset;      // new position
      const c  = map[newPos];  // Chr at new position

      const collectable = collectableMap.get(c);
      if (collectable) {
        playSound(collectable.sound);
        addScore(collectable.score, playerNdx);
        if (collectable.count) {
          addCount(playerNdx);
        }
      }

      if (input & kFireBit) {  // Fire Button, should be using better routines.
        if (collectable) {
          setTile(newPos, kSymSpace);
        }
      } else if (symOpenToPlayerSet.has(c)) {
        if (c === kSymFire) {
          addExplosion(kSymSpaceExplode, newPos - mapWidth - 1);
        } else {
          if (c === kSymOpenExit) {
            finished = true;
            playSound('beamMeUp');
          }
          // move Dirt Face
          setTile(dirtFacePos, player.underSym);
          player.underSym = c === kSymDoor ? kSymDoor : kSymSpace;
          dirtFacePos = newPos;
          setTile(dirtFacePos, dfSym);
        }
      } else if (symPushableSet.has(map[newPos]) && (newOffset !== -mapWidth)) {

        // push rocks
        if (player.pushDelay !== newOffset) {
          // start pushing rocks
          // 0 start 0 per = 0,0,0
          // 0 start 1 per = 0,1,2
          // 1 start 1 per = 1,2,3
          // 1 start 0 per = 1,1,1
          // 2 start 1 per = 2,3,4
          // 1 start 2 per = 1,3,5

          player.pushTurns = 0;
          let numRocks = 0;
          let q = newPos;
          do {
            q += newOffset;
            ++numRocks;
          } while (symPushableSet.has(map[q]) && (settings.canPushWithRocksAbove || !symPushableSet.has(map[q - mapWidth])));
          player.pushTurns = settings.minRockPushTurns + (numRocks - 1) * settings.pushTurnsPerRock;

          if (map[q] !== kSymSpace || numRocks > settings.maxPushRocks) {
            player.pushDelay = 0;  // can't push
          } else {
            player.pushDelay = newOffset;  // can push
          }
        }
        if (player.pushDelay === newOffset) {
          player.pushTurns--;
          if (player.pushTurns < 0) {
           // move rock
            let q = newPos;
            do {
              q += newOffset;
              if (!settings.canPushWithRocksAbove && symPushableSet.has(map[q - mapWidth])) {
                q = 0;
              }
            } while (symPushableSet.has(map[q]) && q !== 0);

            if (q !== 0 && map[q] === kSymSpace) {
              setTile(dirtFacePos, kSymSpace);
              dirtFacePos = newPos;
              while (q !== dirtFacePos) {
                map[q] = map[q - newOffset];
                mapColors[q] = mapColors[q - newOffset];
                q -= newOffset;
              }
              map[dirtFacePos] = dfSym;
              mapColors[dirtFacePos] = 0;
            }

            player.pushDelay = 0;
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
    updateGoal(players[0].count);
    playSound('start');

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    let [scrollTileX, scrollTileY] = computeTargetScrollPosition(gl, 1000000, 1000000, players[0].pos);

    const tileDrawOptions = {
      x: 0,
      y: 0,
      width:  mapWidth  * tileSize,
      height: mapHeight * tileSize,
      canvasWidth: 0, //this.canvas.width,
      canvasHeight: 0, //this.canvas.height,
      scrollX: scrollTileX,
      scrollY: scrollTileY,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      originX: 0,
      originY: 0,
    };

    let then = 0;
    let delay = 1; //settings.frameRate;
    function process(now) {
      now *= 0.001;
      const deltaTime = Math.min(now - then, 0.1);
      then = now;

      gamepadManager.process();

      delay -= deltaTime;
      while (delay <= 0) {
        delay += settings.frameRate;

        for (let p = 0; p < numPlayers; ++p) {
          const player = players[p];
          player.input = getKeyBits(p);
        }
        players[0].input |= getKeyBits(1);
        players[0].input |= getTouchBits();
        players[0].input |= gamepadManager.getBits(0);

        nextGen();
        explode();
        if (magicFlag & magicTime > 0) {
          --magicTime;
          if (magicTime === 0) {
            magicSound.stop();
            magicSound = undefined;
          }
        }

        for (let i = 0; i < numPlayers; i++) {
          const player = players[i];
          const newPos = player.pos;
          if (symDirtFaceSet.has(map[newPos]) && player.dead === false) {
            dirtFace(i);
          } else if (!player.dead) {
            player.dead = true;
          }
        }

        // draw();
      }

      {
        const timeLeft = Math.ceil(Math.max(0, timeLimitTicks - ticks) * settings.frameRate);
        if (!finished && !players[0].dead && timeLeft > 0 && timeLeft < 30) {
          const v = timeLeft / 30;
          const b = now * lerp(2, 8, Math.pow(1 - v, 8)) % 1;
          timeElem.style.color = b > 0.5 ? 'red' : 'white';
        }
      }

      if (debugCtx) {
        const ctx = debugCtx;
        twgl.resizeCanvasToDisplaySize(ctx.canvas);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (settings.debugScrolling) {
          clearDebugText();
        }
      }

      if (finished || players[0].dead) {
        const secondsLeft = Math.floor(Math.max(0, timeLimitTicks - ticks) * settings.frameRate);
        timeElem.textContent = secondsLeft.toString().padStart(4, '0');
        if (finished && secondsLeft) {
          const points = secondsLeft > 25 ? 10 : 1;
          addScore(points, 0);
          timeLimitTicks -= Math.max(1, (points / settings.frameRate) | 0);
          playSound('endScore');
        } else {
          endTimer += deltaTime;
          if (endTimer >= settings.endDuration) {
            const currentNdx = levelFilenameToIndex(settings.level);
            const ndx = finished
                ? (currentNdx + 1) % levels.length
                : currentNdx;
            if (ndx === randomLevelNdx && finished) {
              randomizeLevel0();
            }
            setLevelByIndex(ndx);
          }
        }
      }

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(...(flashTime > 0
         ? mixArray([0, 0, 0, 1], flashColor, flashTime-- / flashDuration)
         : [0, 0, 0, 1]));
      //gl.colorMask(true, true, true, false);
      gl.clear(gl.COLOR_BUFFER_BIT);

      tilemap.uploadTilemap(gl);

      {
        const player = players[0];
        const [targetTileX, targetTileY] = computeTargetScrollPosition(gl, scrollTileX, scrollTileY, player.pos);
        const screenWidthPixels = gl.drawingBufferWidth;
        const screenHeightPixels = gl.drawingBufferHeight;

        tileDrawOptions.canvasWidth = screenWidthPixels;
        tileDrawOptions.canvasHeight = screenHeightPixels;

        const absDeltaScrollX = Math.min(Math.abs(scrollTileX - targetTileX), 6);
        const absDeltaScrollY = Math.min(Math.abs(scrollTileY - targetTileY), 6);

        const lerpRateX = lerp(settings.scrollRate, 0.1, Math.pow(absDeltaScrollX / 6, 2));
        const lerpRateY = lerp(settings.scrollRate, 0.1, Math.pow(absDeltaScrollY / 6, 2));

        const targetScrollX = lerp(scrollTileX, targetTileX, lerpRateX);
        const targetScrollY = lerp(scrollTileY, targetTileY, lerpRateY);

        const tilesPerTick = 1 / settings.frameRate;
        const maxSpeed = tilesPerTick / 60;
        const deltaTileX = minMagnitude(targetScrollX - scrollTileX, maxSpeed);
        const deltaTileY = minMagnitude(targetScrollY - scrollTileY, maxSpeed);

        scrollTileX += deltaTileX;
        scrollTileY += deltaTileY;

        tileDrawOptions.x = scrollTileX < 0 ? -scrollTileX * tileSize * 0.5 : 0;
        tileDrawOptions.y = scrollTileY < 0 ? -scrollTileY * tileSize * 0.5 : 0;

        tileDrawOptions.scrollX = (Math.max(0, scrollTileX) * tileSize | 0) / tileSize;
        tileDrawOptions.scrollY = (Math.max(0, scrollTileY) * tileSize | 0) / tileSize;

        tilemap.draw(gl, tileDrawOptions);
        if (settings.debugScrolling) {
          setDebugText(`\n\n
targetTileX,Y: ${targetTileX}, ${targetTileY}
lerpRateX: ${lerpRateX}
lerpRateY: ${lerpRateY}`);
        }
      }

      //gl.clearColor(0, 0, 0, 1);
      //gl.colorMask(false, false, false, true);
      //gl.clear(gl.COLOR_BUFFER_BIT);

    }

    processFn = process;

    killPlayerFn = () => {
      killPlayer = true;
    };
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
      hideSplash();
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
  splashElem.addEventListener('drop', dropHandler);
  splashElem.addEventListener('dragover', dragoverHandler);
  splashElem.addEventListener('dragenter', dragenterHandler);
  splashElem.addEventListener('dragleave', dragleaveHandler);
}

main();