/** Width of the wood that carries nobody further: a twig tip. */
export const TWIG_TIP = 8;
/** Width of wood carrying one person, and how quickly wood thickens with what it carries. */
const BASE = 14;
const PER_ROOT_PERSON = 29;

/**
 * How thick wood is where it carries `people` (the pipe model: a limb's cross-section grows with
 * everything above it, so its width grows with the square root). Every fork is thinner than the
 * wood it grows out of, since it carries only part of it.
 */
export function woodWidth(people: number): number {
  return BASE + PER_ROOT_PERSON * Math.sqrt(Math.max(1, people));
}

/**
 * Branch thickness: at its start, as thick as the people it carries require; at its tip, a twig
 * (or, for a limb that forks on, the thickest limb it hands on to, as the caller passes).
 * `generation` is kept for callers that know no weight: one person per generation step.
 */
export function branchWidths(generation: number, weight?: number): { start: number; end: number } {
  return { start: woodWidth(weight ?? 1), end: TWIG_TIP };
}
