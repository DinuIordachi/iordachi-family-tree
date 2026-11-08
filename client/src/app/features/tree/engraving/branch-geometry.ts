/** Branch thickness by generation (spec §5): thick near the trunk, thinner toward the crown. */
export function branchWidths(generation: number): { start: number; end: number } {
  const start = Math.max(6, 28 - 4 * generation);
  return { start, end: Math.max(2, start * 0.35) };
}
