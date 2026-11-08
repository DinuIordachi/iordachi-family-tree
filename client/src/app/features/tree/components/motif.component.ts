import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MotifId, MotifPlacement } from '../engraving/types';

/** Size of each motif in tree units (aspect ratios match each artwork's viewBox). */
export const MOTIF_SIZES: Record<MotifId, { width: number; height: number }> = {
  'stefan-cel-mare': { width: 151, height: 240 },
  'molda-hound': { width: 166, height: 165 },
  'aurochs-shield': { width: 110, height: 130 },
  'eagle-cross': { width: 260, height: 211 },
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

  /** The river stretches horizontally only, so a wide tree doesn't get a tall river. */
  private readonly stretched = computed(() => this.placement().motif === 'river-moldova');

  protected readonly size = computed(() => {
    const base = MOTIF_SIZES[this.placement().motif];
    return this.stretched() ? { width: base.width * this.placement().scale, height: base.height } : base;
  });
  protected readonly href = computed(() => `motifs/${this.placement().motif}.svg#motif`);
  protected readonly transform = computed(() => {
    const { center, scale, mirrored } = this.placement();
    const translate = `translate(${center.x} ${center.y})`;
    if (this.stretched()) {
      return translate;
    }
    return `${translate} scale(${scale})${mirrored ? ' scale(-1 1)' : ''}`;
  });
}
