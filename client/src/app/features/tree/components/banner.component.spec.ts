import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BannerComponent } from './banner.component';

@Component({
  imports: [BannerComponent],
  template: `<svg><g etBanner [name]="name()" [years]="years()" [maxWidth]="maxWidth()"></g></svg>`,
})
class HostComponent {
  name = signal('Vasile Iordachi');
  years = signal('1925 – 1998');
  maxWidth = signal(1000);
}

describe('BannerComponent', () => {
  it('renders the name and the years', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const texts = [...fixture.nativeElement.querySelectorAll('text')].map((t: Element) => t.textContent!.trim());
    expect(texts).toEqual(['Vasile Iordachi', '1925 – 1998']);
  });

  it('omits the years line when there are none', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.years.set('');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('text')).toHaveLength(1);
  });

  it('is at least 120 wide and grows with long names', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const width = () => Number(fixture.nativeElement.querySelector('g[etBanner]').getAttribute('data-width'));
    expect(width()).toBeGreaterThanOrEqual(120);
    fixture.componentInstance.name.set('Alexandra-Maria Constantinescu-Iordachi');
    await fixture.whenStable();
    expect(width()).toBeGreaterThan(120);
  });

  it('condenses a name wider than its slot instead of overflowing', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.name.set('Alexandra-Maria Constantinescu Iordachi');
    fixture.componentInstance.maxWidth.set(200);
    await fixture.whenStable();
    const host = fixture.nativeElement.querySelector('g[etBanner]');
    expect(Number(host.getAttribute('data-width'))).toBe(200);
    const text = host.querySelector('.et-banner-name');
    expect(text.getAttribute('textLength')).toBe('172');
    expect(text.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
  });

  it('leaves names that fit at their natural width', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.et-banner-name').getAttribute('textLength')).toBeNull();
  });
});
