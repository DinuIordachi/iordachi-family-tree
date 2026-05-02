import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
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
import { ConfirmationService, MessageService } from 'primeng/api';
import { FamilyTreeService } from '@app/core/services';
import { FamilyMember, FamilyMemberPayload } from '@app/core/models';
import { AppTag, AppTagSeverity } from '@app/shared/components';

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

  /**
   * 'create' when navigated from /family-members/new (no id param),
   * 'edit' when navigated from /family-members/:id/edit.
   */
  readonly mode = signal<'create' | 'edit'>('edit');
  readonly isCreate = computed(() => this.mode() === 'create');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    /* `new` route lands here without an id. Skip member loading entirely
     * and just fetch the tree to populate relation pickers + sibling computation. */
    if (!id) {
      this.mode.set('create');
      this.familyTreeService.list().subscribe({
        next: (tree) => {
          this.tree.set(tree);
          this.loading.set(false);
          this.form.valueChanges.subscribe(() => this.recomputeSiblings());
        },
        error: () => {
          this.errorMessage.set('Failed to load the family tree.');
          this.loading.set(false);
        },
      });
      return;
    }

    this.mode.set('edit');
    forkJoin({
      member: this.familyTreeService.show(id),
      tree: this.familyTreeService.list(),
    }).subscribe({
      next: ({ member, tree }) => {
        this.tree.set(tree);
        this.member.set(member);
        this.applyMemberToForm(member, tree);
        this.recomputeSiblings();
        this.loading.set(false);

        this.form.valueChanges.subscribe(() => this.recomputeSiblings());
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
    if (!current) {
      this.siblings.set([]);
      return;
    }
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
      (m) => m.id !== current.id && m.rels.parents.some((p) => parentIds.has(p)),
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
    this.router.navigate(['/family-members', id, 'edit']);
  }

  cancel(): void {
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
        const created = await firstValueFrom(
          this.familyTreeService.store(payload as FamilyMemberPayload),
        );
        this.messages.add({
          severity: 'success',
          summary: 'Member added',
          detail: `${this.fullName(created)} was added to the tree.`,
          life: 3000,
        });
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
   * File picker change handler — uploads the selected image as the
   * member's thumbnail (i.e. the avatar shown on cards everywhere).
   */
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    /* Reset the input so picking the same file twice still triggers a change. */
    input.value = '';

    if (!file) {
      return;
    }

    const member = this.member();
    if (!member) {
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

    this.uploadingAvatar.set(true);
    this.familyTreeService.uploadThumbnail(member.id, file).subscribe({
      next: (updated) => {
        this.applyMemberUpdate(updated);
        this.uploadingAvatar.set(false);
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
