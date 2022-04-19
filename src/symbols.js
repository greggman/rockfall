export const kSymSpace           = 0x0000;    // space
export const kSymBorder          = 0x0001;    // border
export const kSymDirt            = 0x0002;    // dirt
export const kSymDirtFace        = 0x0003;    // Dirt E. Face
export const kSymDirtFaceRight   = 0x0004;    // Dirt E. Face
export const kSymDirtFaceLeft    = 0x0005;    // Dirt E. Face
export const kSymButterfly       = 0x0006;    // butterfly
export const kSymGuard           = 0x0007;    // guardian
export const kSymDiamondExplode  = 0x0008;    // diamond explosion
export const kSymDiamondExplode2 = 0x0009;    // diamond explosion
export const kSymSpaceExplode    = 0x000A;    // space explosion
export const kSymSpaceExplode2   = 0x000B;    // space explosion
export const kSymAmoeba          = 0x000C;    // amoeba
export const kSymMagicWall       = 0x000D;    // magic wall
export const kSymEgg             = 0x000E;    // monster egg
export const kSymEggWiggle       = 0x000F;    // egg wiggle
export const kSymEggHatch        = 0x0010;    // egg hatch
export const kSymEggOpen         = 0x0011;    // egg opening
export const kSymWall            = 0x0012;    // wall
export const kSymDiamond         = 0x0013;    // diamond
export const kSymRock            = 0x0014;    // rock
export const kSymExit            = 0x0015;    // exit
export const kSymOpenExit        = 0x0016;    // open exit
export const kSymDirtFaceUp      = 0x0017;    // Dirt E. Face
export const kSymDirtFaceDown    = 0x0018;    // Dirt E. Face
export const kSymDoor            = 0x0019;    // Door
export const kSymPatroller       = 0x001A;
export const kSymSideWalker      = 0x001B;

export const symbolToCharMap = new Map([
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
  [kSymExit,            '🧧'],   // exit
  [kSymOpenExit,        '🔳'],   // open exit
  [kSymDirtFaceUp,      '👆'],   // Dirty E. Face
  [kSymDirtFaceDown,    '👇'],   // Dirty E. Face
  [kSymDoor,            '🚪'],   // Door
  [kSymPatroller,       '🪲'],   // Patroller
  [kSymSideWalker,      '🦀'],   // SideWalker
]);

export const symSpaceSet = new Set([
  kSymSpace,
]);

export const symRockFallSet = new Set([
  kSymSpace,
  kSymEgg,
  kSymEggWiggle,
  kSymEggHatch,
  kSymEggOpen,
  kSymWall,
  kSymDiamond,
  kSymRock,
  kSymExit,
  kSymOpenExit,
  kSymDoor,
  kSymMagicWall,
]);

export const symDirtFaceSet = new Set([
  kSymDirtFace,
  kSymDirtFaceUp,
  kSymDirtFaceDown,
  kSymDirtFaceLeft,
  kSymDirtFaceRight,
]);

export const symExplodeFromRockSet = new Set([
  kSymDirtFace,
  kSymDirtFaceUp,
  kSymDirtFaceDown,
  kSymDirtFaceLeft,
  kSymDirtFaceRight,
  kSymButterfly,
  kSymGuard,
  kSymPatroller,
  kSymSideWalker,
]);

export const symOpenToPlayerSet = new Set([
  kSymDirt,
  kSymSpace,
  kSymDiamond,
  kSymEgg,
  kSymEggWiggle,
  kSymEggHatch,
  kSymEggOpen,
  kSymOpenExit,
  kSymDoor,
]);