import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MotifPlacement } from '../engraving/types';
import { MOTIF_SIZES, MotifComponent } from './motif.component';

@Component({
  imports: [MotifComponent],
  template: `<svg><g etMotif [placement]="p()"></g></svg>`,
})
class HostComponent {
  p = signal<MotifPlacement>({ motif: 'molda-hound', center: { x: 230, y: -30 }, scale: 1, mirrored: false });
}

async function render(p?: MotifPlacement) {
  const fixture = TestBed.createComponent(HostComponent);
  if (p) {
    fixture.componentInstance.p.set(p);
  }
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('g[etMotif]') as SVGGElement;
}

describe('MotifComponent', () => {
  it('references the motif file symbol, centred on the placement', async () => {
    const host = await render();
    const use = host.querySelector('use')!;
    expect(use.getAttribute('href')).toBe('motifs/molda-hound.svg#motif');
    expect(use.getAttribute('width')).toBe(String(MOTIF_SIZES['molda-hound'].width));
    expect(use.getAttribute('x')).toBe(String(-MOTIF_SIZES['molda-hound'].width / 2));
    expect(host.getAttribute('transform')).toBe('translate(230 -30) scale(1)');
  });

  it('mirrors horizontally when asked', async () => {
    const host = await render({ motif: 'molda-hound', center: { x: 1, y: 2 }, scale: 0.5, mirrored: true });
    expect(host.getAttribute('transform')).toBe('translate(1 2) scale(0.5) scale(-1 1)');
  });

  it('stretches the river horizontally only', async () => {
    const host = await render({ motif: 'river-moldova', center: { x: 0, y: 40 }, scale: 2, mirrored: false });
    const use = host.querySelector('use')!;
    expect(use.getAttribute('width')).toBe('1200');
    expect(use.getAttribute('height')).toBe('60');
    expect(use.getAttribute('x')).toBe('-600');
    expect(host.getAttribute('transform')).toBe('translate(0 40)');
  });

  it('is decorative for assistive tech', async () => {
    const host = await render();
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.classList).toContain('et-motif--molda-hound');
  });

  it('knows a size for every motif', () => {
    for (const size of Object.values(MOTIF_SIZES)) {
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    }
    expect(Object.keys(MOTIF_SIZES)).toHaveLength(10);
  });
});
