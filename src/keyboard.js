/* eslint-env browser */
import {
  kUpBit,
  kDownBit,
  kLeftBit,
  kRightBit,
  kFireBit,
} from './input.js';

const dirKeysToBits = new Map([
    [ 'KeyW'       , kUpBit    ],
    [ 'KeyS'       , kDownBit  ],
    [ 'KeyA'       , kLeftBit  ],
    [ 'KeyD'       , kRightBit ],
    [ 'ArrowUp'    , kUpBit    ],
    [ 'ArrowDown'  , kDownBit  ],
    [ 'ArrowLeft'  , kLeftBit  ],
    [ 'ArrowRight' , kRightBit ],
]);

const fireKeysToBits = new Map([
  [ 'ShiftLeft'  , kFireBit  ],
  [ 'ShiftRight' , kFireBit  ],
]);

const keysToBits = new Map([
  ...dirKeysToBits,
  ...fireKeysToBits,
]);

export function initKeyboard(target) {
  const keyState = new Map();     // its state now
  const latchedState = new Map(); // was pressed since last time read

  // Store the directional keys in a least recently used array
  // and return the bits from the last key only. Since we don't use
  // diagonals this works.
  let lruDirKeys = [];
  const keysToRemove = [];

  const removeLRUKey = code => {
    lruDirKeys = lruDirKeys.filter(c => c.code !== code);
  };

let cnt = 0;

  target.addEventListener('keydown', ev => {
    const code = ev.code;
    keyState.set(code, true);
    latchedState.set(code, true);
    if (dirKeysToBits.has(code)) {
      removeLRUKey(code);
      lruDirKeys.push({code});
    }
  });
  target.addEventListener('keyup', ev => {
    const code = ev.code;
    keyState.set(code, false);
    keysToRemove.push(code);
  });

  return function(p) {
    if (p !== 0) {
      return 0;
    }
    let bits = 0;
    for (const [key, bit] of fireKeysToBits.entries()) {
      bits |= (keyState.get(key) | latchedState.get(key)) ? bit : 0;
      if (latchedState.get(key)) {
        latchedState.set(key, false);
      }
    }
    for (let i = keysToRemove.length - 1; i >= 0; --i) {
      const code = keysToRemove[i];
      const ndx = lruDirKeys.findIndex(c => c.code === code);
      if (ndx >= 0) {
        const key = lruDirKeys[ndx];
        if (key.seen) {
          removeLRUKey(code);
          keysToRemove.splice(i, 1);
        }
      }
    }
    if (lruDirKeys.length) {
      const key = lruDirKeys[lruDirKeys.length - 1];
      key.seen = true;
      const code = key.code;
      bits |= dirKeysToBits.get(code);
    }

    return bits;
  };
}