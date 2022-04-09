/* eslint-env browser */
import {
  kUpBit,
  kDownBit,
  kLeftBit,
  kRightBit,
  kFireBit,
} from './input.js';

const playerKeysToBits = [
  new Map([
    [ 'KeyW'     , kUpBit    ],
    [ 'KeyS'     , kDownBit  ],
    [ 'KeyA'     , kLeftBit  ],
    [ 'KeyD'     , kRightBit ],
    [ 'ShiftLeft', kFireBit  ],
  ]),
  new Map([
    [ 'ArrowUp'    , kUpBit    ],
    [ 'ArrowDown'  , kDownBit  ],
    [ 'ArrowLeft'  , kLeftBit  ],
    [ 'ArrowRight' , kRightBit ],
    [ 'ShiftRight' , kFireBit  ],
  ]),
];

export function initKeyboard(target) {
  const keyState = new Map();     // its state now
  const latchedState = new Map(); // was pressed since last time read
  target.addEventListener('keydown', e => {
    keyState.set(e.code, true);
    latchedState.set(e.code, true);
  });
  target.addEventListener('keyup', e => {
    keyState.set(e.code, false);
  });

  return function(p) {
    const keysToBits = playerKeysToBits[p];
    let bits = 0;
    if (keysToBits) {
      for (const [key, bit] of keysToBits.entries()) {
        bits |= (keyState.get(key) | latchedState.get(key)) ? bit : 0;
        latchedState.set(key, false);
      }
    }
    return bits;
  };
}