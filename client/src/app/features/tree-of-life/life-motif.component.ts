import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MotifKind, PALETTE } from './life-layout';

/**
 * One flat folk element of the Tree of Life, drawn in a 56×56 box centred
 * on the origin. Shapes follow the guide's symbol sheet: rounded geometric
 * forms, no outlines, no gradients.
 */
@Component({
  selector: 'g[lifeMotif]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (kind()) {
      @case ('basil') {
        <svg:g transform="rotate(45)">
          <svg:rect x="-23" y="-23" width="21" height="21" rx="6" [attr.fill]="color()" />
          <svg:rect x="2" y="-23" width="21" height="21" rx="6" [attr.fill]="color()" />
          <svg:rect x="-23" y="2" width="21" height="21" rx="6" [attr.fill]="color()" />
          <svg:rect x="2" y="2" width="21" height="21" rx="6" [attr.fill]="color()" />
          <svg:rect x="-11" y="-11" width="6" height="6" rx="1.5" [attr.fill]="accent()" />
          <svg:rect x="5" y="-11" width="6" height="6" rx="1.5" [attr.fill]="accent()" />
          <svg:rect x="-11" y="5" width="6" height="6" rx="1.5" [attr.fill]="accent()" />
          <svg:rect x="5" y="5" width="6" height="6" rx="1.5" [attr.fill]="accent()" />
        </svg:g>
      }
      @case ('glass') {
        <svg:path d="M-16 -27 H16 V-9 C16 4 8 10 0 10 C-8 10 -16 4 -16 -9 Z" [attr.fill]="color()" />
        <svg:rect x="-4" y="6" width="8" height="18" [attr.fill]="color()" />
        <svg:rect x="-13" y="21" width="26" height="7" rx="3.5" [attr.fill]="color()" />
        <svg:rect x="-16" y="-27" width="32" height="7" [attr.fill]="accent()" opacity="0.9" />
      }
      @case ('fruit') {
        <svg:circle cx="-2" cy="7" r="20" [attr.fill]="color()" />
        <svg:path d="M2 -12 L13 -26 H28 L17 -12 Z" [attr.fill]="accent()" />
      }
      @case ('connectivity') {
        <svg:g fill="none" [attr.stroke]="color()" stroke-width="7" stroke-linecap="round">
          <svg:path d="M-23 -12 Q0 -30 23 -12" />
          <svg:path d="M-15 1 Q0 -11 15 1" />
          <svg:path d="M-7 13 Q0 8 7 13" />
        </svg:g>
        <svg:circle cx="0" cy="24" r="5" [attr.fill]="accent()" />
      }
      @case ('star') {
        @for (a of petals; track a) {
          <svg:circle [attr.cx]="cos(a) * 16" [attr.cy]="sin(a) * 16" r="8" [attr.fill]="color()" />
        }
        <svg:circle r="15" [attr.fill]="color()" />
        <svg:circle r="8" [attr.fill]="orange" />
      }
      @case ('chip') {
        <svg:circle r="21" [attr.fill]="color()" />
        <svg:g transform="rotate(45)" [attr.fill]="accent()">
          <svg:rect x="-11" y="-3.5" width="22" height="7" rx="3.5" />
          <svg:rect x="-3.5" y="-11" width="7" height="22" rx="3.5" />
        </svg:g>
      }
      @case ('textile') {
        <svg:rect x="-20" y="-24" width="11" height="48" rx="5.5" [attr.fill]="color()" />
        <svg:rect x="-20" y="-24" width="40" height="11" rx="5.5" [attr.fill]="color()" />
        <svg:rect x="-20" y="-5.5" width="34" height="11" rx="5.5" [attr.fill]="color()" />
        <svg:rect x="-20" y="13" width="26" height="11" rx="5.5" [attr.fill]="color()" />
        <svg:rect x="6" y="-3" width="6" height="6" rx="1.5" [attr.fill]="accent()" />
      }
      @case ('heart') {
        <svg:rect x="-19" y="-19" width="38" height="38" rx="8" transform="rotate(45)" [attr.fill]="color()" />
        <svg:path d="M0 12 L-11 1 A5.5 5.5 0 0 1 0 -6 A5.5 5.5 0 0 1 11 1 Z" [attr.fill]="black" />
      }
      @case ('rose') {
        <svg:path d="M0 -40 L-12 -50 L-24 -40 L-44 -18 L-44 0 L0 44 Z" [attr.fill]="wine" />
        <svg:path d="M0 -40 L12 -50 L24 -40 L44 -18 L44 0 L0 44 Z" [attr.fill]="red" />
        <svg:path d="M0 -26 L-14 -12 L0 2 L14 -12 Z" [attr.fill]="magenta" opacity="0.95" />
        <svg:g fill="none" [attr.stroke]="pink" stroke-width="7" stroke-linecap="round">
          <svg:path d="M-24 4 Q0 -10 24 4" />
          <svg:path d="M-14 17 Q0 8 14 17" />
        </svg:g>
        <svg:circle cx="0" cy="-50" r="5" [attr.fill]="red" />
      }
    }
  `,
})
export class LifeMotifComponent {
  readonly kind = input.required<MotifKind | 'rose'>();
  readonly color = input<string>(PALETTE.red);
  readonly accent = input<string>(PALETTE.green);

  protected readonly petals = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => (d * Math.PI) / 180);
  protected readonly orange = PALETTE.orange;
  protected readonly black = PALETTE.black;
  protected readonly wine = PALETTE.wine;
  protected readonly red = PALETTE.red;
  protected readonly magenta = PALETTE.magenta;
  /** Overlap tint of red over orange, as in the guide's transparent ornament. */
  protected readonly pink = '#F0566A';

  protected cos = Math.cos;
  protected sin = Math.sin;
}
