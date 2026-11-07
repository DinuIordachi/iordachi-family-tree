import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MotifId, MotifPlacement } from '../engraving/types';

/** Native size of each motif's artwork in SVG user units (spec §6 / plan Task 8). */
export const MOTIF_SIZES: Record<MotifId, { width: number; height: number }> = {
  'stefan-cel-mare': { width: 180, height: 220 },
  'molda-hound': { width: 200, height: 110 },
  'aurochs-shield': { width: 110, height: 130 },
  'eagle-cross': { width: 220, height: 200 },
  'river-moldova': { width: 600, height: 60 },
  grapevine: { width: 80, height: 80 },
  'perched-falcon': { width: 80, height: 80 },
  'star-rose-crescent': { width: 80, height: 80 },
  'oak-sprig': { width: 80, height: 80 },
  'putna-church': { width: 80, height: 80 },
};

/** Renders one engraved motif from client/public/motifs/<id>.svg, centred on its placement. */
@Component({
  selector: 'g[etMotif]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[attr.transform]': 'transform()',
    '[class]': "'et-motif et-motif--' + placement().motif",
  },
  template: `<svg:use [attr.href]="href()" [attr.x]="-size().width / 2" [attr.y]="-size().height / 2"
    [attr.width]="size().width" [attr.height]="size().height" />`,
  styles: `
    :host {
      color: var(--et-ink);
    }
  `,
})
export class MotifComponent {
  readonly placement = input.required<MotifPlacement>();

  protected readonly size = computed(() => MOTIF_SIZES[this.placement().motif]);
  protected readonly href = computed(() => `motifs/${this.placement().motif}.svg#motif`);
  protected readonly transform = computed(() => {
    const { center, scale, mirrored } = this.placement();
    return `translate(${center.x} ${center.y}) scale(${scale})${mirrored ? ' scale(-1 1)' : ''}`;
  });
}
