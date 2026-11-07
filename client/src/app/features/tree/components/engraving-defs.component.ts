import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Shared SVG <defs> for the engraved tree: paper grain, ink bleed, sepia
 * photo toning, hatching/stipple patterns and the medallion clip.
 */
@Component({
  selector: 'defs[etEngravingDefs]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg:filter id="et-paper-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="noise" />
      <feColorMatrix in="noise" type="matrix"
        values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.12 0" result="grain" />
      <feComposite in="grain" in2="SourceGraphic" operator="atop" />
    </svg:filter>

    <svg:filter id="et-ink-bleed" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="warp" />
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
    </svg:filter>

    <svg:filter id="et-sepia-photo">
      <feColorMatrix type="matrix"
        values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.08" intercept="-0.04" />
        <feFuncG type="linear" slope="1.08" intercept="-0.04" />
        <feFuncB type="linear" slope="1.08" intercept="-0.04" />
      </feComponentTransfer>
    </svg:filter>

    <svg:pattern id="et-hatch-45" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="4" class="et-hatch-line" />
    </svg:pattern>

    <svg:pattern id="et-hatch-135" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
      <line x1="0" y1="0" x2="0" y2="4" class="et-hatch-line" />
    </svg:pattern>

    <svg:pattern id="et-crosshatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="4" class="et-hatch-line" />
      <line x1="0" y1="0" x2="4" y2="0" class="et-hatch-line" />
    </svg:pattern>

    <svg:pattern id="et-stipple" width="9" height="9" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="2" r="0.55" class="et-stipple-dot" />
      <circle cx="6" cy="1" r="0.45" class="et-stipple-dot" />
      <circle cx="4" cy="5.5" r="0.6" class="et-stipple-dot" />
      <circle cx="8" cy="7" r="0.4" class="et-stipple-dot" />
      <circle cx="1" cy="8" r="0.5" class="et-stipple-dot" />
    </svg:pattern>

    <svg:clipPath id="et-medallion-clip" clipPathUnits="userSpaceOnUse">
      <ellipse cx="0" cy="0" rx="34" ry="42" />
    </svg:clipPath>
  `,
  styles: `
    .et-hatch-line {
      stroke: var(--et-ink-soft);
      stroke-width: var(--et-stroke-hair);
    }
    .et-stipple-dot {
      fill: var(--et-ink-soft);
    }
  `,
})
export class EngravingDefsComponent {}
