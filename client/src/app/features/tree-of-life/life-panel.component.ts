import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FamilyMember } from '@app/core/models';
import { PALETTE } from './life-layout';

interface Kin {
  id: string;
  name: string;
}

/**
 * Side panel for one member. Follows the guide's message placement: the
 * headline sits on the image, the description on the black ground below.
 */
@Component({
  selector: 'life-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (member(); as m) {
      <aside class="lp" role="dialog" aria-modal="false" [attr.aria-label]="fullName()">
        <div class="lp-hero" [class.no-photo]="!m.thumbnailUrl">
          @if (m.thumbnailUrl) {
            <img [src]="m.thumbnailUrl" [alt]="fullName()" />
          }
          <h2>
            <span class="lp-first">{{ m.data['first name'] }}</span>
            @if (m.data['last name']) {
              <span class="lp-last">{{ m.data['last name'] }}</span>
            }
          </h2>
          <button type="button" class="lp-close" aria-label="Close" (click)="closed.emit()">×</button>
        </div>

        <div class="lp-frieze" aria-hidden="true"></div>

        <div class="lp-body">
          <dl>
            @if (m.data.birthday) {
              <div><dt>Born</dt><dd>{{ formatDate(m.data.birthday) }}</dd></div>
            }
            @if (m.deceased) {
              <div><dt>Died</dt><dd>{{ m.diedAt ? formatDate(m.diedAt) : '†' }}</dd></div>
            }
          </dl>

          @if (m.biography) {
            <p class="lp-bio">{{ m.biography }}</p>
          }

          @for (group of kin(); track group.label) {
            @if (group.people.length) {
              <section>
                <h3>{{ group.label }}</h3>
                <ul>
                  @for (p of group.people; track p.id) {
                    <li>
                      <button type="button" [style.--dot]="group.color" (click)="navigate.emit(p.id)">{{ p.name }}</button>
                    </li>
                  }
                </ul>
              </section>
            }
          }
        </div>
      </aside>
    }
  `,
  styleUrl: './life-panel.component.scss',
})
export class LifePanelComponent {
  readonly member = input<FamilyMember | null>(null);
  readonly members = input<FamilyMember[]>([]);
  readonly closed = output<void>();
  readonly navigate = output<string>();

  readonly fullName = computed(() => {
    const m = this.member();
    return m ? [m.data['first name'], m.data['last name']].filter(Boolean).join(' ') : '';
  });

  readonly kin = computed(() => {
    const m = this.member();
    if (!m) return [];
    const byId = new Map(this.members().map((x) => [x.id, x]));
    const people = (ids: string[]): Kin[] =>
      ids
        .map((id) => byId.get(id))
        .filter((x): x is FamilyMember => !!x)
        .map((x) => ({ id: x.id, name: [x.data['first name'], x.data['last name']].filter(Boolean).join(' ') }));
    const siblings = new Set(
      m.rels.parents.flatMap((p) => byId.get(p)?.rels.children ?? []).filter((id) => id !== m.id),
    );
    return [
      { label: 'Parents', people: people(m.rels.parents), color: PALETTE.green },
      { label: 'Spouse', people: people(m.rels.spouses), color: PALETTE.red },
      { label: 'Children', people: people(m.rels.children), color: PALETTE.orange },
      { label: 'Siblings', people: people([...siblings]), color: PALETTE.blue },
    ];
  });

  formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
