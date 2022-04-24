/* eslint-env browser */
import {
  log as debugLog,
} from './debug.js';
import {
  kUpBit,
  kDownBit,
  kLeftBit,
  kRightBit,
} from './input.js';

// const kLRBits = kLeftBit | kRightBit;
// const kUDBits = kUpBit | kDownBit;

export function initTouch(target, settings) {
  const log = settings.debugTouch
      ? (...args) => {
        console.log(...args);
        debugLog(...args);
      }
      : () => {};
  let touchBits = 0;
  let latchBits = 0;
  let start = false;

  const minTouchDistance = 8;
  let startX;
  let startY;
//  let lastX;
//  let lastY;

  function inputBitsFromOldAndNewPositions(oldX, oldY, newX, newY) {
    const deltaX = newX - oldX;
    const deltaY = newY - oldY;
    const absDX = Math.abs(deltaX);
    const absDY = Math.abs(deltaY);
    const maxDelta = Math.max(absDX, absDY);
    let touchBits = 0;
    if (maxDelta > minTouchDistance) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // left/right
        touchBits = deltaX > 0 ? kRightBit : kLeftBit;
      } else {
        // up/down
        touchBits = deltaY > 0 ? kDownBit : kUpBit;
      }
    }
    return touchBits;
  }

  function handleTouchStart(ev) {
    ev.preventDefault();
    const touch = ev.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
//    lastX = startX;
//    lastY = startY;
    touchBits = 0;
    start = true;
    log('start:');
  }

  /*

  states:
     have direction
        start => new

     have no direction
        got direction
  */

  function handleTouchMove(ev) {
    ev.preventDefault();
    const touch = ev.touches[0];
    const newX = touch.clientX;
    const newY = touch.clientY;
    if (!touchBits) {
      // user has not moved yet
      touchBits = inputBitsFromOldAndNewPositions(startX, startY, newX, newY);
      if (touchBits) {
        startX = newX;
        startY = newY;
      }
    } else {
      // user has moved, is the new position different?
      const newBits = inputBitsFromOldAndNewPositions(startX, startY, newX, newY);
      if (newBits) {
        touchBits = newBits;
        startX = newX;
        startY = newY;
      }
    }
    if (touchBits) {
      if (start) {
        latchBits = touchBits;
        start = false;
      }
    }
    log(`move: ds(${newX - startX},${newY - startY}), ${touchBits}`);
//    // remove opposites.
//    // I'm sure there's simpler way but
//    const lrBits = touchBits & kLRBits;
//    const udBits = touchBits & kUDBits;
//    const clearBits = (lrBits ? (lrBits ^ kLRBits) : 0) |
//                      (udBits ? (udBits ^ kUDBits) : 0);
//    latchBits &= 0xFFFF ^ clearBits;
//
//    lastX = newX;
//    lastY = newY;
  }

  function handleTouchEnd(ev) {
    ev.preventDefault();
    touchBits = 0;
  }

  target.addEventListener('touchstart', handleTouchStart, {passive: false});
  target.addEventListener('touchmove', handleTouchMove, {passive: false});
  target.addEventListener('touchend', handleTouchEnd, {passive: false});

  return () => {
    const bits = touchBits | latchBits;
    latchBits = 0;
    return bits;
  };
}
