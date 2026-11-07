# Engraved Family Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the family-chart card grid on `/tree` with a custom SVG copperplate-engraving tree. Ancestors sit at the roots, and Moldovan motifs appear around the trunk and in the crown.

**Architecture:** The geometry is built from pure TypeScript functions that are unit-tested in isolation:
- `households` turns members into a household forest.
- `layout` positions households with d3-hierarchy and flips the result so generations grow upward.
- `branch-geometry` produces tapered organic branch paths.
- `motif-placement` decides where ornaments go.
- `lineage` finds the branches from a member down to the trunk.

A thin layer of Angular SVG attribute components renders that geometry: canvas, defs, medallion, banner, and motif. Engraving texture comes from SVG filters and patterns. Motif art is one SVG file per motif under `client/public/motifs/`, referenced with `<use>`.

**Tech Stack:** Angular 21 (standalone, signals, zoneless-compatible), d3-hierarchy, d3-zoom and d3-selection (all three are explicit dependencies), PrimeNG 21 `Drawer`, `@fontsource` fonts, and Vitest through `@angular/build:unit-test`.

**Spec:** `docs/superpowers/specs/2026-11-07-engraved-tree-design.md`

## Global Constraints

- All work happens in `client/` on branch `feat/engraved-tree`. Commit messages must not carry a `Co-Authored-By` trailer.
- npm commands need `--registry=https://registry.npmjs.org`, because the user's global `~/.npmrc` points at an unreachable private registry.
- Token values, sizes, spacings, durations and the motif ids are taken **verbatim** from spec §5–§6. Do not invent new values.
- Colors are defined **only** in `tree-tokens.scss`. Components and motif SVGs use `var(--et-*)` or `currentColor`, never hex literals.
- Layout and ornament placement are deterministic: use `seededRandom` everywhere and never `Math.random`.
- `prefers-reduced-motion: reduce` means no animation.
- The test command is `npx ng test --watch=false` from `client/`. To run one file, add `--include <path>`.
- Backend API: `GET http://iordachi-family-tree.test/api/v1/family-tree` returns `FamilyMember[]` (see `src/app/core/models/family-member.model.ts`).
- Medallions are keyboard reachable and carry `aria-label`s as specified in §6.

## Review Focus

1. **A member whose parents are recorded but who is also a spouse of someone whose parents are recorded** (both spouses come from the tree). The household must appear exactly once, attached under the parent household of its lowest-id member that has parents. The test goes in Task 2.
2. **Cyclic or contradictory relations from bad data**, such as A being both parent and child of B. Layout must terminate, and the members involved go to `unplacedMemberIds` instead of hanging or duplicating. The test goes in Task 2.
3. **Isolated members with no relations, or a childless root household while another root has descendants.** These go to the "Alii" list and are never dropped. The test goes in Task 2.
4. **Very wide generations (10+ siblings) or a single-member tree.** Medallions must not overlap, and fit-to-view must still frame the tree. The test goes in Task 3.
5. **Missing names, birthdays or thumbnails, or a broken thumbnail URL.** The banner degrades gracefully: a first name alone or "Unknown", no "NaN" years, and the silhouette fallback on image error. The tests go in Tasks 1 and 7.

---

## File Structure (all under `client/src/app/features/tree/`)

| File | Responsibility |
|---|---|
| `engraving/seeded-random.ts` | `seededRandom`, `hashSeed` |
| `engraving/member-text.ts` | name and lifespan strings, aria label |
| `engraving/households.ts` | members → `HouseholdForest` |
| `engraving/layout.ts` | `HouseholdForest` → `TreeLayout` |
| `engraving/lineage.ts` | member → branch ids down to the trunk |
| `engraving/branch-geometry.ts` | `branchPath`, `trunkPath`, `rootsPath` |
| `engraving/motif-placement.ts` | fixed and scattered `MotifPlacement[]` |
| `engraving/types.ts` | shared interfaces (below) |
| `engraving/testing/member-factory.ts` | `member(id, rels?, data?)` test builder |
| `styles/tree-tokens.scss` | spec §5 tokens for both themes |
| `components/engraving-defs.component.ts` | `<defs>`: filters, hatching and stipple patterns, clip paths |
| `components/medallion.component.ts` | `g[etMedallion]` |
| `components/banner.component.ts` | `g[etBanner]` |
| `components/motif.component.ts` | `g[etMotif]` → `<use href="motifs/<id>.svg#motif">` |
| `components/engraved-tree.component.ts` | the `<svg>` canvas: zoom, render, hover lineage, growth classes |
| `components/member-panel.component.ts` | parchment `Drawer` detail panel |
| `tree.component.{ts,html,scss}` | page shell: fetch, loading, error, empty, retry |
| `client/public/motifs/*.svg` | the 10 motif files |

