
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

export function shuffleArray(array) {
  for (let i = 0; i < array.length; ++i) {
    const ndx = Math.random() * array.length | 0;
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
