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
  const removeKeys = [];

  const removeLRUKey = code => {
    lruDirKeys = lruDirKeys.filter(c => c.code !== code);
  };

  const removeIfSeen = code => {
    const newLRUDirKeys = lruDirKeys.filter(c => c.code !== code || !c.seen);
    const wasRemoved = newLRUDirKeys.length !== lruDirKeys.length;
    if (wasRemoved) {
      lruDirKeys = newLRUDirKeys;
    } else {
      removeKeys.push(code);
    }
  };

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
    removeIfSeen(code);
  });

  return function() {
    let bits = 0;
    for (const [key, bit] of fireKeysToBits.entries()) {
      bits |= (keyState.get(key) | latchedState.get(key)) ? bit : 0;
      latchedState.set(key, false);
    }
    if (lruDirKeys.length) {
      const key = lruDirKeys[lruDirKeys.length - 1];
      bits |= dirKeysToBits.get(key.code);
      key.seen = true;
    }
    while (removeKeys.length) {
      removeLRUKey(removeKeys.pop());
    }

    return bits;
  };
}