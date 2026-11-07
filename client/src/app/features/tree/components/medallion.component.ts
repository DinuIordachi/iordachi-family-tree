import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FamilyMember } from '@app/core/models';
import { fullName, lifespan, memberAriaLabel } from '../engraving/member-text';
import { BannerComponent } from './banner.component';

const RX = 34;
const RY = 42;
const LEAVES_PER_SIDE = 9;

/** Laurel leaves along both sides of the oval, 6 units outside the rim. */
function laurelLeaves(): { x: number; y: number; angle: number }[] {
  const leaves: { x: number; y: number; angle: number }[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < LEAVES_PER_SIDE; i++) {
      // sweep from the bottom (100°) up to the top (-70°) on each side
      const t = (100 - (170 * i) / (LEAVES_PER_SIDE - 1)) * (Math.PI / 180);
      const x = side * Math.cos(t) * (RX + 6);
      const y = Math.sin(t) * (RY + 6);
      const tangent = Math.atan2(Math.cos(t) * (RY + 6), -side * Math.sin(t) * (RX + 6)) * (180 / Math.PI);
      leaves.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, angle: Math.round(tangent) });
    }
  }
  return leaves;
}

const LEAVES = laurelLeaves();

/** Engraved oval portrait medallion with laurel ring and ribbon banner. Drawn around (0,0). */
@Component({
  selector: 'g[etMedallion]',
  imports: [BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'et-medallion',
    role: 'button',
    tabindex: '0',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-member-id]': 'member().id',
    '[class.is-deceased]': 'member().deceased',
    '[class.is-selected]': 'selected()',
    '(click)': 'activate.emit(member())',
    '(keydown)': 'onKeydown($event)',
    '(mouseenter)': 'hoverChange.emit(true)',
    '(mouseleave)': 'hoverChange.emit(false)',
    '(focus)': 'hoverChange.emit(true)',
    '(blur)': 'hoverChange.emit(false)',
  },
  template: `
    <svg:g class="et-laurel">
      @for (leaf of leaves; track $index) {
        <ellipse rx="2.6" ry="6" [attr.transform]="'translate(' + leaf.x + ' ' + leaf.y + ') rotate(' + leaf.angle + ')'" />
      }
    </svg:g>
    <svg:ellipse class="et-medallion-ground" cx="0" cy="0" [attr.rx]="rx" [attr.ry]="ry" />
    @if (showPhoto()) {
      <svg:image
        [attr.href]="member().thumbnailUrl"
        [attr.x]="-rx" [attr.y]="-ry" [attr.width]="rx * 2" [attr.height]="ry * 2"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#et-medallion-clip)"
        filter="url(#et-sepia-photo)"
        (error)="photoFailed.set(true)"
      />
    } @else {
      <svg:use class="et-silhouette" [attr.href]="silhouetteHref()"
        [attr.x]="-rx" [attr.y]="-ry" [attr.width]="rx * 2" [attr.height]="ry * 2" />
    }
    @if (member().deceased) {
      <svg:ellipse class="et-mourning-ring" cx="0" cy="0" [attr.rx]="rx + 2" [attr.ry]="ry + 2" />
    }
    <svg:ellipse class="et-rim" cx="0" cy="0" [attr.rx]="rx" [attr.ry]="ry" />
    <svg:ellipse class="et-focus-ring" cx="0" cy="0" [attr.rx]="rx + 12" [attr.ry]="ry + 12" />
    @if (member().deceased) {
      <svg:text class="et-dagger" x="26" y="-30" aria-hidden="true">†</svg:text>
    }
    <svg:g etBanner transform="translate(0 58)" [name]="name()" [years]="years()" />
  `,
  styles: `
    :host {
      cursor: pointer;
      outline: none;
    }
    .et-laurel ellipse {
      fill: var(--et-paper);
      stroke: var(--et-ink-soft);
      stroke-width: var(--et-stroke-hair);
    }
    .et-medallion-ground {
      fill: var(--et-paper-shade);
    }
    .et-silhouette {
      color: var(--et-ink-soft);
    }
    .et-rim {
      fill: none;
      stroke: var(--et-ink);
      stroke-width: var(--et-stroke-main);
      transition: stroke 200ms var(--et-ease);
    }
    .et-mourning-ring {
      fill: none;
      stroke: url(#et-crosshatch);
      stroke-width: 5;
    }
    .et-focus-ring {
      fill: none;
      stroke: var(--et-focus);
      stroke-width: 2;
      stroke-dasharray: 4 3;
      opacity: 0;
    }
    .et-dagger {
      font-family: var(--et-font-body);
      font-size: 16px;
      fill: var(--et-oxblood);
    }
    :host(:hover) .et-rim,
    :host(:focus-visible) .et-rim,
    :host(.is-selected) .et-rim {
      stroke: var(--et-gilt);
      stroke-width: var(--et-stroke-bold);
    }
    :host(:focus-visible) .et-focus-ring {
      opacity: 1;
    }
    :host(.is-deceased) ::ng-deep .et-banner-name {
      font-style: italic;
    }
  `,
})
export class MedallionComponent {
  readonly member = input.required<FamilyMember>();
  readonly selected = input(false);
  readonly activate = output<FamilyMember>();
  readonly hoverChange = output<boolean>();

  protected readonly rx = RX;
  protected readonly ry = RY;
  protected readonly leaves = LEAVES;

  /** Reset whenever the thumbnail URL changes. */
  protected readonly photoFailed = linkedSignal(() => {
    this.member().thumbnailUrl;
    return false;
  });
  protected readonly showPhoto = computed(() => !!this.member().thumbnailUrl && !this.photoFailed());
  protected readonly silhouetteHref = computed(() => {
    const g = this.member().data.gender;
    return `motifs/silhouette-${g === 'M' ? 'm' : g === 'F' ? 'f' : 'u'}.svg#motif`;
  });
  protected readonly ariaLabel = computed(() => memberAriaLabel(this.member()));
  protected readonly name = computed(() => fullName(this.member()));
  protected readonly years = computed(() => lifespan(this.member()));

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activate.emit(this.member());
    }
  }
}
