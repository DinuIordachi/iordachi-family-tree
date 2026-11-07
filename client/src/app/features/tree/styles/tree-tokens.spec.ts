import { readFileSync } from 'node:fs';

const source = readFileSync(`${process.cwd()}/src/app/features/tree/styles/tree-tokens.scss`, 'utf8');
const [lightBlock, darkBlock] = source.split(':root.app-dark .engraved-tree');

function token(block: string, name: string): string {
  const m = block.match(new RegExp(`--et-${name}:\\s*([^;]+);`));
  if (!m) {
    throw new Error(`missing --et-${name}`);
  }
  return m[1].trim();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tree tokens', () => {
  it('defines the spec palette verbatim', () => {
    const light = { paper: '#efe3c6', 'paper-shade': '#d9c49a', ink: '#2b1d12', 'ink-soft': '#5a4330', sepia: '#8a5a2b', gilt: '#b08a3e', oxblood: '#7a2e22', focus: '#1f5f8b' };
    const dark = { paper: '#2a1f17', 'paper-shade': '#1c140e', ink: '#ead9b0', 'ink-soft': '#b89f74', sepia: '#c08a4c', gilt: '#e0b862', oxblood: '#c4614e', focus: '#8cc4ec' };
    for (const [k, v] of Object.entries(light)) expect(token(lightBlock, k)).toBe(v);
    for (const [k, v] of Object.entries(dark)) expect(token(darkBlock, k)).toBe(v);
  });

  it('defines strokes, motion and sizes', () => {
    expect(token(lightBlock, 'stroke-hair')).toBe('0.6');
    expect(token(lightBlock, 'stroke-fine')).toBe('1');
    expect(token(lightBlock, 'stroke-main')).toBe('1.6');
    expect(token(lightBlock, 'stroke-bold')).toBe('2.4');
    expect(token(lightBlock, 'dur-grow')).toBe('1600ms');
    expect(token(lightBlock, 'ease')).toBe('cubic-bezier(.2,.7,.2,1)');
    expect(token(lightBlock, 'size-name')).toBe('15px');
    expect(token(lightBlock, 'size-years')).toBe('12px');
  });

  for (const [theme, block] of [['parchment', () => lightBlock], ['candlelit', () => darkBlock]] as const) {
    it(`${theme}: ink on paper is at least 7:1`, () =>
      expect(contrast(token(block(), 'ink'), token(block(), 'paper'))).toBeGreaterThanOrEqual(7));
    it(`${theme}: soft ink on paper is at least 4.5:1`, () =>
      expect(contrast(token(block(), 'ink-soft'), token(block(), 'paper'))).toBeGreaterThanOrEqual(4.5));
  }
});
