/* eslint-env browser */
import * as twgl from '../3rdParty/twgl-full.module.js';
import {
  AudioManager,
} from './audio.js';
import {
  kUp,
  kLeft,
} from './directions.js';
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
import levelPaths from './levels.js';
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
  kSymExit,
  kSymOpenExit,
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

  const kAmoebaGrowthRate =  2;
  const kCWise      = -1;
  const kCCWise     =  1;

  function applyQuerySettings(settings) {
    for (const [k, v] of (new URLSearchParams(window.location.search).entries())) {
      if (settings[k] === undefined) {
        console.error(`unknown setting: ${k}`);
        continue;
      }
      settings[k] = parseFloat(v);
    }
  }

  // initial # of objects on screen
  const settings = {
    level: 0,                         // level to use
    seed: randInt(0x7FFFFFF),         // seed for random level
    amoebas: 1,                       // number of amoebas
    butterflies: 5,                   // number of butterflies
    diamonds: 15,                     // number of diamonds
    guards: 3,                        // number of guardians
    rocks: 280,                       // number of rocks
    walls: 10,                        // number of walls
    magicWalls: 2,                    // number of magic walls
    maxAmoebas: 100,                  // how many amoebas with it turns into eggs
    magicTime: 250,                   // how many ticks the magic walls stay active
    tileSize: 32,                     // size of tiles (note: you can also Cmd/Ctrl +/- in browser)
    scrollRate: 0.0125,               // scroll speed
    diamondPoints: 100,               // points for collecting diamond
    eggPoints: 10 ,                   // points for collecting egg
    dirtPoints: 1,                    // points for digging dirt
    mapWidth: 80,                     // map width in tiles
    mapHeight: 25,                    // map height in tiles
    frameRate: 1 / 10,                // frame rate in seconds
    timeLimit: 1500,                  // time limit in seconds
    colorVariation: 1,                // color variation multiplier. Set to 0 for no variation.
    playerBoundsWidthPercent: 0.125,  // size of window to keep player inside
    playerBoundsHeightPercent: 0.125, // size of window to keep player inside
    requiredCount: 15,                // required count (eggs + diamonds)
    showTiles: false,                 // So we can save a new .png
    testSounds: false,                // Test the sounds
    debug: false,
  };
  const g_settings = settings;
  applyQuerySettings(settings);

  levels.push({
    name: 'Random',
    level: randomLevel(settings),
  });

  // Per symbol, how much to adjust hue, saturation, value.
  // a single number will by -v/+v, An array of 2 numbers
  // specifies min,max
  const colorRanges = new Map([
    [kSymDirt,      [0.02, [-0.1, -0.2], [0.1, 0.2]]],
    [kSymButterfly, [0.1 , 0.0, 0.0]],
    [kSymGuard,     [0.2 , 0.2, 0.2]],
    [kSymRock,      [0.04, 0.1, 0.1]],
    [kSymAmoeba,    [0.1,  0.1, 0.1]],
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
      level,
    };
  }

  async function loadTiledLevel(url) {
    const res = await fetch(url);
    const data = await res.json();
    return prepTiledLevel(data, url);
  }

  levels.push(...(await Promise.all(levelPaths.map(loadTiledLevel))));
  settings.level = Math.min(levels.length - 1, settings.level);

  async function loadLevel(file) {
    const data = JSON.parse(await file.text());
    const level = prepTiledLevel(data, file.name);
    const ndx = levels.findIndex(l => l.name === level.name);
    if (ndx >= 0) {
      levels.splice(ndx, 1);
    }
    levels.push(level);
    settings.level = levels.length - 1;
    updateLevelSelection();
    restart();
  }

  /* eslint-disable quotes */
  /* eslint-disable optional-comma-spacing/optional-comma-spacing */
  const sounds = {
    placeBomb:         { jsfx: ['sine',0.0000,0.4000,0.0000,0.1260,0.0840,0.0720,110.0000,548.0000,2400.0000,-0.7300,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.2700,0.2000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.1730,0.0000]      , },
    eggCollect:        { jsfx: ["synth",3.0000,0.7020,0.0000,0.1760,0.0000,0.0240,20.0000,1377.0000,2400.0000,0.4240,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.1000,0.0000], }, //['square',0.0000,0.7770,0.0000,0.0480,0.5280,0.2220,20.0000,1558.0000,2400.0000,0.4560,0.0120,0.0000,0.0100,0.0003,0.0000,0.4980,0.2770,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    oldHatch:          { jsfx: ["sine",3.0000,0.7020,0.0000,0.1300,0.0000,0.2920,110.0000,1610.0000,2400.0000,-0.8080,0.0000,0.3270,27.0284,0.5671,0.0600,0.0000,0.0000,0.5000,-0.5740,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.2490,0.0000], },
    step:              { jsfx: ["noise",0.0000,0.3450,0.0000,0.0380,0.0000,0.0300,708.0000,93.0000,20.0000,-0.8720,-0.3140,0.0520,1.7376,0.0003,-0.9180,0.6320,0.8690,0.2460,0.0000,0.0000,-0.9180,-0.8500,1.0000,-1.0000,0.0000,0.2710,0.0000], },
    rock:              { jsfx: ["square",14.0000,0.3450,0.0000,0.1580,0.1440,0.0180,20.0000,349.0000,588.0000,-0.9180,-0.4520,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.5000,-0.1720,0.0000,-0.5740,0.0920,1.0000,0.0000,0.0000,0.0000,0.0000], },
    diamond:           { jsfx: ["square",14.0000,0.3450,0.0000,0.0100,0.3450,0.1400,20.0000,1368.0000,2400.0000,0.0000,0.0000,0.0000,0.0100,0.0003,0.0000,0.2640,0.1160,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    grow:              { jsfx: ["synth",14.0000,0.3450,0.0000,0.0360,0.0000,0.2300,100.0000,1447.0000,2400.0000,-0.7380,-0.1480,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.2975,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    explode:           { jsfx: ['noise',0.0000,0.2360,0.0000,0.4180,1.8690,0.5380,20.0000,300.0000,2400.0000,-0.0940,0.0000,0.0000,0.3939,0.0679,0.1400,-0.7120,0.8100,0.0000,0.0000,0.4600,-0.1000,-0.0300,0.9900,-0.0660,0.9990,0.0000,0.0000]  , },
    eggFall:           { jsfx: ["sine",14.0000,0.3450,0.0000,0.0580,0.5100,0.1200,20.0000,198.0000,2400.0000,0.2800,0.0000,0.0000,0.0100,0.0003,0.0000,0.3940,0.2390,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    open:              { jsfx: ["square",14.0000,0.7020,0.0000,0.5060,0.0000,0.3840,20.0000,745.0000,2400.0000,0.1440,0.0000,0.4150,22.5173,0.0003,0.0000,0.0000,0.0000,0.0570,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    magic:             { jsfx: ["saw",3.0000,0.7020,0.0220,0.8560,0.1080,0.1200,1416.0000,162.0000,940.0000,0.4080,-0.7860,0.2920,23.7171,0.9363,0.1780,0.0000,0.3460,0.1310,-0.1060,0.3584,-0.3500,-0.3940,0.6010,0.8020,0.7810,0.4770,-0.2360], },
    die:               { jsfx: ['square',0.0000,0.4020,0.0000,1.0660,0.0000,0.2680,20.0000,262.0000,2400.0000,-0.3060,0.0000,0.6590,12.2475,0.4319,-0.1960,0.3320,0.0000,0.0000,-0.0140,0.0000,0.0000,0.0000,1.0000,-0.0100,0.0000,0.0000,-1.0000], },
    dieOld:            { jsfx: ['saw',0.0000,0.4020,0.0000,1.0660,0.0000,0.2680,20.0000,262.0000,2400.0000,-0.3060,0.0000,0.6590,12.2475,0.4319,-0.1960,0.3320,0.0000,0.0000,-0.0140,0.0000,0.0000,0.0000,1.0000,-0.0100,0.0000,0.0000,-1.0000]   , },
    pickup:            { jsfx: ['sine',0.0000,0.4000,0.0000,0.2860,0.0000,0.2760,20.0000,1006.0000,2400.0000,-0.6120,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.2190,0.1860,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]      , },
    reappear:          { jsfx: ['square',0.0000,0.4000,0.1740,1.1080,1.3530,0.5660,20.0000,422.0000,2400.0000,-0.4340,0.2980,0.4530,17.2864,0.0003,0.0000,0.5740,0.1740,0.0000,-0.1260,0.1280,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]   , },
    hatch:             { jsfx: ['sine',0.0000,0.4000,0.0000,0.0000,0.1980,0.1320,20.0000,249.0000,2400.0000,-0.5620,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.1840,0.0000]       , },
    swingup:           { jsfx: ['square',0.0000,0.4000,0.0000,0.0120,0.4560,0.4600,20.0000,1176.0000,2400.0000,0.0000,1.0000,0.0000,0.0100,0.0003,0.0000,0.4740,0.2480,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    coin:              { jsfx: ['square',0.0000,0.7770,0.0000,0.0860,1.0620,0.1980,20.0000,763.0000,2400.0000,0.0000,0.0000,0.0000,0.0100,0.0003,0.0080,0.3880,0.0950,0.0000,0.0000,0.0000,0.0120,0.5300,1.0000,0.0000,0.0000,0.0000,0.0000] , },
    coinishAxe:        { jsfx: ['square',0.0000,0.4000,0.0000,0.0200,0.4080,0.3400,20.0000,692.0000,2400.0000,0.0000,0.0000,0.0000,0.0100,0.0003,0.0000,0.4740,0.1110,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000] , },
    takeHitShotsound3: { jsfx: ['saw',0.0000,0.4000,0.0000,0.1200,0.0000,0.3580,20.0000,988.0000,2400.0000,-0.6800,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.3755,0.0180,0.0000,0.0760,0.1760,1.0000,0.0000,0.0000,0.0000,0.0000]   , },
    tinnySwingUp:      { jsfx: ['saw',0.0000,0.4000,0.0000,0.0620,0.0000,0.2400,20.0000,596.0000,2400.0000,0.6180,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.4080,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]    , },
    beamMeUp:          { jsfx: ['square',0.0000,0.4000,0.0000,0.3480,0.0000,0.4040,20.0000,550.0000,2400.0000,0.2420,0.0000,0.6560,37.2982,0.0003,0.0000,0.0000,0.0000,0.3500,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
    stunned:           { jsfx: ['saw',0.0000,0.4000,0.0000,0.2520,0.0000,0.4220,20.0000,638.0000,2400.0000,0.0720,0.0000,0.2100,10.5198,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]   , },
    mellowStunned:     { jsfx: ['saw',0.0000,0.4000,0.0000,0.0660,0.0000,0.3380,20.0000,455.0000,2400.0000,0.0760,0.0000,0.3150,11.0477,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]   , },
    amoebaToEggs:      { jsfx: ['square',0.0000,0.4000,0.0000,0.3120,0.0000,0.4940,20.0000,533.0000,2400.0000,0.0640,0.0000,0.6000,31.9233,0.0003,0.0000,0.0000,0.0000,0.5000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000] , },
    amoebaToDiamonds:  { jsfx: ['square',0.0000,0.4000,0.0000,0.2160,0.0000,0.4120,20.0000,608.0000,2400.0000,0.2240,0.0000,0.5820,15.5108,0.0003,0.0000,0.0000,0.0000,0.3315,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000] , },

    s01: { jsfx: ['sine',0.0000,0.4000,0.5980,1.7220,2.3190,1.8360,1254.0000,1938.0000,788.0000,-0.9560,-0.4620,0.9680,11.3836,0.3513,0.4760,0.6620,0.1460,0.3025,0.7360,0.5592,0.8640,-0.6040,0.5090,0.2000,0.2840,0.0790,0.4660]      , },
    s02: { jsfx: ['square',0.0000,0.4000,0.1940,1.6020,0.5730,0.6580,2322.0000,2045.0000,2119.0000,-0.9500,-0.8140,0.0820,7.0645,0.0133,0.0500,0.8700,0.5680,0.4215,-0.2820,0.6608,-0.7340,0.6680,0.4040,-0.3500,0.7630,0.7930,0.7620]  , },
    s03: { jsfx: ['saw',0.0000,0.4000,0.2920,0.8200,1.0710,1.3200,1693.0000,1445.0000,1264.0000,-0.5400,0.9080,0.4770,9.7520,-0.0010,-0.3100,-0.2260,0.2810,0.2095,-0.2400,0.7184,-0.3740,0.3360,0.5160,-0.2700,0.6290,0.2880,0.2980]   , },
    s04: { jsfx: ['synth',0.0000,0.4000,0.4480,1.3320,0.3540,0.5220,176.0000,445.0000,1067.0000,0.8340,0.3920,0.4790,24.1970,0.8284,0.2440,0.7220,0.8090,0.0045,0.7900,0.5704,0.5100,0.9600,0.5870,0.3120,0.5890,0.9660,0.8900]         , },
    s05: { jsfx: ['noise',0.0000,0.4000,0.1910,0.6920,1.6080,1.8580,2155.0000,1589.0000,2396.0000,-0.7620,0.3240,0.3640,32.2593,0.7426,-0.5060,-0.2740,0.9420,0.4915,-0.9640,0.3448,0.5580,-0.0940,0.4490,-0.6180,0.9520,0.9030,0.9880] , },
    s06: { jsfx: ['saw',0.0000,0.4000,0.4450,1.6420,2.3100,0.5360,835.0000,1226.0000,133.0000,0.4520,-0.4600,0.5290,3.8972,0.7140,-0.1380,0.7140,0.7710,0.4980,-0.8280,0.0688,-0.7800,0.5140,0.5790,-0.8080,0.8670,0.5680,0.0740]       , },
    s07: { jsfx: ['square',0.0000,0.4000,0.7110,0.9080,1.7190,1.0980,1189.0000,1079.0000,721.0000,0.8680,0.9740,0.7320,45.4085,-0.0192,-0.5460,-0.2940,0.5570,0.2145,0.9220,0.2112,-0.4460,0.1260,0.3310,0.2100,0.6890,0.9990,0.0800]   , },
    s08: { jsfx: ['saw',0.0000,0.4000,0.0000,0.3760,0.0000,0.4360,20.0000,491.0000,2400.0000,0.2300,0.0000,0.6140,36.2904,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]            , },
    s09: { jsfx: ['square',0.0000,0.4000,0.0000,0.3120,0.0000,0.4940,20.0000,533.0000,2400.0000,0.0640,0.0000,0.6000,31.9233,0.0003,0.0000,0.0000,0.0000,0.5000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]         , },
    s10: { jsfx: ['square',0.0000,0.4000,0.0000,0.2960,0.0000,0.3600,20.0000,497.0000,2400.0000,0.1880,0.0000,0.6060,32.0193,0.0003,0.0000,0.0000,0.0000,0.0125,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]         , },
    s11: { jsfx: ['square',0.0000,0.4000,0.0000,0.2160,0.0000,0.4120,20.0000,608.0000,2400.0000,0.2240,0.0000,0.5820,15.5108,0.0003,0.0000,0.0000,0.0000,0.3315,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]         , },
    s12: { jsfx: ['saw',0.0000,0.4000,0.0000,0.0420,0.0000,0.2000,20.0000,608.0000,2400.0000,0.2060,0.0000,0.4090,23.6211,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]            , },
    s13: { jsfx: ['square',0.0000,0.4000,0.0000,0.0600,0.0000,0.3120,20.0000,533.0000,2400.0000,0.0520,0.0000,0.1700,12.7753,0.0003,0.0000,0.0000,0.0000,0.2345,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]         , },
    s14: { jsfx: ['saw',0.0000,0.4000,0.0000,0.0320,0.0000,0.4200,20.0000,643.0000,2400.0000,0.0900,0.0000,0.6060,10.2319,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]            , },
    s15: { jsfx: ['square',0.0000,0.4000,0.0000,0.2520,0.0000,0.1660,20.0000,534.0000,2400.0000,0.2420,0.0000,0.3690,27.2683,0.0003,0.0000,0.0000,0.0000,0.1030,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000]         , },
    s16: { jsfx: ['synth',0.0000,0.4000,0.6550,1.4680,2.5350,0.5840,2379.0000,2327.0000,463.0000,0.7460,-0.8520,0.4240,30.3397,0.4904,-0.0600,0.9260,0.2620,0.1735,0.6120,0.5656,0.5760,-0.0060,0.8100,0.3700,0.0900,0.6270,0.1400]     , },
    s17: { jsfx: ['synth',0.0000,0.4000,0.9830,0.7140,1.5570,1.0200,444.0000,1502.0000,2275.0000,-0.9600,0.2020,0.4350,8.9361,0.4917,-0.8860,0.5400,0.2850,0.0435,-0.4200,0.5656,-0.8280,0.3340,0.2030,-0.1440,0.9500,0.5480,0.6220]    , },
  };
  /* eslint-enable quotes */
  /* eslint-enable optional-comma-spacing/optional-comma-spacing */

  let playSound = () => {};
  const audioManager = new AudioManager(sounds);
  audioManager.on('started', () => {
    playSound = (...args) => {
      return audioManager.playSound(...args);
    };
  });

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

  const gl = document.querySelector('#playField').getContext('webgl2', {premultipliedAlpha: false});
  const restartElem = document.querySelector('#restart');
  const scoreElem = document.querySelector('#score');
  const splashElem = document.querySelector('#splash');
  const loadingElem = document.querySelector('#loading');
  const nameElem = document.querySelector('#name');
  const goalElem = document.querySelector('#goal');
  const timeElem = document.querySelector('#time');
  const dieElem = document.querySelector('#die');

  let processFn = () => {};
  let killPlayerFn = () => {};

  let ctx;
  let debugElem;
  if (settings.debug) {
    ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.className = 'debug';
    document.body.appendChild(ctx.canvas);
    debugElem = document.createElement('pre');
    debugElem.className = 'debug';
    document.body.appendChild(debugElem);
  }

  const restart = () => {
    levels[0].level = randomLevel(settings);
    setLevel(settings.level);
  };

  function setLevel(ndx) {
    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);
    params.set('level', ndx);
    params.delete('seed');
    if (ndx === 0) {
      params.set('seed', settings.seed);
    }
    url.search = params.toString();
    window.history.replaceState({}, '', url.toString());
    settings.level = ndx;
    startLevel(levels[ndx]);
  }

  restartElem.addEventListener('click', restart);
  scoreElem.addEventListener('click', restart);
  timeElem.addEventListener('click', restart);
  dieElem.addEventListener('click', () => killPlayerFn());

  loadingElem.style.display = 'none';
  const hideSplash = () => {
    splashElem.style.display = 'none';
  };
  function hideSplashOnUseGesture() {
    window.removeEventListener('keydown', hideSplashOnUseGesture, {once: true});
    hideSplash();
    restart();
  }
  splashElem.addEventListener('click', hideSplashOnUseGesture);
  window.addEventListener('keydown', hideSplashOnUseGesture, {once: true});

  const getTouchBits = initTouch(gl.canvas);
  const getKeyBits = initKeyboard(window);

  const tileSize = settings.tileSize;
  const tilesAcross = 32;
  const tilesDown = 32;
  function makeTileTexture(gl) {
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
    for (let i = 0; i < levels.length; ++i) {
      const level = levels[i];
      const elem = document.createElement('option');
      elem.textContent = level.name;
      if (i === settings.level) {
        elem.selected = true;
      }
      selectElem.appendChild(elem);
    }
    selectElem.addEventListener('change', () => {
      setLevel(selectElem.selectedIndex);
    });
  }
  updateLevelSelection();

  let magicSound;
  let currentLevel;
  setLevel(settings.level);

  function startLevel({level}) {
    currentLevel = level;
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

    const settings = {
      ...g_settings,
      ...level.settings,
    };
    applyQuerySettings(settings);

    goalElem.classList.remove('exit-open');
    timeElem.style.color = '';
    const timeLimitTicks = Math.ceil(settings.timeLimit / settings.frameRate);
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

      if (ctx) {
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
          setTile(newPos, minSym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
          if (map[newPos + mapWidth] !== kSymSpace) {
            switch (minSym) {
              case kSymRock:
                playSound('rock', rand(0.1));
                break;
              case kSymDiamond:
                playSound('diamond', rand(0.1));
                break;
              case kSymEgg:
                playSound('eggFall', rand(0.1));
                break;
            }
          }
        } else if ((mapFlags[pos] & kFall) && downSym === kSymMagicWall) {
          let sym = kSymSpace;

          if (!magicFlag) {
            magicFlag = true;
            if (magicTime) {
              magicSound = playSound('magic', 0, true);
            }
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
            setTile(newPos, sym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
          }
        } else {
          if (leftDownSym === kSymSpace && leftSym === kSymSpace) {
            map[pos] = kSymSpace;
            const newPos = pos - 1;
            setTile(newPos, minSym, mapColors[pos], mapFlags[pos] | kFall);
          } else if (rightDownSym === kSymSpace && rightSym === kSymSpace) {
            map[pos] = kSymSpace;
            const newPos = pos + 1;
            setTile(newPos, minSym, mapColors[pos], mapFlags[pos] | kFall | kMoved);
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
          setTile(newPos, sym, mapColors[pos]);
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
      [ kSymMagicWall,       doMagicWall,           ],  // REMOVE THIS!
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
         newOffset =  mapWidth;
      }
      if (input & kUpBit) {
         newOffset = -mapWidth;
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

      if (c === kSymDiamond) {
        playSound('coin');
        addScore(settings.diamondPoints, playerNdx);
        addCount(playerNdx);
      }
      if (c >= kSymEgg && c <= kSymEggOpen) {
        playSound('eggCollect');
        addScore(settings.eggPoints, playerNdx);
        addCount(playerNdx);
      }
      if (c === kSymDirt) {
        playSound('step');
        addScore(settings.dirtPoints, playerNdx);
      }

      if (input & kFireBit) {  // Fire Button, should be using better routines.
        if (c === kSymDirt || c === kSymDiamond || (c >= kSymEgg && c <= kSymEggHatch)) {
          setTile(newPos, kSymSpace);
        }
      } else if (c === kSymDirt ||
                 c === kSymSpace ||
                 c === kSymDiamond ||
                 (c >= kSymEgg && c <= kSymEggHatch) ||
                 c === kSymOpenExit) {

        if (c === kSymOpenExit) {
          finished = true;
          playSound('beamMeUp');
        }
        // move Dirt Face
        setTile(dirtFacePos, kSymSpace);
        dirtFacePos = newPos;
        setTile(dirtFacePos, dfSym);

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
              setTile(dirtFacePos, kSymSpace);
              dirtFacePos = newPos;
              map[dirtFacePos] = dfSym;
              map[q] = kSymRock;
              while (q !== dirtFacePos) {
                mapColors[q] = mapColors[q - newOffset];
                q -= newOffset;
              }
              mapColors[dirtFacePos] = 0;
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
    updateGoal(players[0].count);

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
    let delay = 0;
    function process(now) {
      now *= 0.001;
      const deltaTime = Math.min(now - then, 0.1);
      then = now;

      delay -= deltaTime;
      while (delay <= 0) {
        delay += settings.frameRate;

        for (let p = 0; p < numPlayers; ++p) {
          const player = players[p];
          player.input = getKeyBits(p);
        }
        players[0].input |= getKeyBits(1);
        players[0].input |= getTouchBits();

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

      {
        const timeLeft = Math.ceil(Math.max(0, timeLimitTicks - ticks) * settings.frameRate);
        if (!finished && !players[0].dead && timeLeft > 0 && timeLeft < 30) {
          const v = timeLeft / 30;
          const b = now * lerp(2, 8, Math.pow(1 - v, 8)) % 1;
          timeElem.style.color = b > 0.5 ? 'red' : 'white';
        }
      }

      if (ctx) {
        twgl.resizeCanvasToDisplaySize(ctx.canvas);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        debugElem.textContent = '';
      }

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(...(flashTime > 0
         ? mixArray([0, 0, 0, 0], flashColor, flashTime-- / flashDuration)
         : [0, 0, 0, 0]));
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
        if (debugElem) {
          debugElem.textContent = `\n\n
targetTileX,Y: ${targetTileX}, ${targetTileY}
lerpRateX: ${lerpRateX}
lerpRateY: ${lerpRateY}`;
        }
      }
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