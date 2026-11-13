/**
 * When each piece of the tree grows in on load. The tree grows from the roots
 * up, one generation every `GROW_STEP` ms: a generation's marriage bonds and
 * the branches leaving them start together, its members bloom a little later,
 * and the sprigs follow once the tree stands.
 */
export const GROW_STEP = 380;

/** A branch from generation `gen` down to its child. */
export const branchDelay = (gen: number): number => gen * GROW_STEP + 200;

/** A marriage bond in generation `gen`: it grows alongside the branches it feeds. */
export const bondDelay = (gen: number): number => branchDelay(gen);

/** A member of generation `gen` (their element and their name). */
export const memberDelay = (gen: number): number => gen * GROW_STEP + 520;

/** The `index`-th decorative sprig. */
export const sprigDelay = (index: number): number => 1500 + index * 60;
