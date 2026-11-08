import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FamilyMember } from '@app/core/models';
import { bannerSpan } from '../engraving/member-text';
import { member } from '../engraving/testing/member-factory';
import { SEED_MEMBERS } from '../engraving/testing/seed-fixture';
import { EngravedTreeComponent } from './engraved-tree.component';

@Component({
  imports: [EngravedTreeComponent],
  template: `<et-engraved-tree [members]="members()" (memberActivate)="activated.push($event)" />`,
})
class HostComponent {
  members = signal<FamilyMember[]>(SEED_MEMBERS);
  activated: FamilyMember[] = [];
}

async function setup(members?: FamilyMember[]) {
  const fixture = TestBed.createComponent(HostComponent);
  if (members) {
    fixture.componentInstance.members.set(members);
  }
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  return { fixture, root };
}

describe('EngravedTreeComponent', () => {
  it('renders one medallion per member and one branch per child household plus the trunk link', async () => {
    const { root } = await setup();
    expect(root.querySelectorAll('g[etMedallion]')).toHaveLength(9);
    const ids = [...root.querySelectorAll('[data-branch-id]')].map((b) => b.getAttribute('data-branch-id')).sort();
    expect(ids).toEqual(['1+2>3+4', '3+4>5+6', '3+4>7', '5+6>8', '5+6>9', 'trunk>1+2']);
  });

  it('joins forks smoothly: a branch with children ends at its children’s start width', async () => {
    const { root } = await setup();
    const d = (id: string) => root.querySelector(`path.et-branch[data-branch-id="${id}"]`)!.getAttribute('d')!;
    expect(d('1+2>3+4')).toContain('A10 10 '); // 3+4 has children → ends at branchWidths(2).start = 20
    expect(d('3+4>7')).toContain('A3.5 3.5 '); // 7 is a leaf → ends at 20 × 0.35 = 7
  });

  it('engraves bark grooves and twigs on every branch', async () => {
    const { root } = await setup();
    const bark = [...root.querySelectorAll('path.et-branch-bark')];
    expect(bark).toHaveLength(6);
    expect(bark.filter((b) => (b.getAttribute('d') ?? '').startsWith('M')).length).toBeGreaterThan(3);
    expect([...root.querySelectorAll('path.et-twigs')].some((t) => (t.getAttribute('d') ?? '').length > 0)).toBe(true);
  });

  it('lets foliage grow between neighbouring banners instead of leaving a bare band per generation', async () => {
    const { root } = await setup();
    const d = ['et-leaves-lit', 'et-leaves-shade'].map((c) => root.querySelector(`#tree-foliage path.${c}`)!.getAttribute('d')!).join('');
    const leaves = [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    const at = (id: string) =>
      root.querySelector(`g[etMedallion][data-member-id="${id}"]`)!.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
    const [x5, rowY] = at('5'); // generation 2: 5, 6 and 7 share the row
    const [x7] = at('7');
    const [minX, maxX] = [Math.min(x5, x7), Math.max(x5, x7)];
    // under the ribbons, only the short years line stays bare; foliage fills the rest of the row
    const beside = leaves.filter(
      (p) => p.x > minX - 40 && p.x < maxX + 40 && p.y > rowY + 76 && p.y < rowY + 92 && Math.min(Math.abs(p.x - x5), Math.abs(p.x - x7)) > 40,
    );
    expect(beside.length).toBeGreaterThan(10);
  });

  it('opens a niche in the crown so the coat of arms is not lost in the leaves', async () => {
    const { root } = await setup();
    const [ex, ey] = root.querySelector('#coat-of-arms')!.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number);
    const d = ['et-leaves-lit', 'et-leaves-shade'].map((c) => root.querySelector(`#tree-foliage path.${c}`)!.getAttribute('d')!).join('');
    const inside = [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].filter((m) => ((Number(m[1]) - ex) / 115) ** 2 + ((Number(m[2]) - ey) / 90) ** 2 < 1);
    expect(inside).toHaveLength(0);
  });

  it('re-fits when the canvas is resized, until the visitor zooms or pans', async () => {
    let onResize: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          onResize = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    try {
      const { fixture, root } = await setup();
      const svg = root.querySelector('svg.engraved-tree') as SVGSVGElement;
      const viewport = () => root.querySelector('g.et-viewport')!.getAttribute('transform');
      const before = viewport();
      Object.defineProperty(svg, 'clientWidth', { configurable: true, value: 600 });
      Object.defineProperty(svg, 'clientHeight', { configurable: true, value: 400 });
      onResize();
      const refitted = viewport();
      expect(refitted).not.toBe(before);

      const tree = fixture.debugElement.children[0].componentInstance as EngravedTreeComponent;
      tree.zoomBy(1.25);
      const zoomed = viewport();
      Object.defineProperty(svg, 'clientWidth', { configurable: true, value: 900 });
      onResize();
      expect(viewport()).toBe(zoomed); // the visitor's own view is kept
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('groups the engraving into named layers', async () => {
    const { root } = await setup();
    for (const id of ['tree-roots', 'tree-trunk', 'tree-branches', 'tree-foliage', 'genealogical-connections', 'family-portraits', 'decorative-details', 'coat-of-arms', 'stephen-the-great', 'molda']) {
      expect(root.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it('fills the crown with engraved leaves and keeps them out of the medallions', async () => {
    const { root } = await setup();
    const lit = root.querySelector('#tree-foliage path.et-leaves-lit')!.getAttribute('d')!;
    const leaves = [...lit.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(leaves.length).toBeGreaterThan(300);
    const centres = [...root.querySelectorAll('g[etMedallion]')].map((g) =>
      g.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number),
    );
    for (const p of leaves) {
      for (const [cx, cy] of centres) {
        expect(((p.x - cx) / 50) ** 2 + ((p.y - cy) / 58) ** 2).toBeGreaterThan(1);
      }
    }
  });

  it('is a labelled group (not an image) with the trunk and roots drawn', async () => {
    const { root } = await setup();
    const svg = root.querySelector('svg.engraved-tree')!;
    expect(svg.getAttribute('role')).toBe('group'); // img would hide the medallion buttons from assistive tech
    expect(svg.getAttribute('aria-label')).toBe('Iordachi family tree');
    expect(root.querySelector('path.et-trunk')!.getAttribute('d')).toMatch(/^M/);
    expect(root.querySelector('path.et-roots')!.getAttribute('d')).toMatch(/^M/);
  });

  it('places the five fixed Moldovan motifs', async () => {
    const { root } = await setup();
    const hrefs = [...root.querySelectorAll('g[etMotif] use')].map((u) => u.getAttribute('href'));
    for (const id of ['stefan-cel-mare', 'molda-hound', 'aurochs-shield', 'eagle-cross', 'river-moldova']) {
      expect(hrefs).toContain(`motifs/${id}.svg#motif`);
    }
  });

  it('shows the title cartouche', async () => {
    const { root } = await setup();
    expect(root.querySelector('.et-title')!.textContent).toContain('Arbor Gentis Iordachi');
  });

  it('lists unplaced members in the Alii cartouche only when there are some', async () => {
    const { root } = await setup();
    expect(root.querySelector('.et-alii')).toBeNull();

    const { root: withIsolated } = await setup([
      ...SEED_MEMBERS,
      member('99', {}, { 'first name': 'Ileana', 'last name': 'Rusu' }),
    ]);
    const alii = withIsolated.querySelector('.et-alii')!;
    expect(alii.textContent).toContain('Alii');
    expect(alii.textContent).toContain('Ileana Rusu');
  });

  it('gilds the lineage of the hovered member down to the trunk', async () => {
    const { fixture, root } = await setup();
    root.querySelector('g[etMedallion][data-member-id="8"]')!.dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    const gilded = [...root.querySelectorAll('.is-lineage')].map((b) => b.getAttribute('data-branch-id')).sort();
    expect(gilded).toEqual(['1+2>3+4', '3+4>5+6', '5+6>8', 'trunk>1+2']);

    root.querySelector('g[etMedallion][data-member-id="8"]')!.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(root.querySelectorAll('.is-lineage')).toHaveLength(0);
  });

  it('emits memberActivate when a medallion is clicked', async () => {
    const { fixture, root } = await setup();
    (root.querySelector('g[etMedallion][data-member-id="3"]') as SVGGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(fixture.componentInstance.activated.map((m) => m.id)).toEqual(['3']);
  });

  it('resetView() restores the fitted transform after zooming', async () => {
    const { fixture, root } = await setup();
    const tree = fixture.debugElement.children[0].componentInstance as EngravedTreeComponent;
    const viewport = () => root.querySelector('g.et-viewport')!.getAttribute('transform');
    const initial = viewport();
    expect(initial).toMatch(/translate\(.+\) scale\(.+\)/);
    tree.zoomBy(1.25);
    expect(viewport()).not.toBe(initial);
    tree.resetView();
    expect(viewport()).toBe(initial);
  });

  it('ties each couple with a ribbon knot between their medallions', async () => {
    const { root } = await setup();
    const knots = [...root.querySelectorAll('g.et-knot')];
    expect(knots).toHaveLength(3); // 1+2, 3+4, 5+6
    const at = (id: string) =>
      root.querySelector(`g[etMedallion][data-member-id="${id}"]`)!.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number);
    const [x3, y3] = at('3');
    const [x4] = at('4');
    expect(knots.map((k) => k.getAttribute('transform'))).toContain(`translate(${(x3 + x4) / 2} ${y3})`);
  });

  it('spaces medallions so long names never make neighbouring banners collide', async () => {
    const long = 'Alexandra-Maria Constantinescu';
    const { root } = await setup([
      member('1', { spouses: ['2'] }, { 'first name': long, 'last name': 'Iordachi' }),
      member('2', { spouses: ['1'] }, { 'first name': 'Gheorghița', 'last name': 'Iordachi' }),
    ]);
    const xs = [...root.querySelectorAll('g[etMedallion]')].map(
      (g) => Number(g.getAttribute('transform')!.match(/translate\(([-\d.]+)/)![1]),
    );
    const gap = Math.abs(xs[0] - xs[1]);
    expect(gap).toBeGreaterThan(170); // the slot widened for the long names
    // every rendered banner (band + 2 × 16 tails) fits inside its slot: long names are condensed, not overflowed
    for (const banner of root.querySelectorAll('g[etBanner]')) {
      expect(Number(banner.getAttribute('data-width')) + 32).toBeLessThanOrEqual(gap);
    }
    const condensed = root.querySelector('g[etMedallion][data-member-id="1"] .et-banner-name')!;
    expect(condensed.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
    expect(bannerSpan('Gheorghița Iordachi')).toBeLessThanOrEqual(gap);
  });

  it('pans a keyboard-focused medallion into view when zoomed in', async () => {
    const { fixture, root } = await setup();
    const tree = fixture.debugElement.children[0].componentInstance as EngravedTreeComponent;
    tree.zoomBy(2.5);
    tree.zoomBy(2.5);
    const medallion = root.querySelector('g[etMedallion][data-member-id="9"]')!;
    medallion.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await fixture.whenStable();
    const [, tx, ty, k] = root.querySelector('g.et-viewport')!.getAttribute('transform')!.match(/translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)/)!.map(Number);
    const [mx, my] = medallion.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number);
    const sx = tx + k * mx;
    const sy = ty + k * my;
    expect(sx).toBeGreaterThan(0);
    expect(sx).toBeLessThan(1200);
    expect(sy).toBeGreaterThan(0);
    expect(sy).toBeLessThan(800);
  });

  it('makes Alii names activatable and keeps a long list above the ground', async () => {
    const isolated = Array.from({ length: 20 }, (_, i) => member(String(100 + i), {}, { 'first name': `Alius${i}` }));
    const { fixture, root } = await setup([...SEED_MEMBERS, ...isolated]);
    const alii = root.querySelector('g.et-alii')!;
    const top = Number(alii.getAttribute('transform')!.match(/translate\([-\d.]+ ([-\d.]+)\)/)![1]);
    const frame = alii.querySelector('rect.et-alii-frame')!;
    expect(top + Number(frame.getAttribute('y')) + Number(frame.getAttribute('height'))).toBeLessThanOrEqual(0);

    const name = alii.querySelector('[role="button"][data-member-id="105"]') as SVGGElement;
    expect(name.getAttribute('tabindex')).toBe('0');
    name.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(fixture.componentInstance.activated.map((m) => m.id)).toEqual(['105', '105']);
  });

  it('renders the trunk and ground motifs even when empty', async () => {
    const { root } = await setup([]);
    expect(root.querySelectorAll('g[etMedallion]')).toHaveLength(0);
    expect(root.querySelector('path.et-trunk')).not.toBeNull();
    expect(root.querySelector('g.et-motif--stefan-cel-mare')).not.toBeNull();
  });
});
