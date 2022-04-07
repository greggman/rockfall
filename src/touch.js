/* eslint-env browser */

import {
  kUpBit,
  kDownBit,
  kLeftBit,
  kRightBit,
} from './input.js';

export function initTouch(target) {
  let touchBits = 0;

  const minTouchDistance = 4;
  let startX;
  let startY;
  let lastX;
  let lastY;

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
    lastX = startX;
    lastY = startY;
    touchBits = 0;
  }

  function handleTouchMove(ev) {
    ev.preventDefault();
    const touch = ev.touches[0];
    const newX = touch.clientX;
    const newY = touch.clientY;
    const bitsFromStart = inputBitsFromOldAndNewPositions(startX, startY, newX, newY);
    const bitsFromLast = inputBitsFromOldAndNewPositions(lastX, lastY, newX, newY);
    if (!bitsFromLast) {
      touchBits = bitsFromStart;
    } else {
      touchBits = bitsFromLast;
      startX = lastX;
      startY = lastY;
    }
    lastX = newX;
    lastY = newY;
  }

  function handleTouchEnd(ev) {
    ev.preventDefault();
    touchBits = 0;
  }

  target.addEventListener('touchstart', handleTouchStart, {passive: false});
  target.addEventListener('touchmove', handleTouchMove, {passive: false});
  target.addEventListener('touchend', handleTouchEnd, {passive: false});

  return () => {
    return touchBits;
  };
}
