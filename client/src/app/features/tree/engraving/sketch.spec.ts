import { ribbonOutline } from './sketch';

describe('ribbonOutline', () => {
  it('rounds its far end outward, past the tip, never notching into the wood', () => {
    // a ribbon running right along y = 0, 4 wide: its cap runs from (10, 2) round through (12, 0) to (10, -2),
    // which in SVG's y-down frame is the counter-clockwise arc (sweep flag 0)
    const d = ribbonOutline([{ x: 0, y: 0 }, { x: 10, y: 0 }], [2, 2]);
    expect(d).toContain('A2 2 0 0 0 10 -2');
  });
});
