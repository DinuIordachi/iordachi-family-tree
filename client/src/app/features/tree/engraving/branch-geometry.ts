/**
 * Branch thickness (spec §5): thick near the trunk, thinner toward the crown. Given the people a limb
 * carries, a light side limb is thinner than the main line of its generation (pipe model: thickness
 * grows with the square root of what it carries).
 */
export function branchWidths(generation: number, weight?: number): { start: number; end: number } {
  const byGeneration = Math.max(6, 28 - 4 * generation);
  const start = weight === undefined ? byGeneration : Math.min(byGeneration, Math.max(6, 4 + 9 * Math.sqrt(weight)));
  return { start, end: Math.max(2, start * 0.25) };
}
