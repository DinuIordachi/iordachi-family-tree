import { existsSync, readFileSync } from 'node:fs';
import { FIXED_MOTIFS, SCATTER_MOTIFS } from '../engraving/motif-placement';
import { FRUIT_KINDS } from '../engraving/fruits';

const dir = `${process.cwd()}/public/motifs`;
// Ștefan and Molda no longer stand on the ground, but their artwork is kept and still checked
const files = [...FIXED_MOTIFS, ...SCATTER_MOTIFS, 'stefan-cel-mare', 'molda-hound', 'silhouette-m', 'silhouette-f', 'silhouette-u'];

describe('motif artwork files', () => {
  for (const id of files) {
    describe(id, () => {
      const path = `${dir}/${id}.svg`;

      it('exists', () => expect(existsSync(path)).toBe(true));

      it('is well-formed XML', () => {
        const doc = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'image/svg+xml');
        expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
      });

      it('exposes one themeable symbol with a viewBox', () => {
        const svg = readFileSync(path, 'utf8');
        expect(svg).toMatch(/<symbol id="motif"[^>]*viewBox="[\d.\s-]+"/);
        expect(svg.match(/<symbol /g)).toHaveLength(1);
      });

      it('puts its base paint on an inner group, not on <symbol> (dropped by Chrome for external <use>)', () => {
        const svg = readFileSync(path, 'utf8');
        expect(svg).not.toMatch(/<symbol [^>]*style=/);
      });

      it('uses no hard-coded hex colours', () => {
        const svg = readFileSync(path, 'utf8');
        expect(svg).not.toMatch(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b(?![\w-])/);
      });

      it('shades with line hatching, not gradients', () => {
        const svg = readFileSync(path, 'utf8');
        expect(svg).not.toMatch(/Gradient/);
        expect(svg).toMatch(/class="hatch"/);
      });
    });
  }
});

describe('fruit artwork files', () => {
  for (const kind of FRUIT_KINDS) {
    describe(kind, () => {
      const path = `${dir}/fruit-${kind}.svg`;

      it('exists and is well-formed XML', () => {
        expect(existsSync(path)).toBe(true);
        const doc = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'image/svg+xml');
        expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
      });

      it('exposes one themeable "fruit" symbol, painted from an inner group', () => {
        const svg = readFileSync(path, 'utf8');
        expect(svg).toMatch(/<symbol id="fruit"[^>]*viewBox="[\d.\s-]+"/);
        expect(svg.match(/<symbol /g)).toHaveLength(1);
        expect(svg).not.toMatch(/<symbol [^>]*style=/);
      });

      it('takes every colour from the tree theme', () => {
        const svg = readFileSync(path, 'utf8');
        expect(svg).not.toMatch(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b(?![\w-])/);
        expect(svg).toMatch(/var\(--et-/);
      });
    });
  }
});
