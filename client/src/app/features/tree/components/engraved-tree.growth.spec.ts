import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FamilyMember } from '@app/core/models';
import { SEED_MEMBERS } from '../engraving/testing/seed-fixture';
import { EngravedTreeComponent } from './engraved-tree.component';

@Component({
  imports: [EngravedTreeComponent],
  template: `<et-engraved-tree [members]="members()" />`,
})
class HostComponent {
  members = signal<FamilyMember[]>(SEED_MEMBERS);
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

describe('EngravedTreeComponent growth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('tags each branch, medallion and motif with its generation', async () => {
    mockReducedMotion(false);
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const gen = (sel: string) => (root.querySelector(sel) as SVGElement).style.getPropertyValue('--et-gen');
    expect(gen('[data-branch-id="5+6>8"]')).toBe('3');
    expect(gen('g[etMedallion][data-member-id="1"]')).toBe('0');
    expect(gen('g.et-motif--eagle-cross')).toBe('4');
    expect(gen('g.et-motif--stefan-cel-mare')).toBe('0');
  });

  it('grows, then settles once the last generation has appeared', async () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const svg = () => fixture.nativeElement.querySelector('svg.engraved-tree') as SVGSVGElement;
    expect(svg().classList).toContain('is-growing');
    expect(svg().classList).not.toContain('is-grown');

    vi.advanceTimersByTime(1600 + 3 * 300 - 1);
    fixture.detectChanges();
    expect(svg().classList).toContain('is-growing');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(svg().classList).toContain('is-grown');
    expect(svg().classList).not.toContain('is-growing');
  });

  it('skips the animation entirely under prefers-reduced-motion', async () => {
    mockReducedMotion(true);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg.engraved-tree') as SVGSVGElement;
    expect(svg.classList).toContain('is-grown');
    expect(svg.classList).not.toContain('is-growing');
  });
});