### `engraving/types.ts`

```ts
export interface Point { x: number; y: number }
export interface Household {
  id: string;                    // sorted member ids joined by '+', e.g. "3+4"
  memberIds: string[];           // ordered: blood member(s) first, then spouses; ties by numeric id
  parentHouseholdId: string | null;
  childHouseholdIds: string[];   // ordered by eldest member birthday, then id
}
export interface HouseholdForest {
  households: Map<string, Household>;
  rootIds: string[];             // founder households (have >=1 descendant), or the single household if it is the whole tree
  unplacedMemberIds: string[];   // isolated / cyclic members → "Alii" cartouche
}
export interface PlacedMember { id: string; householdId: string; center: Point; generation: number }
export interface BranchSegment {
  id: string;                    // `${parentHouseholdId ?? 'trunk'}>${childHouseholdId}`
  parentHouseholdId: string | null;
  childHouseholdId: string;
  from: Point; to: Point; generation: number; // generation of the child household
}
export interface TreeLayout {
  members: PlacedMember[];
  branches: BranchSegment[];
  trunk: { base: Point; top: Point };
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  generationCount: number;
  unplacedMemberIds: string[];
}
export type MotifId = 'stefan-cel-mare' | 'molda-hound' | 'aurochs-shield' | 'eagle-cross' | 'river-moldova'
  | 'grapevine' | 'perched-falcon' | 'star-rose-crescent' | 'oak-sprig' | 'putna-church';
export interface MotifPlacement { motif: MotifId; center: Point; scale: number; mirrored: boolean }
```

---

### Task 1: Test runner, seeded random, member text

**Files:**
- Modify: `client/angular.json` (add `architect.test`)
- Modify: `client/package.json` (devDeps `vitest`, `jsdom`)
- Create: `engraving/types.ts`, `engraving/seeded-random.ts`, `engraving/member-text.ts`, `engraving/testing/member-factory.ts`
- Test: `engraving/seeded-random.spec.ts`, `engraving/member-text.spec.ts`

**Interfaces:**
- Produces:
  - `seededRandom(seed: number): () => number` (mulberry32, returns values in [0, 1))
  - `hashSeed(...parts: string[]): number` (FNV-1a 32-bit)
  - `fullName(m: FamilyMember): string`
  - `lifespan(m: FamilyMember): string`
  - `memberAriaLabel(m: FamilyMember): string`
  - `member(id: string, rels?: Partial<FamilyMember['rels']>, data?: Partial<FamilyMember['data']> & { diedAt?: string | null }): FamilyMember`

- [ ] **Step 1: Add the runner.** Run `npm i -D vitest jsdom --registry=https://registry.npmjs.org`. Add `"test": { "builder": "@angular/build:unit-test", "options": { "tsConfig": "tsconfig.spec.json", "runner": "vitest", "buildTarget": "::development" } }` to `angular.json`.
- [ ] **Step 2: Write failing tests.**

```ts
// seeded-random.spec.ts
it('is deterministic per seed', () => {
  const a = seededRandom(42), b = seededRandom(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
it('stays in [0,1)', () => { const r = seededRandom(7); for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); } });
it('hashSeed differs by input', () => expect(hashSeed('1')).not.toBe(hashSeed('2')));

// member-text.spec.ts
expect(lifespan(member('1', {}, { birthday: '1925-04-12', diedAt: '1998-11-03T14:20:00+00:00' }))).toBe('1925 – 1998');
expect(lifespan(member('1', {}, { birthday: '1955-01-08' }))).toBe('1955 –');
expect(lifespan(member('1', {}, { birthday: 'garbage' }))).toBe('');      // Review Focus 5
expect(lifespan(member('1', {}, {}))).toBe('');
expect(fullName(member('1', {}, { 'first name': 'Ion', 'last name': 'Iordachi' }))).toBe('Ion Iordachi');
expect(fullName(member('1', {}, { 'first name': '', 'last name': 'Iordachi' }))).toBe('Unknown');
expect(memberAriaLabel(member('1', {}, { 'first name': 'Vasile', 'last name': 'Iordachi', birthday: '1925-04-12', diedAt: '1998-11-03T00:00:00Z' })))
  .toBe('Vasile Iordachi, born 1925, died 1998');
```

