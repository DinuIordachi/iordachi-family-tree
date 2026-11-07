import { seededRandom } from './seeded-random';
import { MotifId, MotifPlacement, Point, TreeLayout } from './types';

export const FIXED_MOTIFS: MotifId[] = ['stefan-cel-mare', 'molda-hound', 'aurochs-shield', 'eagle-cross', 'river-moldova'];
export const SCATTER_MOTIFS: MotifId[] = ['grapevine', 'perched-falcon', 'star-rose-crescent', 'oak-sprig', 'putna-church'];

const MIN_GAP = 90;
const OFFSET = 60;

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Fixed motifs around the trunk and crown, plus seeded ornaments in empty crown space (spec §6). */
export function placeMotifs(layout: TreeLayout, seed: number): MotifPlacement[] {
  const { trunk, bounds } = layout;
  const groundY = trunk.base.y;
  const bx = trunk.base.x;
  const fixed: MotifPlacement[] = [
    { motif: 'stefan-cel-mare', center: { x: bx - 230, y: groundY - 70 }, scale: 1, mirrored: false },
    { motif: 'molda-hound', center: { x: bx + 230, y: groundY - 30 }, scale: 1, mirrored: true },
    { motif: 'aurochs-shield', center: { x: bx, y: groundY - 120 }, scale: 0.8, mirrored: false },
    { motif: 'eagle-cross', center: { x: bx, y: bounds.minY - 130 }, scale: 1, mirrored: false },
    {
      motif: 'river-moldova',
      center: { x: bx, y: groundY + 40 },
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
    const mid = { x: (b.from.x + b.to.x) / 2, y: (b.from.y + b.to.y) / 2 };
    const nx = -dy / len;
    const ny = dx / len;
    candidates.push({ x: mid.x + nx * OFFSET, y: mid.y + ny * OFFSET }, { x: mid.x - nx * OFFSET, y: mid.y - ny * OFFSET });
  }

  const order = shuffle(SCATTER_MOTIFS, rnd);
  const scattered: MotifPlacement[] = [];
  for (const c of shuffle(candidates, rnd)) {
    if (scattered.length >= target) {
      break;
    }
    const clear =
      layout.members.every((m) => dist(m.center, c) >= MIN_GAP) && scattered.every((s) => dist(s.center, c) >= MIN_GAP);
    if (clear) {
      scattered.push({ motif: order[scattered.length % order.length], center: c, scale: 1, mirrored: rnd() < 0.5 });
    }
  }
  return [...fixed, ...scattered];
}
