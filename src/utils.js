
export const rgb = (r, g, b) => `rgb(${r * 256 | 0}, ${g * 256 | 0}, ${b * 256 | 0})`;
export const lerp = (a, b, t) => a + (b - a) * t;

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

export function randInt(max) {
  return Math.random() * max | 0;
}