- [ ] **Step 3: Run tests.** Run `npx ng test --watch=false --include src/app/features/tree/engraving`. Expected: FAIL (modules missing).
- [ ] **Step 4: Implement** `types.ts` (verbatim from above), `seeded-random.ts`, `member-text.ts` and `member-factory.ts`. The factory defaults are `data: { 'first name': 'P'+id, gender: 'M' }`, empty rels, `deceased = !!diedAt`, `thumbnailUrl: null` and `media: []`. `lifespan` and `memberAriaLabel` read the death year from the top-level `diedAt`, matching the existing `lifespanDisplay`.
- [ ] **Step 5: Run tests.** Expected: PASS.
- [ ] **Step 6: Commit.** `git add client/angular.json client/package*.json client/src/app/features/tree/engraving && git commit -m "feat(tree): add vitest runner and engraving text/random utils"`

### Task 2: Household forest

**Files:** Create `engraving/households.ts`. Test `engraving/households.spec.ts`.

**Interfaces:**
- Consumes: `FamilyMember`, `member()`
- Produces: `buildHouseholds(members: FamilyMember[]): HouseholdForest`

Rules (spec §4):
- Spouse groups are the connected components over `rels.spouses`.
- The parent household is the household containing the parents of the household's **lowest-numeric-id member that has parents in the data**. Parent ids missing from the data are ignored.
- Roots are households without a parent household that have at least one child household. A lone household that is the entire tree is also a root.
- Every other parentless and childless household goes to `unplacedMemberIds`.
- Walk with a visited set. Any household reached twice through a parent cycle has its members moved to `unplacedMemberIds` and is detached.

- [ ] **Step 1: Write failing tests.**

```ts
const seed = [ // mirrors FamilyMemberSeeder: 1+2 → 3; 3+4 → 5,7; 5+6 → 8,9
  member('1', { spouses: ['2'], children: ['3'] }), member('2', { spouses: ['1'], children: ['3'] }),
  member('3', { parents: ['1','2'], spouses: ['4'], children: ['5','7'] }), member('4', { spouses: ['3'], children: ['5','7'] }),
  member('5', { parents: ['3','4'], spouses: ['6'], children: ['8','9'] }), member('6', { spouses: ['5'], children: ['8','9'] }),
  member('7', { parents: ['3','4'] }), member('8', { parents: ['5','6'] }), member('9', { parents: ['5','6'] }),
];
it('groups spouses and chains generations', () => {
  const f = buildHouseholds(seed);
  expect(f.rootIds).toEqual(['1+2']);
  expect(f.households.get('1+2')!.childHouseholdIds).toEqual(['3+4']);
  expect(f.households.get('3+4')!.childHouseholdIds).toEqual(['5+6', '7']);
  expect(f.households.get('5+6')!.memberIds).toEqual(['5', '6']);   // blood member first
  expect(f.unplacedMemberIds).toEqual([]);
});
it('places a household once when both spouses have parents in the tree', () => { /* Review Focus 1 */
  // 10+11 root → 12 ; 1+2 root → 3 ; 3 and 12 married → household '12+3' hangs under '1+2' (member 3 is the lowest id with parents)
  // assert: the household appears in exactly one childHouseholdIds list across the forest
});
it('terminates on cycles and parks the cyclic members', () => { /* Review Focus 2 */
  const f = buildHouseholds([member('1', { parents: ['2'], children: ['2'] }), member('2', { parents: ['1'], children: ['1'] })]);
  expect(f.unplacedMemberIds.sort()).toEqual(['1', '2']);
});
it('parks isolated members when a real tree exists', () => { /* Review Focus 3 */
  expect(buildHouseholds([...seed, member('99')]).unplacedMemberIds).toEqual(['99']);
});
it('treats a single person as the whole tree', () => expect(buildHouseholds([member('1')]).rootIds).toEqual(['1']));
it('handles empty input', () => expect(buildHouseholds([]).rootIds).toEqual([]));
```

