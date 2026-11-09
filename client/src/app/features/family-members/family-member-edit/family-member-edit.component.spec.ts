import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { FamilyTreeService } from '@app/core/services';
import { FamilyMember } from '@app/core/models';
import { member } from '../../tree/engraving/testing/member-factory';
import { FamilyMemberEditComponent } from './family-member-edit.component';

const dumitru = member('1', { spouses: ['2'], children: ['3'] }, { 'first name': 'Dumitru', 'last name': 'Iordachi', gender: 'M' });
const elena = member('2', { spouses: ['1'], children: ['3'] }, { 'first name': 'Elena', 'last name': 'Rabdau', gender: 'F' });
const tatiana = member('3', { parents: ['1', '2'] }, { 'first name': 'Tatiana', 'last name': 'Iordachi', gender: 'F' });
const loner = member('4', {}, { 'first name': 'Ion', 'last name': 'Popa', gender: undefined });

function fakeService(tree: FamilyMember[]) {
  return {
    list: vi.fn(() => of(tree)),
    show: vi.fn((id: string | number) => of(tree.find((m) => m.id === String(id))!)),
    store: vi.fn(),
    update: vi.fn(),
    uploadThumbnail: vi.fn(),
    remove: vi.fn(),
    removeThumbnail: vi.fn(),
  };
}

async function setup(opts: { routeId?: string; tree?: FamilyMember[]; embedded?: boolean; presetParentIds?: number[] }) {
  const service = fakeService(opts.tree ?? [dumitru, elena, tatiana, loner]);
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      providePrimeNG(),
      MessageService,
      ConfirmationService,
      { provide: FamilyTreeService, useValue: service },
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(opts.routeId ? { id: opts.routeId } : {}) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(FamilyMemberEditComponent);
  if (opts.embedded) {
    fixture.componentRef.setInput('embedded', true);
  }
  if (opts.presetParentIds) {
    fixture.componentRef.setInput('presetParentIds', opts.presetParentIds);
  }
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, service, router };
}

describe('FamilyMemberEditComponent', () => {
  beforeEach(() => {
    /* jsdom has no ResizeObserver; the crop dialog observes its stage. */
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    let n = 0;
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:preview-${++n}`),
      revokeObjectURL: vi.fn(),
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('new child drawer (parent side)', () => {
    it('preselects the member and their first spouse as the new child’s parents', async () => {
      const { component, fixture } = await setup({ routeId: '1' });
      expect(component.newChildParentIds()).toEqual([1, 2]);
      fixture.destroy();
    });

    it('preselects only the member when they have no spouse', async () => {
      const { component, fixture } = await setup({ routeId: '4' });
      expect(component.newChildParentIds()).toEqual([4]);
      fixture.destroy();
    });

    it('shows a "New child" button next to the children picker that opens the drawer', async () => {
      const { component, fixture } = await setup({ routeId: '1' });
      const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) =>
        b.textContent?.includes('New child'),
      ) as HTMLButtonElement;
      expect(button).toBeTruthy();
      button.click();
      fixture.detectChanges();
      expect(component.childDrawerOpen()).toBe(true);
      fixture.destroy();
    });

    it('closes the drawer and reloads the children after a child is created, keeping unsaved picks', async () => {
      const { component, service, fixture } = await setup({ routeId: '1' });
      component.openChildDrawer();
      /* Unsaved edit in the form: the admin unticked Tatiana. */
      component.form.get('childIds')!.setValue([]);

      const newborn = member('9', { parents: ['1', '2'] }, { 'first name': 'Mihai', 'last name': 'Iordachi', gender: 'M' });
      const freshDumitru = { ...dumitru, rels: { ...dumitru.rels, children: ['3', '9'] } };
      service.show.mockReturnValue(of(freshDumitru));
      service.list.mockReturnValue(of([freshDumitru, elena, tatiana, loner, newborn]));

      await component.onChildCreated(newborn);

      expect(component.childDrawerOpen()).toBe(false);
      expect(component.form.get('childIds')!.value).toEqual([9]);
      expect(component.childOptions().map((o) => o.id)).toContain(9);
      expect(component.member()!.rels.children).toEqual(['3', '9']);
      fixture.destroy();
    });
  });

  describe('embedded create mode (inside the drawer)', () => {
    it('ignores the route and slots preset parents into mother and father by gender', async () => {
      const { component, service, fixture } = await setup({ routeId: '1', embedded: true, presetParentIds: [1, 2] });
      expect(component.isCreate()).toBe(true);
      expect(service.show).not.toHaveBeenCalled();
      expect(component.form.value.motherId).toBe(2);
      expect(component.form.value.fatherId).toBe(1);
      expect(component.form.value.lastName).toBe('Iordachi');
      fixture.destroy();
    });

    it('puts a single parent without a gender in a free slot', async () => {
      const { component, fixture } = await setup({ embedded: true, presetParentIds: [4] });
      expect(component.form.value.fatherId).toBe(4);
      expect(component.form.value.motherId).toBeNull();
      fixture.destroy();
    });

    it('holds the cropped photo until save, then creates the member with its parents and uploads the photo', async () => {
      const { component, service, router, fixture } = await setup({ embedded: true, presetParentIds: [1, 2] });
      const emitted: FamilyMember[] = [];
      component.created.subscribe((m) => emitted.push(m));

      const photo = new File(['x'], 'portrait.jpg', { type: 'image/jpeg' });
      component.onAvatarCropped(photo);
      expect(service.uploadThumbnail).not.toHaveBeenCalled();
      expect(component.newAvatarPreview()).toMatch(/^blob:/);

      const created = member('9', { parents: ['1', '2'] }, { 'first name': 'Mihai', 'last name': 'Iordachi' });
      const withPhoto = { ...created, thumbnailUrl: 'http://x/mihai.jpg' };
      service.store.mockReturnValue(of(created));
      service.uploadThumbnail.mockReturnValue(of(withPhoto));

      component.form.patchValue({ firstName: 'Mihai' });
      await component.save();

      expect(service.store).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Mihai',
        lastName: 'Iordachi',
        parentIds: [2, 1],
      }));
      expect(service.uploadThumbnail).toHaveBeenCalledWith('9', photo);
      expect(emitted).toEqual([withPhoto]);
      expect(router.navigate).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('emits cancelled instead of navigating', async () => {
      const { component, router, fixture } = await setup({ embedded: true, presetParentIds: [1] });
      let cancelled = 0;
      component.cancelled.subscribe(() => cancelled++);
      component.cancel();
      component.goToMember(1);
      expect(cancelled).toBe(1);
      expect(router.navigate).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });
});
