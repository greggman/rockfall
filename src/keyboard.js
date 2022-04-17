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

export function initKeyboard(target) {
  const keyState = new Map();     // its state now
  const latchedState = new Map(); // was pressed since last time read

  // Store the directional keys in a least recently used array
  // and return the bits from the last key only. Since we don't use
  // diagonals this works.
  let lruDirKeys = [];

  const removeLRUKey = code => {
    lruDirKeys = lruDirKeys.filter(c => c !== code);
  };

  target.addEventListener('keydown', ev => {
    const code = ev.code;
    keyState.set(code, true);
    latchedState.set(code, true);
    if (dirKeysToBits.has(code)) {
      removeLRUKey(code);
      lruDirKeys.push(code);
    }
  });
  target.addEventListener('keyup', ev => {
    const code = ev.code;
    keyState.set(code, false);
    removeLRUKey(code);
  });

  return function() {
    let bits = 0;
    for (const [key, bit] of fireKeysToBits.entries()) {
      bits |= (keyState.get(key) | latchedState.get(key)) ? bit : 0;
      latchedState.set(key, false);
    }
    if (lruDirKeys.length) {
      bits |= dirKeysToBits.get(lruDirKeys[lruDirKeys.length - 1]);
    }
    return bits;
  };
}