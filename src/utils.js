
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

