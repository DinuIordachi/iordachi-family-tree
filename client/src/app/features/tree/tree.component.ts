import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import * as f3 from 'family-chart';
import { Data } from 'family-chart';
import { FamilyTreeService } from '@app/core/services';

@Component({
  selector: 'app-tree',
  standalone: true,
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
})
export class TreeComponent implements OnInit, OnDestroy {
  private readonly familyTreeService = inject(FamilyTreeService);
  private subscription?: Subscription;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.subscription = this.familyTreeService.list().subscribe({
      next: (members) => {
        this.loading.set(false);
        if (members.length === 0) {
          this.error.set('No family members yet.');
          return;
        }
        this.create(members as unknown as Data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load the family tree. Please try again later.');
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private create(data: Data): void {
    const f3Chart = f3
      .createChart('#FamilyChart', data)
      .setTransitionTime(1000)
      .setCardXSpacing(350)
      .setCardYSpacing(180)
      .setSingleParentEmptyCard(true, { label: 'ADD' })
      .setShowSiblingsOfMain(false)
      .setOrientationVertical();

    const f3Card = f3Chart
      .setCardHtml()
      .setCardDisplay([['first name', 'last name'], lifespanDisplay])
      .setMiniTree(true)
      .setStyle('imageRect')
      .setOnHoverPathToMain()
      .setOnCardUpdate(markDeceasedCard);

    f3Chart
      .editTree()
      .fixed()
      .setFields([
        'first name',
        'last name',
        'birthday',
        { type: 'text', id: 'died_at', label: 'Passed away' },
        { type: 'text', id: 'biography', label: 'Biography' },
      ])
      .setNoEdit()
      .setCardClickOpen(f3Card);

    f3Chart.updateTree({ initial: true });
  }
}

/**
 * Custom card-display row: shows "1925 – 1998" for deceased members,
 * just the birth year for the living. The function receives the outer
 * member object (the API's top-level FamilyMember), so `d.diedAt` is
 * available alongside `d.data.birthday`.
 */
function lifespanDisplay(d: any): string {
  const birthday = d?.data?.birthday;
  if (!birthday) {
    return '';
  }
  const birthYear = new Date(birthday).getFullYear();
  if (Number.isNaN(birthYear)) {
    return '';
  }
  if (d.diedAt) {
    const deathYear = new Date(d.diedAt).getFullYear();
    if (!Number.isNaN(deathYear)) {
      return `${birthYear} – ${deathYear}`;
    }
  }
  return `${birthYear}`;
}

/**
 * Per-card hook fired by family-chart on every render/update. Toggles the
 * `is-deceased` class on the card_cont and injects a single dagger stamp
 * into the inner card. Idempotent — safe across re-renders.
 */
function markDeceasedCard(this: HTMLElement, d: any): void {
  const member = d?.data;
  const isDeceased = !!member?.deceased;
  this.classList.toggle('is-deceased', isDeceased);

  const cardEl = this.querySelector('.card');
  if (!cardEl) {
    return;
  }
  let stamp = cardEl.querySelector('.deceased-stamp');
  if (isDeceased && !stamp) {
    stamp = document.createElement('span');
    stamp.className = 'deceased-stamp f3-card-deceased-stamp';
    stamp.setAttribute('aria-label', 'Deceased');
    stamp.innerHTML = '&dagger;';
    cardEl.appendChild(stamp);
  } else if (!isDeceased && stamp) {
    stamp.remove();
  }
}