- [ ] **Step 2: Run tests.** Run `npx ng test --watch=false --include src/app/features/tree/engraving/households.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `buildHouseholds`.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): build household forest from family members"`

### Task 3: Upward generational layout and lineage

**Files:** Create `engraving/layout.ts` and `engraving/lineage.ts`. Test `engraving/layout.spec.ts` and `engraving/lineage.spec.ts`. Add `d3-hierarchy`, `d3-zoom`, `d3-selection` and the matching `@types/*` packages as explicit deps.

**Interfaces:**
- Consumes: `buildHouseholds`, `HouseholdForest`
- Produces:
  - `layoutTree(forest: HouseholdForest, opts?: Partial<LayoutOptions>): TreeLayout`
  - `LayoutOptions = { generationSpacing: 190; personGap: 170; trunkHeight: 220; groundY: 0 }` (defaults from the spec)
  - `lineageBranchIds(memberId: string, layout: TreeLayout): string[]`, ordered from the member toward the trunk and ending with the `trunk>…` segment

Approach:
- Build a d3 `hierarchy` over a virtual root whose children are `rootIds`. Use `tree().nodeSize([personGap, generationSpacing]).separation((a, b) => (a.data.memberIds.length + b.data.memberIds.length) / 2 * (a.parent === b.parent ? 1 : 1.25))`.
- Household depth `d` (virtual root excluded, so founders have `d = 0`) gives `y = groundY - trunkHeight - d * generationSpacing`.
- Members are spread ±`personGap/2` around their household x.
- The trunk runs from `(meanRootX, groundY)` to `(meanRootX, groundY - trunkHeight)`.
- Each child household gets one `BranchSegment` from its parent household center (or the trunk top for founders) to its own center.

- [ ] **Step 1: Write failing tests.**

```ts
it('grows upward: each generation is higher (smaller y)', () => {
  const l = layoutTree(buildHouseholds(seed));
  const y = (id: string) => l.members.find(m => m.id === id)!.center.y;
  expect(y('3')).toBeLessThan(y('1')); expect(y('8')).toBeLessThan(y('5'));
  expect(y('1') - y('3')).toBe(190);
  expect(l.generationCount).toBe(4);
});
it('never overlaps medallions, even with 12 siblings', () => { /* Review Focus 4 */
  // founder 1+2 with children 3..14; assert every pair in the same generation has |dx| >= 170
});
it('trunk base is on the ground below the founders', () => {
  const l = layoutTree(buildHouseholds(seed));
  expect(l.trunk.base.y).toBe(0); expect(l.trunk.top.y).toBe(-220);
});
it('single member: one member at trunk top, no branches except trunk>1', () => { /* Review Focus 4 */ });
it('lineage of 8 walks 5+6 → 3+4 → 1+2 → trunk', () =>
  expect(lineageBranchIds('8', layoutTree(buildHouseholds(seed)))).toEqual(['5+6>8', '3+4>5+6', '1+2>3+4', 'trunk>1+2']));
```

Note: `'5+6>8'` exists because 8 is its own single-member household under `5+6`.

- [ ] **Step 2: Run tests.** Run them for `layout.spec.ts` and `lineage.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `layoutTree` and `lineageBranchIds`.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): upward generational layout and lineage lookup"`

### Task 4: Branch, trunk and root geometry

**Files:** Create `engraving/branch-geometry.ts`. Test `engraving/branch-geometry.spec.ts`.

**Interfaces:**
- Consumes: `BranchSegment`, `seededRandom` and `hashSeed`
- Produces:
  - `branchWidths(generation: number): { start: number; end: number }`. The start is `max(6, 28 − 4·g)` and the end is `max(2, start·0.35)`.
  - `branchPath(seg: BranchSegment): string`. A closed, filled outline: two offset cubic Béziers (left edge up, right edge back), joined by a rounded tip.
  - `trunkPath(trunk: TreeLayout['trunk'], widthAtBase = 90): string`, a flared base that narrows to 36 at the top.
  - `rootsPath(base: Point, seed: number): string`, 5–7 tapering roots spreading 140 units either side.

