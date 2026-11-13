import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EngravingDefsComponent } from './engraving-defs.component';
import { MEDALLION_RX, MEDALLION_RY } from '../engraving/medallion-geometry';

@Component({
  imports: [EngravingDefsComponent],
  template: `<svg><defs etEngravingDefs></defs></svg>`,
})
class HostComponent {}

describe('EngravingDefsComponent', () => {
  it('defines every engraving filter, pattern and clip path', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const ids = [
      'et-paper-grain',
      'et-ink-bleed',
      'et-sepia-photo',
      'et-hatch-45',
      'et-hatch-135',
      'et-crosshatch',
      'et-stipple',
      'et-medallion-clip',
    ];
    for (const id of ids) {
      const el = root.querySelector(`#${id}`);
      expect(el, id).not.toBeNull();
      expect(el!.namespaceURI).toBe('http://www.w3.org/2000/svg');
    }
  });

  it('clips medallions to the portrait oval at the origin', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const ellipse = fixture.nativeElement.querySelector('#et-medallion-clip ellipse');
    expect(ellipse.getAttribute('rx')).toBe(String(MEDALLION_RX));
    expect(ellipse.getAttribute('ry')).toBe(String(MEDALLION_RY));
  });
});
