import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';

const MIN_WIDTH = 120;
const PADDING = 28;

/** Swallow-tailed ribbon banner carrying a name, with the years beneath it. */
@Component({
  selector: 'g[etBanner]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'et-banner', '[attr.data-width]': 'width()' },
  template: `
    <svg:g class="et-banner-body">
      <path class="et-banner-tail" [attr.d]="leftTail()" />
      <path class="et-banner-tail" [attr.d]="rightTail()" />
      <path class="et-banner-fold" [attr.d]="folds()" />
      <path class="et-banner-band" [attr.d]="band()" />
      <text
        #nameText
        class="et-banner-name"
        x="0"
        y="4.5"
        text-anchor="middle"
        [attr.textLength]="condensed() ? width() - padding : null"
        [attr.lengthAdjust]="condensed() ? 'spacingAndGlyphs' : null"
      >{{ name() }}</text>
      @if (years()) {
        <text class="et-banner-years" x="0" y="27" text-anchor="middle">{{ years() }}</text>
      }
    </svg:g>
  `,
  styles: `
    .et-banner-band,
    .et-banner-tail {
      fill: var(--et-paper);
      stroke: var(--et-ink);
      stroke-width: var(--et-stroke-fine);
      stroke-linejoin: round;
    }
    .et-banner-tail {
      fill: var(--et-paper-shade);
    }
    .et-banner-fold {
      fill: url(#et-hatch-45);
      stroke: var(--et-ink);
      stroke-width: var(--et-stroke-hair);
    }
    .et-banner-name {
      font-family: var(--et-font-name);
      font-size: var(--et-size-name);
      fill: var(--et-ink);
    }
    @keyframes et-unroll {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    /* Spec §5: banners unroll 100ms after their medallion. */
    :host-context(.engraved-tree.is-growing) .et-banner-body {
      animation: et-unroll 350ms var(--et-ease) both;
      animation-delay: calc(650ms + var(--et-gen, 0) * 300ms);
    }
    .et-banner-years {
      font-family: var(--et-font-body);
      font-style: italic;
      font-size: var(--et-size-years);
      fill: var(--et-ink-soft);
    }
  `,
})
export class BannerComponent {
  readonly name = input.required<string>();
  readonly years = input('');
  /** Widest the band may be (its slot minus the tails); longer names are condensed to fit. */
  readonly maxWidth = input(Number.POSITIVE_INFINITY);
  protected readonly padding = PADDING;

  private readonly nameText = viewChild<ElementRef<SVGTextElement>>('nameText');
  /** Text width: estimated from length, replaced by the real measurement once rendered. */
  private readonly measured = linkedSignal(() => this.name().length * 8);

  private readonly natural = computed(() => Math.max(MIN_WIDTH, Math.ceil(this.measured() + PADDING)));
  readonly condensed = computed(() => this.natural() > this.maxWidth());
  readonly width = computed(() => Math.min(this.natural(), this.maxWidth()));
  private readonly half = computed(() => this.width() / 2);

  readonly band = computed(() => {
    const h = this.half();
    return `M${-h} -11 Q0 -15 ${h} -11 L${h} 11 Q0 7 ${-h} 11 Z`;
  });
  readonly leftTail = computed(() => {
    const h = this.half();
    return `M${-h + 6} -5 L${-h - 16} -5 L${-h - 9} 4 L${-h - 16} 13 L${-h + 6} 13 Z`;
  });
  readonly rightTail = computed(() => {
    const h = this.half();
    return `M${h - 6} -5 L${h + 16} -5 L${h + 9} 4 L${h + 16} 13 L${h - 6} 13 Z`;
  });
  readonly folds = computed(() => {
    const h = this.half();
    return `M${-h} 11 L${-h + 6} 13 L${-h + 6} 7 Z M${h} 11 L${h - 6} 13 L${h - 6} 7 Z`;
  });

  constructor() {
    afterRenderEffect(() => {
      this.name();
      const el = this.nameText()?.nativeElement;
      if (el?.hasAttribute('textLength')) {
        return; // a condensed name reports its condensed length; keep the natural measurement
      }
      const length = el && typeof el.getComputedTextLength === 'function' ? el.getComputedTextLength() : 0;
      if (length > 0) {
        this.measured.set(length);
      }
    });
  }
}
