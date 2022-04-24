/* eslint-env browser */

export let ctx;
let debugElem;
const maxDebugLines = 30;
const debugLines = [];

export function init(settings) {
  if (settings.debugScrolling || settings.debugTouch) {
    ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.className = 'debug';
    document.body.appendChild(ctx.canvas);
    debugElem = document.createElement('pre');
    debugElem.className = 'debug';
    document.body.appendChild(debugElem);
  }

}

export function clearDebugText() {
  debugElem.textContent = '';
}

export function setDebugText(s) {
  debugElem.textContent = s;
}

export function log(...args) {
  debugLines.push(args.join(' '));
  if (debugLines.length > maxDebugLines) {
    debugLines.shift();
  }
  setDebugText(debugLines.join('\n'));
}