Branch shape: the curve leaves the parent vertically for the first 40% of `|dy|`, then bends toward the child. Each control point is jittered ±12 units by `seededRandom(hashSeed(seg.id))`.

- [ ] **Step 1: Write failing tests.**
  - `branchWidths(0)` returns `{start: 28, end: 9.8}`, and `branchWidths(9)` returns `{start: 6, end: 2.1}`.
  - `branchPath(seg)` starts with `M`, ends with `Z`, has no `NaN`, and returns the same string for the same `seg.id`.
  - The first coordinate of `branchPath(seg)` lies within `start/2 + 1` of `seg.from`.
  - The path changes when only the id changes (seeded jitter).
  - `trunkPath` and `rootsPath` have no `NaN`.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): organic tapered branch, trunk and root paths"`

### Task 5: Motif placement

**Files:** Create `engraving/motif-placement.ts`. Test `engraving/motif-placement.spec.ts`.

**Interfaces:**
- Consumes: `TreeLayout`, `seededRandom`, `MotifId`, `MotifPlacement`
- Produces:
  - `FIXED_MOTIFS: MotifId[] = ['stefan-cel-mare','molda-hound','aurochs-shield','eagle-cross','river-moldova']`
  - `SCATTER_MOTIFS: MotifId[] = ['grapevine','perched-falcon','star-rose-crescent','oak-sprig','putna-church']`
  - `placeMotifs(layout: TreeLayout, seed: number): MotifPlacement[]`

Fixed positions:

| Motif | Center | Scale | Mirrored |
|---|---|---|---|
| `stefan-cel-mare` | `(trunk.base.x − 230, groundY − 70)` | 1 | no |
| `molda-hound` | `(trunk.base.x + 230, groundY − 30)` | 1 | yes, faces the trunk |
| `aurochs-shield` | `(trunk.base.x, groundY − 120)` | 0.8 | no |
| `eagle-cross` | `(trunk.base.x, bounds.minY − 130)` | 1 | no |
| `river-moldova` | `(trunk.base.x, groundY + 40)` | `(maxX − minX + 600) / 600` | no |

Scattered placement (spec §6):
1. The count is `clamp(floor(members / 4), 2, 8)`.
2. The candidates are each branch midpoint, offset perpendicular by ±60 units.
3. Shuffle the candidates with the seeded RNG and accept them greedily. A candidate is accepted only if it is at least 90 units from every member center and every accepted ornament.
4. Motifs cycle through `SCATTER_MOTIFS` in a seeded order.
5. If there are not enough valid candidates, place fewer ornaments.

- [ ] **Step 1: Write failing tests.**
  - The 5 fixed motifs are always present, including for a one-member layout.
  - The scattered count is 2 for the 9-member seed, 8 for a 60-member tree, and never more than the number of valid candidates.
  - Every scattered center is at least 90 units from every member center and every other ornament.
  - The same seed produces an identical result.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): deterministic Moldovan motif placement"`

### Task 6: Tokens, fonts and engraving defs

**Files:**
- Create `styles/tree-tokens.scss` and `components/engraving-defs.component.ts`
- Modify `tree.component.scss` (`@use` the tokens)
- Test `components/engraving-defs.component.spec.ts` and `styles/tree-tokens.spec.ts`

**Interfaces:**
- Produces:
  - The CSS custom properties from spec §5, defined on `.engraved-tree` and overridden under `:root.app-dark .engraved-tree`.
  - `EngravingDefsComponent`, selector `svg:defs[etEngravingDefs]`, which defines these ids:
    - filters: `et-paper-grain`, `et-ink-bleed`, `et-sepia-photo`
    - patterns: `et-hatch-45`, `et-hatch-135`, `et-crosshatch`, `et-stipple`
    - clip path: `et-medallion-clip` (ellipse rx 34, ry 42, centered at 0,0)

