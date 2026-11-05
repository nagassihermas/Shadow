/**
 * Recomputes WCAG 2.x contrast ratios from the tokens in tailwind.config.ts.
 * Run with `npx tsx scripts/check-contrast.ts`; exits 1 if a pair is below target.
 */
import tailwindConfig from '../tailwind.config';

const c = tailwindConfig.theme?.extend?.colors as Record<string, any>;

const BODY_TEXT = 4.5;
const LARGE_OR_ICON = 3;

function toRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(foreground: number[], background: number[]): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** Colour of `tint` at `alpha` over `base`, as in bg-primary/20 on a card. */
function over(base: string, tint: string, alpha: number): number[] {
  const [b, t] = [toRgb(base), toRgb(tint)];
  return b.map((channel, i) => channel * (1 - alpha) + t[i] * alpha);
}

const pairs: Array<[string, number[], number[], number]> = [
  ['text / background', toRgb(c.text.DEFAULT), toRgb(c.background), BODY_TEXT],
  ['text / surface', toRgb(c.text.DEFAULT), toRgb(c.surface.DEFAULT), BODY_TEXT],
  ['muted / background', toRgb(c.text.muted), toRgb(c.background), BODY_TEXT],
  ['muted / surface', toRgb(c.text.muted), toRgb(c.surface.DEFAULT), BODY_TEXT],
  ['muted / elevated', toRgb(c.text.muted), toRgb(c.surface.elevated), BODY_TEXT],
  ['dim / surface (decorative only)', toRgb(c.text.dim), toRgb(c.surface.DEFAULT), LARGE_OR_ICON],
  ['primary / background', toRgb(c.primary.DEFAULT), toRgb(c.background), BODY_TEXT],
  ['primary / surface', toRgb(c.primary.DEFAULT), toRgb(c.surface.DEFAULT), BODY_TEXT],
  ['primary / elevated', toRgb(c.primary.DEFAULT), toRgb(c.surface.elevated), BODY_TEXT],
  ['secondary / surface', toRgb(c.secondary.DEFAULT), toRgb(c.surface.DEFAULT), BODY_TEXT],
  ['success / surface', toRgb(c.success.DEFAULT), toRgb(c.surface.DEFAULT), BODY_TEXT],
  ['danger / surface', toRgb(c.danger.DEFAULT), toRgb(c.surface.DEFAULT), BODY_TEXT],
  ['danger / elevated', toRgb(c.danger.DEFAULT), toRgb(c.surface.elevated), BODY_TEXT],
  ['background on primary', toRgb(c.background), toRgb(c.primary.DEFAULT), BODY_TEXT],
  ['background on primary.hover', toRgb(c.background), toRgb(c.primary.hover), BODY_TEXT],
  ['background on primary.light', toRgb(c.background), toRgb(c.primary.light), BODY_TEXT],
  ['background on secondary', toRgb(c.background), toRgb(c.secondary.DEFAULT), BODY_TEXT],
  ['background on danger', toRgb(c.background), toRgb(c.danger.DEFAULT), BODY_TEXT],
  ['primary on primary/20 badge', toRgb(c.primary.DEFAULT), over(c.surface.DEFAULT, c.primary.DEFAULT, 0.2), BODY_TEXT],
  ['secondary on secondary/20 badge', toRgb(c.secondary.DEFAULT), over(c.surface.DEFAULT, c.secondary.DEFAULT, 0.2), BODY_TEXT],
  ['text on danger/20 badge', toRgb(c.text.DEFAULT), over(c.surface.DEFAULT, c.danger.DEFAULT, 0.2), BODY_TEXT],
  ['text on success/20 badge', toRgb(c.text.DEFAULT), over(c.surface.DEFAULT, c.success.DEFAULT, 0.2), BODY_TEXT],
  ['surface.border star outline / surface', toRgb(c.surface.border), toRgb(c.surface.DEFAULT), 1],
];

let failures = 0;
for (const [name, foreground, background, target] of pairs) {
  const value = ratio(foreground, background);
  const ok = value >= target;
  if (!ok) failures += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${value.toFixed(2).padStart(5)}:1 (min ${target}) ${name}`);
}

process.exit(failures ? 1 : 0);
