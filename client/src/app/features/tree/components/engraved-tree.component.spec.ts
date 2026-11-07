import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FamilyMember } from '@app/core/models';
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

  it('engraves bark hatching over every branch', async () => {
    const { root } = await setup();
    const hatched = [...root.querySelectorAll('path.et-branch-hatch')];
    expect(hatched).toHaveLength(6);
    const branchD = new Set([...root.querySelectorAll('path.et-branch')].map((b) => b.getAttribute('d')));
    for (const h of hatched) {
      expect(branchD.has(h.getAttribute('d'))).toBe(true);
    }
  });

  it('is an accessible image with the trunk and roots drawn', async () => {
    const { root } = await setup();
    const svg = root.querySelector('svg.engraved-tree')!;
    expect(svg.getAttribute('role')).toBe('img');
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

  it('renders the trunk and ground motifs even when empty', async () => {
    const { root } = await setup([]);
    expect(root.querySelectorAll('g[etMedallion]')).toHaveLength(0);
    expect(root.querySelector('path.et-trunk')).not.toBeNull();
    expect(root.querySelector('g.et-motif--stefan-cel-mare')).not.toBeNull();
  });
});