- [ ] **Step 1: Install fonts.** Run `npm i @fontsource/im-fell-english @fontsource/im-fell-english-sc @fontsource/cormorant-garamond --registry=https://registry.npmjs.org`. Import the 400 and 400-italic weights in `tree-tokens.scss`.
- [ ] **Step 2: Write failing tests.**
  - The defs component renders each of the 8 ids above.
  - A token contrast test parses the hex pairs out of `tree-tokens.scss` (read with Vite `?raw`) and computes the WCAG ratio. It expects ink on paper ≥ 7 and ink-soft on paper ≥ 4.5 in both themes.
- [ ] **Step 3: Run tests.** Expected: FAIL.
- [ ] **Step 4: Implement** the tokens (verbatim spec values) and the defs. Hatch spacing is 4 units at stroke `--et-stroke-hair`. `et-paper-grain` uses `feTurbulence baseFrequency=0.8 numOctaves=3` blended at about 0.12 opacity. `et-ink-bleed` uses `feTurbulence 0.04` with `feDisplacementMap` scale 1.2.
- [ ] **Step 5: Run tests.** Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(tree): engraving design tokens, fonts and SVG defs"`

### Task 7: Medallion and banner components

**Files:** Create `components/medallion.component.ts` and `components/banner.component.ts`. Test both `.spec.ts` files.

**Interfaces:**
- Consumes: `fullName`, `lifespan`, `memberAriaLabel`, the defs ids
- Produces:
  - `MedallionComponent`, selector `g[etMedallion]`
    - inputs: `member = input.required<FamilyMember>()` and `selected = input(false)`
    - outputs: `activate = output<FamilyMember>()`, `hoverChange = output<boolean>()`
    - The host is translated by the parent. The component draws relative to (0,0).
  - `BannerComponent`, selector `g[etBanner]`
    - inputs: `name = input.required<string>()` and `years = input('')`
    - Drawn below the medallion at y=+58. Width is `max(120, measured + 28)`, measured via `getComputedTextLength` with a fallback of `name.length * 8` in jsdom.

- [ ] **Step 1: Write failing tests.**
  - The host has `role="button"`, `tabindex="0"` and the expected `aria-label`.
  - Enter and Space each emit `activate` once.
  - A deceased member gets the class `is-deceased` and a `†` text node. A living member has neither.
  - A thumbnail renders as an `<image>` clipped by `url(#et-medallion-clip)`. On the image's `error` event it is replaced by the gender silhouette `<use href="motifs/silhouette-<m|f|u>.svg#motif">` (Review Focus 5).
  - The banner renders two `<text>` lines. The second line is omitted when `years` is empty.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.** The laurel ring is two mirrored arcs of 9 leaf ellipses using `--et-ink-soft`. The rim is stroke `--et-stroke-main`, using `--et-gilt` when hovered, focused or `selected`. Focus uses an outline ellipse in `--et-focus`.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): engraved medallion and ribbon banner"`

### Task 8: Motif artwork (10 motifs and 3 silhouettes)

**Files:**
- Create in `client/public/motifs/`:
  - `stefan-cel-mare.svg`, `molda-hound.svg`, `aurochs-shield.svg`, `eagle-cross.svg`, `river-moldova.svg`
  - `grapevine.svg`, `perched-falcon.svg`, `star-rose-crescent.svg`, `oak-sprig.svg`, `putna-church.svg`
  - `silhouette-m.svg`, `silhouette-f.svg`, `silhouette-u.svg`
- Create `components/motif.component.ts`
- Test `components/motif.component.spec.ts` and `public-motifs.spec.ts`

**Interfaces:**
- Consumes: `MotifPlacement`
- Produces: `MotifComponent`, selector `g[etMotif]`, with input `placement = input.required<MotifPlacement>()`. It renders `<use href="motifs/{id}.svg#motif">` with a `translate`, `scale` and optional `scale(-1,1)` transform, and `aria-hidden="true"`.

Art rules:
- Each file holds one `<symbol id="motif" viewBox="…">`, centered on the viewBox.
- Strokes use `currentColor` and fills use `var(--et-paper)`, so they inherit the theme.
- Shading is drawn as **line hatching** inside the shapes (parallel strokes), not as fills or gradients.
- Size targets in units:

