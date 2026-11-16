import { MotifId, MotifPlacement, TreeLayout } from './types';

export const FIXED_MOTIFS: MotifId[] = ['aurochs-shield', 'eagle-cross', 'river-moldova'];
/**
 * The old crown ornaments. They are no longer placed: the Moldovan symbols hanging from the twigs as
 * fruit (see fruits.ts) fill the crown instead. The artwork is kept and still checked.
 */
export const SCATTER_MOTIFS: MotifId[] = ['grapevine', 'perched-falcon', 'star-rose-crescent', 'oak-sprig', 'putna-church'];

/**
 * The fixed motifs: the aurochs shield on the trunk, the arms crowning the tree and the river on the
 * horizon. `seed` and `bannerHalf` are kept so callers need not change; nothing here is random now.
 */
export function placeMotifs(layout: TreeLayout, _seed?: number, _bannerHalf?: number): MotifPlacement[] {
  const { trunk, bounds } = layout;
  const groundY = trunk.base.y;
  const bx = trunk.base.x;
  return [
    { motif: 'aurochs-shield', center: { x: bx, y: groundY - 120 }, scale: 0.8, mirrored: false },
    { motif: 'eagle-cross', center: { x: bx, y: bounds.minY - 150 }, scale: 1, mirrored: false },
    {
      motif: 'river-moldova',
      center: { x: bx, y: groundY - 30 },
      scale: (bounds.maxX - bounds.minX + 600) / 600,
      mirrored: false,
    },
  ];
}
