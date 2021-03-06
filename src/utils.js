/* eslint-env browser */
export const rgb = (r, g, b) => `rgb(${r * 256 | 0}, ${g * 256 | 0}, ${b * 256 | 0})`;
export const lerp = (a, b, t) => a + (b - a) * t;
export const mixArray = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

export function minMagnitude(v, min) {
  return Math.sign(v) * Math.min(Math.abs(v), min);
}

export const basename = s => {
  const slashNdx = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  return s.substring(slashNdx + 1);
};

export const basenameNoExt = s => {
  const base = basename(s);
  const period = base.lastIndexOf('.');
  return period >= 0 ? base.substring(0, period) : base;
};

export function parseBool(s) {
  if (s[0] === 'f' || s[0] === 'F') {
    return false; // assume false
  }
  const v = parseFloat(s);
  return Number.isNaN(v)
     ? true
     : v !== 0;
}

export function parseAsMatchingType(oldV, s) {
  switch (typeof oldV) {
    case 'boolean':
      return parseBool(s);
    case 'number': {
       const v = parseFloat(s);
       if (Number.isNaN(v)) {
         throw Error(`'${s} is not a number`);
       }
       return v;
    }
    default: // string
      return s;
  }
}

export function applyQuerySettings(settings) {
  for (const [k, v] of (new URLSearchParams(window.location.search).entries())) {
    const oldV = settings[k];
    if (oldV === undefined) {
      console.error(`unknown setting: ${k}`);
      continue;
    }
    settings[k] = parseAsMatchingType(oldV, v);
  }
}

export function shuffleArray(array, randFn = Math.random) {
  for (let i = 0; i < array.length; ++i) {
    const ndx = randFn() * array.length | 0;
    const t = array[i];
    array[i] = array[ndx];
    array[ndx] = t;
  }
}

export function randInt(min, max) {
  return rand(min, max) | 0;
}

export function rand(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.random() * (max - min);
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const clamp11 = v => clamp(v, -1, 1);
export const snorm8 = v => clamp(((v + 1) * 128) - 128, -128, 127);
const sn = v => (snorm8(v) + 256) & 0xFF;
export const snorm32 = (r, g, b, a) => sn(r) | (sn(g) << 8) | (sn(b) << 16) | (sn(a) << 24);

const RANDOM_RANGE = Math.pow(2, 32);
export class PseudoRandomNumberGenerator {
  constructor(seed = 0) {
    this.reset(seed);
  }
  reset(seed = 0) {
    this.seed = Math.abs(seed | 0);
  }
  random() {
    return (this.seed =
          (134775813 * this.seed + 1) %
          RANDOM_RANGE) / RANDOM_RANGE;
  }
  rand(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return this.random() * (max - min) + min;
  }
  randInt(min, max) {
    return this.rand(min, max) | 0;
  }
}