| Motif | Size (units) |
|---|---|
| Ștefan | 180 × 220 |
| hound | 200 × 110 |
| shield | 110 × 130 |
| eagle | 220 × 200 |
| river | 600 × 60, tileable |
| scattered motifs | about 80 × 80 |
| silhouettes | 68 × 84 |

Subject notes for the illustrator:
- **Ștefan:** crowned, long hair, moustache, holding a church model, seated three-quarter pose.
- **Hound:** a lean hunting hound lying with its head raised.
- **Shield:** an aurochs head facing front, with a star between the horns, a rose on the right and a crescent on the left.
- **Eagle:** wings spread, an Orthodox cross in its beak, a sceptre and an olive branch in its talons.

- [ ] **Step 1: Write failing tests.**
  - Every expected motif file exists, read via `fs`.
  - Every file contains `<symbol id="motif"` and a `viewBox`.
  - No file contains a `#rgb` or `#rrggbb` color literal (Global Constraint).
  - `MotifComponent` renders the right `href`, with a `scale(-1,1)` transform when mirrored.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Draw the 13 SVGs and implement `MotifComponent`.**
- [ ] **Step 4: Run tests.** Expected: PASS. Then open each file in the browser pane at `http://localhost:4200/motifs/<id>.svg` and screenshot it to check it reads as the intended subject.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): original engraved Moldovan motif artwork"`

### Task 9: Engraved tree canvas (render, zoom, lineage hover)

**Files:** Create `components/engraved-tree.component.ts` with inline template and styles. Test `components/engraved-tree.component.spec.ts`.

**Interfaces:**
- Consumes: everything above
- Produces: `EngravedTreeComponent`, selector `et-engraved-tree`
  - inputs: `members = input.required<FamilyMember[]>()` and `selectedId = input<string | null>(null)`
  - output: `memberActivate = output<FamilyMember>()`
  - public methods: `zoomBy(factor: number): void` and `resetView(): void`

Render order inside `<svg class="engraved-tree" role="img" aria-label="Iordachi family tree">`:
1. defs
2. paper rect with grain filter
3. crown stipple blob, the convex hull of member centers padded by 80, smoothed with `d3-shape` `curveBasisClosed`
4. ground band
5. `river-moldova`
6. roots
7. trunk with hatch fill
8. branches with `--et-sepia` fill, `--et-ink` edge and a `data-branch-id`
9. fixed and scattered motifs
10. medallions, each with its banner
11. title cartouche
12. the "Alii" cartouche, listing `unplacedMemberIds` names, only when it is not empty

Behavior:
- Computed signals chain `members` → `buildHouseholds` → `layoutTree` → `placeMotifs(layout, hashSeed('iordachi'))`.
- Use `d3-zoom` with `scaleExtent([0.25, 2.5])`. Fit-to-bounds runs on first render and on `resetView`.
- Hovering or focusing a medallion sets `hoveredId`. Branches in `lineageBranchIds(hoveredId)` get the class `is-lineage`, which uses a gilt fill.

- [ ] **Step 1: Write failing tests,** using the TestBed seed fixture:
  - 9 `g[etMedallion]` elements and 6 `[data-branch-id]` elements are rendered (the child households `3+4`, `5+6`, `7`, `8` and `9`, plus `trunk>1+2`).
  - The 5 fixed motif hrefs are present.
  - The "Alii" cartouche is present only when the input contains an isolated member.
  - Dispatching `mouseenter` on member 8 gives exactly the four lineage branches `is-lineage`.
  - `resetView()` after a zoom restores the initial transform.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): engraved SVG tree canvas with zoom and lineage hover"`

### Task 10: Growth animation

**Files:** Modify `components/engraved-tree.component.ts` and its styles. Test by extending `engraved-tree.component.spec.ts`.

**Interfaces:**
- Produces:
  - Each branch, medallion, banner and scattered motif gets the style var `--et-gen: <generation>`.
  - The root `<svg>` gets the class `is-growing` for `--et-dur-grow` plus the last generation's stagger, then `is-grown`.

