import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PALETTE, tintOf } from './life-layout';
import { ORNAMENT_ELEMENTS, OrnamentKind } from './ornament-elements';
import { MotifSize, motifScale } from './ornament-scale';

/**
 * How a piece of the tree is painted:
 * - ink: its own colours;
 * - tint: the lighter tint of each colour, for the overlap layer;
 * - mask: plain white, for counting where things overlap.
 */
export type PaintMode = 'ink' | 'tint' | 'mask';

/**
 * One element of the Tree of Life, centred on the origin. Folk elements are
 * the original vectors from the guide's ornament (see ornament-elements.ts):
 * `main` shapes take `color`, inner `detail` shapes take `accent`, as in the
 * ornament's two-tone elements. In the tree they are drawn at line weight
 * (their outlines as thick as every line); `size="icon"` fits them to a box
 * for UI icons. The rose is the girdle's own flower (braul.svg).
 */
@Component({
  selector: 'g[lifeMotif]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kind() === 'rose') {
      <!--
        The rose crowning the symbol, after the flower in braul.svg: wine and
        red halves, the red's light tint for the drop, the single arc and the
        dot. Drawn in its own 990-unit grid; origin = the bottom dot, which
        sits on the end of the stem.
      -->
      <svg:g transform="scale(0.0772) translate(-490 -995)">
        <svg:g stroke-width="30" stroke-linejoin="round">
          <svg:path
            d="M490 220 L395 125 L362 92 H300 L178 214 V410 H152 L22 540 V592 L490 1060 Z"
            [attr.fill]="wine"
            [attr.stroke]="wine"
          />
          <svg:path
            d="M490 220 L585 125 L618 92 H680 L802 214 V410 H828 L958 540 V592 L490 1060 Z"
            [attr.fill]="red"
            [attr.stroke]="red"
          />
        </svg:g>
        <!-- Inverted drop between the two top lobes. -->
        <svg:path d="M490 262 L439 211 A72 72 0 1 1 541 211 Z" [attr.fill]="coral" />
        <!-- One arc, as thick as the stem. -->
        <svg:path d="M205 667 Q490 479 775 667" fill="none" [attr.stroke]="coral" stroke-width="150" stroke-linecap="round" />
        <!-- The exception: an extra dot on the end of the stem, covering the bottom corner. -->
        <svg:circle cx="490" cy="995" r="92" [attr.fill]="coral" />
      </svg:g>
    } @else if (element(); as e) {
      <svg:g [attr.transform]="'scale(' + scale() + ')'">
        @for (p of e.paths; track $index) {
          <svg:path [attr.d]="p.d" [attr.fill]="p.role === 'main' ? main() : detail()" />
        }
      </svg:g>
    }
  `,
})
export class LifeMotifComponent {
  readonly kind = input.required<OrnamentKind | 'rose'>();
  readonly color = input<string>(PALETTE.red);
  readonly accent = input<string>(PALETTE.wine);
  readonly size = input<MotifSize>('line');
  readonly mode = input<PaintMode>('ink');

  protected readonly element = computed(() => {
    const k = this.kind();
    return k === 'rose' ? null : ORNAMENT_ELEMENTS[k];
  });

  protected readonly scale = computed(() => {
    const k = this.kind();
    return k === 'rose' ? 1 : motifScale(k, this.size());
  });

  private paint(c: string): string {
    const m = this.mode();
    return m === 'mask' ? '#fff' : m === 'tint' ? tintOf(c) : c;
  }

  protected readonly main = computed(() => this.paint(this.color()));
  protected readonly detail = computed(() => this.paint(this.accent()));

  protected readonly wine = PALETTE.wine;
  protected readonly red = PALETTE.red;
  /** The rose's light parts are the red's own overlap tint, as in braul.svg. */
  protected readonly coral = tintOf(PALETTE.red);
}
