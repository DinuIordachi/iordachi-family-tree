import { seededRandom } from './seeded-random';
import { MotifId, MotifPlacement, Point, TreeLayout } from './types';

export const FIXED_MOTIFS: MotifId[] = ['stefan-cel-mare', 'molda-hound', 'aurochs-shield', 'eagle-cross', 'river-moldova'];
export const SCATTER_MOTIFS: MotifId[] = ['grapevine', 'perched-falcon', 'star-rose-crescent', 'oak-sprig', 'putna-church'];

const MIN_GAP = 90;
const OFFSETS = [60, 110];
const ALONG = [0.5, 0.35, 0.65];
const ORNAMENT_HALF = 40;
/** A medallion's banner and years occupy y + 44 … y + 94 below its centre. */
const BANNER_TOP = 44;
const BANNER_BOTTOM = 94;

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Fixed motifs around the trunk and crown, plus seeded ornaments in empty crown space (spec §6).
 * `bannerHalf` is half a banner's width (half the person slot), so ornaments never cover names or years.
 */
export function placeMotifs(layout: TreeLayout, seed: number, bannerHalf = 85): MotifPlacement[] {
  const { trunk, bounds } = layout;
  const groundY = trunk.base.y;
  const bx = trunk.base.x;
  // Ștefan kneels left of the trunk; Molda sits between him and the trunk, her head under his outstretched hand.
  const group = bx - 188;
  const shieldX = bx;
  const fixed: MotifPlacement[] = [
    { motif: 'stefan-cel-mare', center: { x: group - 62, y: groundY - 112 }, scale: 1, mirrored: false },
    { motif: 'molda-hound', center: { x: group + 62, y: groundY - 78 }, scale: 1, mirrored: false },
    { motif: 'aurochs-shield', center: { x: shieldX, y: groundY - 120 }, scale: 0.8, mirrored: false },
    { motif: 'eagle-cross', center: { x: bx, y: bounds.minY - 150 }, scale: 1, mirrored: false },
    {
      motif: 'river-moldova',
      center: { x: bx, y: groundY - 30 },
      scale: (bounds.maxX - bounds.minX + 600) / 600,
      mirrored: false,
    },
  ];

  const rnd = seededRandom(seed);
  const target = Math.min(8, Math.max(2, Math.floor(layout.members.length / 4)));
  const candidates: Point[] = [];
  for (const b of layout.branches) {
    const dx = b.to.x - b.from.x;
    const dy = b.to.y - b.from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      continue;
    }
    const nx = -dy / len;
    const ny = dx / len;
    for (const t of ALONG) {
      const at = { x: b.from.x + dx * t, y: b.from.y + dy * t };
      for (const off of OFFSETS) {
        candidates.push({ x: at.x + nx * off, y: at.y + ny * off }, { x: at.x - nx * off, y: at.y - ny * off });
      }
    }
  }

  // Generation rows leave almost no vertical room between a banner and the next row's medallions,
  // so ornaments may also sit beside the outermost banner of each row, in the crown's edge foliage.
  for (const m of layout.members) {
    for (const side of [-1, 1]) {
      candidates.push({ x: m.center.x + side * (bannerHalf + ORNAMENT_HALF + 12), y: m.center.y + 20 });
    }
  }

  // the founders sit among the roots: ornaments belong in the crown, clear of the ground line
  const aboveGround = candidates.filter((c) => c.y + ORNAMENT_HALF <= groundY - 20);
  candidates.length = 0;
  candidates.push(...aboveGround);

  const order = shuffle(SCATTER_MOTIFS, rnd);
  const scattered: MotifPlacement[] = [];
  for (const c of shuffle(candidates, rnd)) {
    if (scattered.length >= target) {
      break;
    }
    const clearOfBanners = layout.members.every(
      (m) =>
        Math.abs(c.x - m.center.x) >= ORNAMENT_HALF + bannerHalf ||
        c.y + ORNAMENT_HALF <= m.center.y + BANNER_TOP ||
        c.y - ORNAMENT_HALF >= m.center.y + BANNER_BOTTOM,
    );
    const clear =
      clearOfBanners &&
      layout.members.every((m) => dist(m.center, c) >= MIN_GAP) &&
      scattered.every((s) => dist(s.center, c) >= MIN_GAP);
    if (clear) {
      scattered.push({ motif: order[scattered.length % order.length], center: c, scale: 1, mirrored: rnd() < 0.5 });
    }
  }
  return [...fixed, ...scattered];
}
