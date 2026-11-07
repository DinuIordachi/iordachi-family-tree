import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FamilyMember } from '@app/core/models';
import { member } from '../engraving/testing/member-factory';
import { MedallionComponent } from './medallion.component';

@Component({
  imports: [MedallionComponent],
  template: `<svg><g etMedallion [member]="m()" [selected]="selected()" (activate)="activated.push($event)" (hoverChange)="hovers.push($event)"></g></svg>`,
})
class HostComponent {
  m = signal<FamilyMember>(member('1', {}, { 'first name': 'Ion', 'last name': 'Iordachi', birthday: '1955-01-08' }));
  selected = signal(false);
  activated: FamilyMember[] = [];
  hovers: boolean[] = [];
}

async function setup(m?: FamilyMember) {
  const fixture = TestBed.createComponent(HostComponent);
  if (m) {
    fixture.componentInstance.m.set(m);
  }
  await fixture.whenStable();
  const host: SVGGElement = fixture.nativeElement.querySelector('g[etMedallion]');
  return { fixture, host };
}

describe('MedallionComponent', () => {
  it('is an accessible button', async () => {
    const { host } = await setup();
    expect(host.getAttribute('role')).toBe('button');
    expect(host.getAttribute('tabindex')).toBe('0');
    expect(host.getAttribute('aria-label')).toBe('Ion Iordachi, born 1955');
    expect(host.getAttribute('data-member-id')).toBe('1');
  });

  it('activates once on Enter and once on Space', async () => {
    const { fixture, host } = await setup();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(fixture.componentInstance.activated).toHaveLength(2);
  });

  it('activates on click', async () => {
    const { fixture, host } = await setup();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.activated.map((m) => m.id)).toEqual(['1']);
  });

  it('reports hover and focus', async () => {
    const { fixture, host } = await setup();
    host.dispatchEvent(new MouseEvent('mouseenter'));
    host.dispatchEvent(new MouseEvent('mouseleave'));
    host.dispatchEvent(new FocusEvent('focus'));
    expect(fixture.componentInstance.hovers).toEqual([true, false, true]);
  });

  it('marks the deceased with a dagger', async () => {
    const { host } = await setup(member('2', {}, { birthday: '1925-01-01', diedAt: '1998-01-01T00:00:00Z' }));
    expect(host.classList).toContain('is-deceased');
    expect(host.textContent).toContain('†');
  });

  it('does not mark the living', async () => {
    const { host } = await setup();
    expect(host.classList).not.toContain('is-deceased');
    expect(host.textContent).not.toContain('†');
  });

  it('reflects selection', async () => {
    const { fixture, host } = await setup();
    fixture.componentInstance.selected.set(true);
    await fixture.whenStable();
    expect(host.classList).toContain('is-selected');
  });

  it('shows a clipped, sepia-toned thumbnail', async () => {
    const { host } = await setup({ ...member('3'), thumbnailUrl: 'http://x/p.jpg' });
    const img = host.querySelector('image')!;
    expect(img.getAttribute('href')).toBe('http://x/p.jpg');
    expect(img.getAttribute('clip-path')).toBe('url(#et-medallion-clip)');
  });

  it('falls back to the silhouette when the thumbnail fails', async () => {
    const { fixture, host } = await setup({ ...member('3', {}, { gender: 'F' }), thumbnailUrl: 'http://x/broken.jpg' });
    host.querySelector('image')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(host.querySelector('image')).toBeNull();
    expect(host.querySelector('use.et-silhouette')!.getAttribute('href')).toBe('motifs/silhouette-f.svg#motif');
  });

  it('uses the unknown silhouette without a gender', async () => {
    const { host } = await setup(member('4', {}, { gender: undefined }));
    expect(host.querySelector('use.et-silhouette')!.getAttribute('href')).toBe('motifs/silhouette-u.svg#motif');
  });

  it('lays laurel leaves along the rim, not radiating from it', async () => {
    const { host } = await setup();
    const leaves = [...host.querySelectorAll('.et-laurel ellipse')].map((e) => {
      const m = e.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/)!;
      return { x: Number(m[1]), y: Number(m[2]), angle: Number(m[3]) };
    });
    expect(leaves).toHaveLength(18);
    // leaf ellipses are tall (ry > rx): beside the rim's widest point the long axis must stay near vertical
    const side = leaves.reduce((a, b) => (Math.abs(b.y) < Math.abs(a.y) ? b : a));
    const tilt = ((side.angle % 180) + 180) % 180;
    expect(Math.min(tilt, 180 - tilt)).toBeLessThan(30);
  });

  it('carries a ribbon banner with name and years', async () => {
    const { host } = await setup();
    const texts = [...host.querySelectorAll('g[etBanner] text')].map((t) => t.textContent!.trim());
    expect(texts).toEqual(['Ion Iordachi', '1955 –']);
  });
});
