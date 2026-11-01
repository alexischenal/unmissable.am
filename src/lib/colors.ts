// src/lib/colors.ts
// When two teams' primary colors are too close (Philadelphia and New York: the same blue),
// the diagonal disappears and the card no longer shows two teams. Then, in this order:
//   1. the home team switches to its secondary color, if white text stays readable on it (a touch darker
//      when needed: Philadelphia's red);
//   2. otherwise the away team does;
//   3. otherwise the home team's color gets darker (or lighter, if it's already very dark).
// Pure functions, tested in colors.test.ts.

type Rgb = [number, number, number];

const rgb = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

// CIE Lab: a color space where distances match what the eye sees
function lab(hex: string): Rgb {
  const [r, g, b] = rgb(hex).map(linear) as Rgb;
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// Perceived difference between two colors (CIE76 ΔE): ~2 barely visible, 50+ very different
export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// WCAG contrast ratio between white and a color
export function contrastWithWhite(hex: string): number {
  const [r, g, b] = rgb(hex).map(linear) as Rgb;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}

export const MIN_DISTANCE = 25; // below this, the two halves look like one color
export const MIN_CONTRAST = 4.5; // WCAG minimum for normal text: the city above each name is small

export type Colors = { primary: string; secondary: string };

// Background (primary) and stripe (secondary) of each half
export function cardColors(away: Colors, home: Colors): { away: Colors; home: Colors } {
  if (colorDistance(away.primary, home.primary) >= MIN_DISTANCE) return { away, home };

  // The secondary color as a background, darkened by up to 20% if white text needs it (null: still unreadable)
  const readable = (hex: string): string | null => {
    for (let t = 0; t <= 0.2; t += 0.02) {
      const shade = t === 0 ? hex : mix(hex, '#000000', t);
      if (contrastWithWhite(shade) >= MIN_CONTRAST) return shade;
    }
    return null;
  };
  const works = (candidate: string, other: string) =>
    colorDistance(candidate, other) >= MIN_DISTANCE && contrastWithWhite(candidate) >= MIN_CONTRAST;
  const swap = (c: Colors, other: string): Colors | null => {
    const primary = readable(c.secondary);
    return primary && works(primary, other) ? { primary, secondary: c.primary } : null;
  };

  const homeSwapped = swap(home, away.primary);
  if (homeSwapped) return { away, home: homeSwapped };
  const awaySwapped = swap(away, home.primary);
  if (awaySwapped) return { away: awaySwapped, home };

  // No readable secondary color (light ones like gold or silver): a shade of the home color
  const shades = [
    ...[0.45, 0.6, 0.75].map((t) => mix(home.primary, '#000000', t)), // darker
    ...[0.25, 0.35, 0.45].map((t) => mix(home.primary, '#FFFFFF', t)), // lighter (already very dark colors)
  ];
  for (const shade of shades) {
    if (works(shade, away.primary)) return { away, home: { ...home, primary: shade } };
  }
  return { away, home };
}

// A color mixed with another one: mix('#006BB6', '#000000', 0.45) = 45% darker
function mix(hex: string, other: string, amount: number): string {
  const [a, b] = [rgb(hex), rgb(other)];
  return '#' + a.map((c, i) => Math.round(c + (b[i]! - c) * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}
