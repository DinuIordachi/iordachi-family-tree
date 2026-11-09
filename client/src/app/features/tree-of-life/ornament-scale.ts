import { ORNAMENT_ELEMENTS, ORNAMENT_LINE, OrnamentKind } from './ornament-elements';

/**
 * The one line weight of the Tree of Life. Every stroke — stem, branches,
 * bonds, sprigs, the girdle and the outlines inside every element — is drawn
 * at this weight, as in the ornament.
 */
export const LINE = 14;

/** How an element is drawn: at line weight in the tree, or fitted to a box as a UI icon. */
export type MotifSize = 'line' | 'icon';

/** Elements keep the ornament's own proportion to the line weight. */
const LINE_RATIO = LINE / ORNAMENT_LINE;
/** UI icons (legend, loader) only: fitted to a box, line weight not preserved. */
const ICON_BOX = 58;

export function motifScale(kind: OrnamentKind, size: MotifSize = 'line'): number {
  const e = ORNAMENT_ELEMENTS[kind];
  return size === 'line' ? LINE_RATIO : ICON_BOX / Math.max(e.w, e.h);
}

/** Half width/height of an element as drawn in the tree. */
export function motifHalf(kind: OrnamentKind): { w: number; h: number } {
  const e = ORNAMENT_ELEMENTS[kind];
  return { w: (e.w * LINE_RATIO) / 2, h: (e.h * LINE_RATIO) / 2 };
}
