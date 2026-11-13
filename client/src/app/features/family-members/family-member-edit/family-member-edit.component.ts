import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { distinctUntilChanged, firstValueFrom, forkJoin, map, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { Avatar } from 'primeng/avatar';
import { Divider } from 'primeng/divider';
import { Message } from 'primeng/message';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Drawer } from 'primeng/drawer';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FamilyTreeService } from '@app/core/services';
import { FamilyMember, FamilyMemberPayload } from '@app/core/models';
import { AppTag, AppTagSeverity, AvatarCropDialogComponent } from '@app/shared/components';

interface MemberOption {
  id: number;
  label: string;
  gender: 'M' | 'F' | null;
  thumbnailUrl: string | null;
  birthday: string | null;
  diedAt: string | null;
  deceased: boolean;
}

@Component({
  selector: 'app-family-member-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    Button,
    InputText,
    Textarea,
    DatePicker,
    Select,
    MultiSelect,
    Avatar,
    AppTag,
    Divider,
    Message,
    ConfirmDialog,
    Drawer,
    AvatarCropDialogComponent,
  ],
  templateUrl: './family-member-edit.component.html',
  styleUrl: './family-member-edit.component.scss',
})
export class FamilyMemberEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly familyTreeService = inject(FamilyTreeService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Embedded = rendered inside another page (the "new child" drawer) instead of
   * as a routed page: always create mode, ignores the route, and emits
   * `created` / `cancelled` instead of navigating.
   */
  readonly embedded = input(false);
  /** Parents to preselect in embedded create mode, slotted into mother/father by gender. */
  readonly presetParentIds = input<number[]>([]);
  /** Spouses to preselect in embedded create mode. */
  readonly presetSpouseIds = input<number[]>([]);
  readonly created = output<FamilyMember>();
  readonly cancelled = output<void>();

  /** Drawer for creating a child of this member and their first spouse. */
  readonly childDrawerOpen = signal(false);
  readonly spouseDrawerOpen = signal(false);

  /**
   * 'create' when navigated from /family-members/new (no id param),
   * 'edit' when navigated from /family-members/:id/edit.
   */
  readonly mode = signal<'create' | 'edit'>('edit');
  readonly isCreate = computed(() => this.mode() === 'create');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
  /** Image picked by the admin, waiting to be positioned in the crop dialog. */
  readonly pendingAvatarFile = signal<File | null>(null);
  /** Create mode: cropped portrait held locally until the member exists, then uploaded. */
  readonly newAvatarFile = signal<File | null>(null);
  readonly newAvatarPreview = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly today = new Date();
  readonly avatarAccept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';

  readonly member = signal<FamilyMember | null>(null);
  readonly tree = signal<FamilyMember[]>([]);

  readonly genderOptions = [
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' },
  ];

  readonly form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(255)]],
    lastName: ['', [Validators.maxLength(255)]],
    birthdate: [null as Date | null],
    diedAt: [null as Date | null],
    gender: [null as 'M' | 'F' | null],
    biography: ['', [Validators.maxLength(10000)]],
    motherId: [null as number | null],
    fatherId: [null as number | null],
    spouseIds: [[] as number[]],
    childIds: [[] as number[]],
  });

  readonly otherMembers = computed<MemberOption[]>(() => {
    const current = this.member();
    return this.tree()
      .filter((m) => m.id !== current?.id)
      .map((m) => this.toOption(m));
  });

  readonly motherOptions = computed<MemberOption[]>(() =>
    this.otherMembers().filter((m) => m.gender !== 'M'),
  );

  readonly fatherOptions = computed<MemberOption[]>(() =>
    this.otherMembers().filter((m) => m.gender !== 'F'),
  );

  /**
   * Siblings = members who share at least one parent with the current member,
   * excluding the current member itself. Computed live from form values so
   * picking a new mother/father immediately reflects in the siblings list.
   */
  readonly siblings = signal<FamilyMember[]>([]);

  /** The member plus their first spouse — the parents preselected for a new child. */
  readonly newChildParentIds = computed<number[]>(() => {
    const current = this.member();
    if (!current) {
      return [];
    }
    const spouseId = current.rels.spouses[0];
    return spouseId ? [Number(current.id), Number(spouseId)] : [Number(current.id)];
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.setNewAvatar(null));
  }

  ngOnInit(): void {
    /* Siblings follow the parent pickers, whichever member is loaded. */
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recomputeSiblings());

    if (this.embedded()) {
      this.load(null);
      return;
    }
    /* Follow the route, not a snapshot: moving from one member's card to
     * another reuses this component, so each new `:id` must reload the form. */
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => this.load(id));
  }

  private loadSub?: Subscription;

  private load(id: string | null): void {
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.setNewAvatar(null);
    this.childDrawerOpen.set(false);
    this.spouseDrawerOpen.set(false);

    /* `new` route lands here without an id. Skip member loading entirely
     * and just fetch the tree to populate relation pickers + sibling computation. */
    if (!id) {
      this.mode.set('create');
      this.member.set(null);
      this.loadSub = this.familyTreeService.list().subscribe({
        next: (tree) => {
          this.tree.set(tree);
          this.applyPresetParents(this.presetParentIds(), tree);
          this.applyPresetSpouses(this.presetSpouseIds());
          this.recomputeSiblings();
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to load the family tree.');
          this.loading.set(false);
        },
      });
      return;
    }

    this.mode.set('edit');
    this.loadSub = forkJoin({
      member: this.familyTreeService.show(id),
      tree: this.familyTreeService.list(),
    }).subscribe({
      next: ({ member, tree }) => {
        this.tree.set(tree);
        this.member.set(member);
        this.applyMemberToForm(member, tree);
        this.recomputeSiblings();
        this.loading.set(false);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.errorMessage.set('Failed to load the family member.');
        this.loading.set(false);
      },
    });
  }

  private applyMemberToForm(member: FamilyMember, tree: FamilyMember[]): void {
    const treeById = new Map(tree.map((m) => [m.id, m]));
    const motherId = this.findParentId(member, treeById, 'F');
    const fatherId = this.findParentId(member, treeById, 'M');

    this.form.reset({
      firstName: member.data['first name'] ?? '',
      lastName: member.data['last name'] ?? '',
      birthdate: member.data.birthday ? new Date(member.data.birthday) : null,
      diedAt: member.diedAt ? new Date(member.diedAt) : null,
      gender: member.data.gender ?? null,
      biography: member.biography ?? '',
      motherId: motherId,
      fatherId: fatherId,
      spouseIds: member.rels.spouses.map((id) => Number(id)),
      childIds: member.rels.children.map((id) => Number(id)),
    });
  }

  /**
   * Slot preset parents into the mother/father pickers by gender; a parent
   * without a gender takes whichever slot is still free. The new member also
   * inherits the father's last name as an editable default.
   */
  private applyPresetParents(ids: number[], tree: FamilyMember[]): void {
    if (ids.length === 0) {
      return;
    }
    const treeById = new Map(tree.map((m) => [m.id, m]));
    let motherId: number | null = null;
    let fatherId: number | null = null;
    const ungendered: number[] = [];
    for (const id of ids) {
      const gender = treeById.get(String(id))?.data.gender;
      if (gender === 'F' && motherId == null) {
        motherId = id;
      } else if (gender === 'M' && fatherId == null) {
        fatherId = id;
      } else if (!gender) {
        ungendered.push(id);
      }
    }
    for (const id of ungendered) {
      if (fatherId == null) {
        fatherId = id;
      } else if (motherId == null) {
        motherId = id;
      }
    }
    const surnameSource = treeById.get(String(fatherId ?? motherId));
    this.form.patchValue({
      motherId,
      fatherId,
      lastName: surnameSource?.data['last name'] ?? '',
    });
  }

  private applyPresetSpouses(ids: number[]): void {
    if (ids.length > 0) {
      this.form.patchValue({ spouseIds: [...ids] });
    }
  }

  private findParentId(
    member: FamilyMember,
    treeById: Map<string, FamilyMember>,
    gender: 'M' | 'F',
  ): number | null {
    for (const parentId of member.rels.parents) {
      const parent = treeById.get(parentId);
      if (parent?.data.gender === gender) {
        return Number(parentId);
      }
    }
    // Fall back to any parent without gender if there's only one
    if (member.rels.parents.length === 1 && gender === 'F') {
      const single = treeById.get(member.rels.parents[0]);
      if (single && !single.data.gender) {
        return Number(member.rels.parents[0]);
      }
    }
    return null;
  }

  private recomputeSiblings(): void {
    const current = this.member();
    const motherId = this.form.get('motherId')?.value as number | null;
    const fatherId = this.form.get('fatherId')?.value as number | null;
    const parentIds = new Set(
      [motherId, fatherId].filter((v): v is number => v != null).map(String),
    );
    if (parentIds.size === 0) {
      this.siblings.set([]);
      return;
    }
    const siblings = this.tree().filter(
      (m) => m.id !== current?.id && m.rels.parents.some((p) => parentIds.has(p)),
    );
    this.siblings.set(siblings);
  }

  toOption(m: FamilyMember): MemberOption {
    const last = m.data['last name'] ? ` ${m.data['last name']}` : '';
    return {
      id: Number(m.id),
      label: `${m.data['first name']}${last}`,
      gender: m.data.gender ?? null,
      thumbnailUrl: m.thumbnailUrl,
      birthday: m.data.birthday ?? null,
      diedAt: m.diedAt,
      deceased: m.deceased,
    };
  }

  /** "1925 – 1998" once died_at is set, "1925 – present" otherwise (only when birthdate exists). */
  lifespan(birthday?: string | null, diedAt?: string | null): string | null {
    if (!birthday) {
      return null;
    }
    const birthYear = new Date(birthday).getFullYear();
    if (Number.isNaN(birthYear)) {
      return null;
    }
    if (!diedAt) {
      return `${birthYear}`;
    }
    const deathYear = new Date(diedAt).getFullYear();
    if (Number.isNaN(deathYear)) {
      return `${birthYear}`;
    }
    return `${birthYear} – ${deathYear}`;
  }

  fullName(member: FamilyMember | null): string {
    if (!member) {
      return '';
    }
    const last = member.data['last name'] ? ` ${member.data['last name']}` : '';
    return `${member.data['first name']}${last}`;
  }

  age(birthday?: string | null): number | null {
    if (!birthday) {
      return null;
    }
    const dob = new Date(birthday);
    if (Number.isNaN(dob.getTime())) {
      return null;
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  genderLabel(gender?: 'M' | 'F' | null): string {
    return gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Unspecified';
  }

  genderSeverity(gender?: 'M' | 'F' | null): AppTagSeverity {
    return gender === 'M' ? 'info' : gender === 'F' ? 'pink' : 'secondary';
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('');
  }

  optionById(id: number | null): MemberOption | null {
    if (id == null) {
      return null;
    }
    return this.otherMembers().find((m) => m.id === id) ?? null;
  }

  optionsByIds(ids: number[]): MemberOption[] {
    const set = new Set(ids);
    return this.otherMembers().filter((m) => set.has(m.id));
  }

  spouseOptions(): MemberOption[] {
    return this.otherMembers();
  }

  childOptions(): MemberOption[] {
    return this.otherMembers();
  }

  removeFromArray(controlName: 'spouseIds' | 'childIds', id: number): void {
    const ctrl = this.form.get(controlName);
    if (!ctrl) {
      return;
    }
    const current = (ctrl.value as number[]) ?? [];
    ctrl.setValue(current.filter((x) => x !== id));
  }

  clearParent(controlName: 'motherId' | 'fatherId'): void {
    this.form.get(controlName)?.setValue(null);
  }

  goToMember(id: number): void {
    /* Inside the drawer, leaving the page would throw away the new member. */
    if (this.embedded()) {
      return;
    }
    this.router.navigate(['/family-members', id, 'edit']);
  }

  cancel(): void {
    if (this.embedded()) {
      this.cancelled.emit();
      return;
    }
    this.router.navigate(['/family-members']);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({
        severity: 'warn',
        summary: 'Check the form',
        detail: 'Please fix the highlighted fields before saving.',
        life: 4000,
      });
      return;
    }

    const value = this.form.value;
    const parentIds: number[] = [];
    if (value.motherId) parentIds.push(value.motherId);
    if (value.fatherId) parentIds.push(value.fatherId);

    const payload: Partial<FamilyMemberPayload> = {
      firstName: value.firstName?.trim(),
      lastName: value.lastName?.trim() || null,
      birthdate: value.birthdate
        ? (value.birthdate as Date).toISOString().slice(0, 10)
        : null,
      diedAt: value.diedAt ? (value.diedAt as Date).toISOString() : null,
      gender: value.gender,
      biography: value.biography?.trim() || null,
      parentIds,
      spouseIds: value.spouseIds ?? [],
      childIds: value.childIds ?? [],
    };

    this.saving.set(true);

    if (this.isCreate()) {
      try {
        let created = await firstValueFrom(
          this.familyTreeService.store(payload as FamilyMemberPayload),
        );
        created = await this.uploadNewAvatar(created);
        this.messages.add({
          severity: 'success',
          summary: 'Member added',
          detail: `${this.fullName(created)} was added to the tree.`,
          life: 3000,
        });
        if (this.embedded()) {
          this.created.emit(created);
          return;
        }
        /* Land the user on the new member's edit page so they can upload an
         * avatar / media now that an id exists. */
        await this.router.navigate(['/family-members', created.id, 'edit']);
      } catch {
        this.messages.add({
          severity: 'error',
          summary: 'Could not add member',
          detail: 'Please try again.',
          life: 5000,
        });
      } finally {
        this.saving.set(false);
      }
      return;
    }

    const member = this.member();
    if (!member) {
      this.saving.set(false);
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.familyTreeService.update(member.id, payload),
      );
      this.applyMemberUpdate(updated);
      this.applyMemberToForm(updated, this.tree());
      this.recomputeSiblings();
      this.messages.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Family member updated successfully.',
        life: 3000,
      });
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'Save failed',
        detail: 'Could not update the family member. Please try again.',
        life: 5000,
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Upload the photo picked during creation. A failed upload keeps the member
   * (it already exists) and tells the admin to retry from the edit page.
   */
  private async uploadNewAvatar(created: FamilyMember): Promise<FamilyMember> {
    const file = this.newAvatarFile();
    if (!file) {
      return created;
    }
    try {
      const updated = await firstValueFrom(
        this.familyTreeService.uploadThumbnail(created.id, file),
      );
      this.setNewAvatar(null);
      return updated;
    } catch {
      this.messages.add({
        severity: 'warn',
        summary: 'Photo not saved',
        detail: `${this.fullName(created)} was added, but the photo upload failed. Try again from their page.`,
        life: 6000,
      });
      return created;
    }
  }

  /** Swap the locally held create-mode photo, releasing the old preview URL. */
  private setNewAvatar(file: File | null): void {
    const previous = this.newAvatarPreview();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.newAvatarFile.set(file);
    this.newAvatarPreview.set(file ? URL.createObjectURL(file) : null);
  }

  clearNewAvatar(): void {
    this.setNewAvatar(null);
  }

  openChildDrawer(): void {
    this.childDrawerOpen.set(true);
  }

  openSpouseDrawer(): void {
    this.spouseDrawerOpen.set(true);
  }

  /**
   * A child was created in the drawer: close it and reload this member so the
   * new child shows up. Only the children added on the server are merged into
   * the picker, so unsaved edits to the form survive.
   */
  async onChildCreated(child: FamilyMember): Promise<void> {
    this.childDrawerOpen.set(false);
    await this.mergeCreatedRelation(child, 'children', 'childIds', 'child');
  }

  /** Same as a new child, for a spouse created in the drawer. */
  async onSpouseCreated(spouse: FamilyMember): Promise<void> {
    this.spouseDrawerOpen.set(false);
    await this.mergeCreatedRelation(spouse, 'spouses', 'spouseIds', 'spouse');
  }

  private async mergeCreatedRelation(
    created: FamilyMember,
    rel: 'children' | 'spouses',
    controlName: 'childIds' | 'spouseIds',
    noun: string,
  ): Promise<void> {
    const member = this.member();
    if (!member) {
      return;
    }
    try {
      const { member: fresh, tree } = await firstValueFrom(
        forkJoin({
          member: this.familyTreeService.show(member.id),
          tree: this.familyTreeService.list(),
        }),
      );
      const before = new Set(member.rels[rel]);
      const added = fresh.rels[rel].filter((id) => !before.has(id)).map(Number);
      if (!added.includes(Number(created.id))) {
        added.push(Number(created.id));
      }
      this.tree.set(tree);
      this.member.set(fresh);
      const ctrl = this.form.get(controlName)!;
      const current = (ctrl.value as number[]) ?? [];
      ctrl.setValue([...current, ...added.filter((id) => !current.includes(id))]);
      this.recomputeSiblings();
    } catch {
      this.messages.add({
        severity: 'warn',
        summary: 'Could not refresh',
        detail: `The ${noun} was added; reload the page to see them.`,
        life: 5000,
      });
    }
  }

  confirmDelete(): void {
    const member = this.member();
    if (!member) {
      return;
    }
    this.confirm.confirm({
      header: 'Delete this family member?',
      message: `“${this.fullName(member)}” will be removed from the tree. This can be reverted by an admin.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.delete(member),
    });
  }

  /**
   * File picker change handler — opens the crop dialog so the admin can
   * frame the image inside the tree's oval before it becomes the thumbnail.
   */
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    /* Reset the input so picking the same file twice still triggers a change. */
    input.value = '';

    if (!file) {
      return;
    }

    if (!this.isCreate() && !this.member()) {
      return;
    }

    if (!this.avatarAccept.split(',').includes(file.type)) {
      this.messages.add({
        severity: 'warn',
        summary: 'Unsupported file',
        detail: 'Please choose a JPG, PNG, GIF, or WEBP image.',
        life: 4000,
      });
      return;
    }

    this.pendingAvatarFile.set(file);
  }

  /** Crop dialog confirmed — upload the oval-framed portrait as the thumbnail. */
  onAvatarCropped(file: File): void {
    /* No id yet in create mode — keep the portrait until the member is saved. */
    if (this.isCreate()) {
      this.setNewAvatar(file);
      this.pendingAvatarFile.set(null);
      return;
    }

    const member = this.member();
    if (!member) {
      return;
    }

    this.uploadingAvatar.set(true);
    this.familyTreeService.uploadThumbnail(member.id, file).subscribe({
      next: (updated) => {
        this.applyMemberUpdate(updated);
        this.uploadingAvatar.set(false);
        this.pendingAvatarFile.set(null);
        this.messages.add({
          severity: 'success',
          summary: 'Avatar updated',
          detail: 'New avatar saved.',
          life: 3000,
        });
      },
      error: () => {
        this.uploadingAvatar.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Upload failed',
          detail: 'Could not upload the avatar. Please try again.',
          life: 5000,
        });
      },
    });
  }

  removeAvatar(): void {
    const member = this.member();
    if (!member?.thumbnailUrl) {
      return;
    }
    this.confirm.confirm({
      header: 'Remove avatar?',
      message: `Remove the avatar for “${this.fullName(member)}”? They'll fall back to initials on every card.`,
      icon: 'pi pi-image',
      acceptLabel: 'Remove',
      rejectLabel: 'Keep',
      acceptButtonProps: { severity: 'secondary' },
      accept: () => {
        this.uploadingAvatar.set(true);
        this.familyTreeService.removeThumbnail(member.id).subscribe({
          next: () => {
            /* The DELETE endpoint returns no body — patch the local member
             * instead of refetching to keep the form snappy. */
            const patched: FamilyMember = {
              ...member,
              thumbnailUrl: null,
              data: { ...member.data, avatar: undefined },
            };
            this.applyMemberUpdate(patched);
            this.uploadingAvatar.set(false);
            this.messages.add({
              severity: 'success',
              summary: 'Avatar removed',
              detail: 'Avatar removed.',
              life: 3000,
            });
          },
          error: () => {
            this.uploadingAvatar.set(false);
            this.messages.add({
              severity: 'error',
              summary: 'Could not remove avatar',
              detail: 'Please try again.',
              life: 5000,
            });
          },
        });
      },
    });
  }

  /** Mirror an updated member into both the current signal and the tree array. */
  private applyMemberUpdate(updated: FamilyMember): void {
    this.member.set(updated);
    this.tree.update((t) => t.map((m) => (m.id === updated.id ? updated : m)));
  }

  private delete(member: FamilyMember): void {
    this.familyTreeService.remove(member.id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Family member deleted.',
          life: 3000,
        });
        setTimeout(() => this.router.navigate(['/family-members']), 800);
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: 'Could not delete the family member.',
          life: 5000,
        });
      },
    });
  }
}
