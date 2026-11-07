import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FamilyMember } from '@app/core/models';
import { FamilyTreeService } from '@app/core/services';
import { providePrimeNG } from 'primeng/config';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { SEED_MEMBERS } from './engraving/testing/seed-fixture';
import { TreeComponent } from './tree.component';

function setup(responses: Observable<FamilyMember[]>[]) {
  const list = vi.fn(() => responses.shift() ?? NEVER);
  TestBed.configureTestingModule({
    providers: [provideNoopAnimations(), providePrimeNG(), { provide: FamilyTreeService, useValue: { list } }],
  });
  const fixture = TestBed.createComponent(TreeComponent);
  return { fixture, list, root: fixture.nativeElement as HTMLElement };
}

describe('TreeComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows the engraved quill loader while loading', async () => {
    const { fixture, root } = setup([NEVER]);
    await fixture.whenStable();
    expect(root.querySelector('.et-loader svg')).not.toBeNull();
    expect(root.textContent).toContain('Se încarcă arborele…');
    expect(root.textContent).toContain('Loading tree…');
  });

  it('offers a retry after an error, and retrying loads again', async () => {
    const { fixture, root, list } = setup([throwError(() => new Error('boom')), of(SEED_MEMBERS)]);
    await fixture.whenStable();
    const retry = [...root.querySelectorAll('button')].find((b) => b.textContent!.includes('Retry'))!;
    expect(retry).toBeTruthy();
    retry.click();
    await fixture.whenStable();
    expect(list).toHaveBeenCalledTimes(2);
    expect(root.querySelectorAll('g[etMedallion]')).toHaveLength(9);
  });

  it('keeps the trunk and shows a cartouche when there are no members', async () => {
    const { fixture, root } = setup([of([])]);
    await fixture.whenStable();
    expect(root.textContent).toContain('No family members yet');
    expect(root.querySelector('path.et-trunk')).not.toBeNull();
  });

  it('opens the detail panel for an activated medallion and clears it on close', async () => {
    const { fixture, root } = setup([of(SEED_MEMBERS)]);
    await fixture.whenStable();
    (root.querySelector('g[etMedallion][data-member-id="3"]') as SVGGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await fixture.whenStable();
    expect(document.querySelector('.et-parchment')!.textContent).toContain('P3');
    expect(root.querySelector('g[etMedallion][data-member-id="3"]')!.classList).toContain('is-selected');

    (document.querySelector('.et-parchment button[aria-label="Close"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelector('g[etMedallion].is-selected')).toBeNull();
    expect(document.activeElement?.getAttribute('data-member-id')).toBe('3');
    fixture.destroy();
  });

  it('has labelled zoom controls', async () => {
    const { fixture, root } = setup([of(SEED_MEMBERS)]);
    await fixture.whenStable();
    const labels = [...root.querySelectorAll('.et-controls button')].map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Zoom in', 'Zoom out', 'Reset view']);
    for (const b of root.querySelectorAll<HTMLButtonElement>('.et-controls button')) {
      b.click();
    }
  });
});
