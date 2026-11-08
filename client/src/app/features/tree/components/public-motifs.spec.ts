import { existsSync, readFileSync } from 'node:fs';
import { FIXED_MOTIFS, SCATTER_MOTIFS } from '../engraving/motif-placement';

const dir = `${process.cwd()}/public/motifs`;
const files = [...FIXED_MOTIFS, ...SCATTER_MOTIFS, 'silhouette-m', 'silhouette-f', 'silhouette-u'];

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