Timing (spec §5):
- The trunk and roots reveal from 0–400ms with `clip-path: inset(100% 0 0 0)` → `inset(0)`.
- Each branch reveals the same way with `animation-delay: calc(400ms + var(--et-gen) * 300ms)`.
- Each medallion fades from opacity 0 to 1 and scales 0.6 → 1, 150ms after its branch.
- Each banner unrolls with `scaleX(0)` → `1`, 100ms after its medallion.
- Fixed motifs fade in at 400ms. The eagle comes last.
- All animations use `--et-ease`.
- Inside `@media (prefers-reduced-motion: reduce)`, every animation is set to `none`, and the component starts in `is-grown`.

- [ ] **Step 1: Write failing tests.**
  - Each branch carries `--et-gen` equal to its generation.
  - With `matchMedia('(prefers-reduced-motion: reduce)')` mocked to match, the svg has `is-grown` immediately and never gets `is-growing`.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): staged growth animation respecting reduced motion"`

### Task 11: Page shell, detail panel and states

**Files:**
- Create `components/member-panel.component.ts`
- Modify `tree.component.ts`, `tree.component.html` and `tree.component.scss`
- Test `components/member-panel.component.spec.ts` and `tree.component.spec.ts`

**Interfaces:**
- Consumes: `EngravedTreeComponent`, `FamilyTreeService.list()`
- Produces: `MemberPanelComponent`, selector `et-member-panel`
  - inputs: `member = input<FamilyMember | null>(null)`
  - output: `closed = output<void>()`
  - It wraps PrimeNG `Drawer` with `position="right"` and the class `et-parchment`. It shows the portrait, `fullName`, `lifespan`, the biography (pre-wrap) and media thumbnails linking to `media[].url`.

The `TreeComponent` view states are `'loading' | 'error' | 'empty' | 'ready'`, held as a signal:
- **Retry** re-calls `list()`.
- Closing the panel returns focus to the medallion with `data-member-id === selectedId`.
- The header is removed. The title lives in the SVG cartouche.
- Engraved brass zoom controls (+, −, reset) sit fixed at the bottom right and call `zoomBy(1.25)`, `zoomBy(0.8)` and `resetView()`.

- [ ] **Step 1: Write failing tests.** Use `FamilyTreeService` stubbed with `of(...)` or `throwError`.
  - The loading state shows the engraved quill-and-inkwell loader (an inline SVG; the quill rocks for 1.2s, and stays still under reduced motion) with "Se încarcă arborele…" and "Loading tree…".
  - An error shows a Retry button, and clicking it calls `list()` a second time.
  - An empty list shows "No family members yet" and still renders the trunk.
  - `memberActivate` opens the panel with the member's name and lifespan.
  - Escape or `closed` clears the selection.
- [ ] **Step 2: Run tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(tree): page shell, parchment detail panel and load states"`

### Task 12: Remove family-chart and verify visually

**Files:**
- Modify `client/package.json` (uninstall `family-chart`).
- Modify `client/angular.json` (drop `node_modules/family-chart/dist/styles/family-chart.css`).
- Modify `client/src/styles.scss` (delete the `.f3` overrides at lines 66–108).
- Modify `family-member.model.ts`: the doc comment should say the `id`/`data`/`rels` shape is "used by the tree layout" instead of family-chart.

- [ ] **Step 1: Uninstall and check.** Run `npm uninstall family-chart --registry=https://registry.npmjs.org`, then `grep -rn "family-chart\|f3" src angular.json`. Expected: no matches.
- [ ] **Step 2: Run the full suite and build.** Run `npx ng test --watch=false && npx ng build`. Expected: all tests pass and the build succeeds.
- [ ] **Step 3: Check visually in the browser pane.** Open `http://localhost:4200/tree`. Take screenshots of:
  - (a) the growth animation mid-way and after it finishes
  - (b) the parchment theme, with the `app-dark` class removed from `<html>`
  - (c) the candlelit theme
  - (d) a lineage hover on Dinu
  - (e) the detail panel open
  - (f) the mobile viewport, 375 wide
  - (g) keyboard Tab through the medallions, with a visible focus ring

  Confirm there are no console errors and that every fixed motif is visible around the trunk.
- [ ] **Step 4: Commit.** `git commit -m "chore(tree): drop family-chart dependency and legacy overrides"`
