import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FamilyMember } from '@app/core/models';
import { providePrimeNG } from 'primeng/config';
import { member } from '../engraving/testing/member-factory';
import { MemberPanelComponent } from './member-panel.component';

@Component({
  imports: [MemberPanelComponent],
  template: `<et-member-panel [member]="m()" (closed)="closedCount = closedCount + 1" />`,
})
class HostComponent {
  m = signal<FamilyMember | null>(null);
  closedCount = 0;
}

const vasile: FamilyMember = {
  ...member('1', {}, { 'first name': 'Vasile', 'last name': 'Iordachi', birthday: '1925-04-12', diedAt: '1998-11-03T00:00:00Z' }),
  biography: 'Shepherd and carpenter.\nBuilt the family house.',
  thumbnailUrl: 'http://x/vasile.jpg',
  media: [
    { id: 7, name: 'Wedding', fileName: 'wedding.jpg', mime: 'image/jpeg', size: 10, url: 'http://x/wedding.jpg', collection: 'media', createdAt: '' },
    { id: 8, name: 'Letter', fileName: 'letter.pdf', mime: 'application/pdf', size: 10, url: 'http://x/letter.pdf', collection: 'media', createdAt: '' },
  ],
};

async function setup() {
  TestBed.configureTestingModule({ providers: [provideNoopAnimations(), providePrimeNG()] });
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return fixture;
}

describe('MemberPanelComponent', () => {
  it('stays closed without a member', async () => {
    const fixture = await setup();
    expect(document.body.textContent).not.toContain('Vasile Iordachi');
    fixture.destroy();
  });

  it('shows portrait, name, years, biography and media for the member', async () => {
    const fixture = await setup();
    fixture.componentInstance.m.set(vasile);
    await fixture.whenStable();
    const panel = document.querySelector('.et-parchment') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Vasile Iordachi');
    expect(panel.textContent).toContain('1925 – 1998');
    expect(panel.querySelector('.et-panel-bio')!.textContent).toContain('Built the family house.');
    expect(panel.querySelector('img.et-panel-portrait')!.getAttribute('src')).toBe('http://x/vasile.jpg');
    const links = [...panel.querySelectorAll('a.et-panel-media')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['http://x/wedding.jpg', 'http://x/letter.pdf']);
    fixture.destroy();
  });

  it('stays non-modal so the tree remains usable while it is open', async () => {
    const fixture = await setup();
    fixture.componentInstance.m.set(vasile);
    await fixture.whenStable();
    expect(document.querySelector('.et-parchment')).not.toBeNull();
    expect(document.querySelector('.p-drawer-mask.p-overlay-mask-enter-active, .p-overlay-mask')).toBeNull();
    expect(document.body.classList).not.toContain('p-overflow-hidden');
    fixture.destroy();
  });

  it('falls back to the engraved silhouette without a thumbnail', async () => {
    const fixture = await setup();
    fixture.componentInstance.m.set({ ...vasile, thumbnailUrl: null });
    await fixture.whenStable();
    expect(document.querySelector('img.et-panel-portrait')!.getAttribute('src')).toBe('motifs/silhouette-m.svg');
    fixture.destroy();
  });

  it('emits closed when the drawer hides', async () => {
    const fixture = await setup();
    fixture.componentInstance.m.set(vasile);
    await fixture.whenStable();
    (document.querySelector('.et-parchment button[aria-label="Close"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.closedCount).toBe(1);
    fixture.destroy();
  });
});
