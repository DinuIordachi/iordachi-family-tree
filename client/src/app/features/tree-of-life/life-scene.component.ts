import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LifeDecoration } from './life-decorations';
import { GEOMETRY, LifeBranch, LifeLayout, PALETTE, tintOf } from './life-layout';
import { LifeMotifComponent, PaintMode } from './life-motif.component';
import { ElementKind } from './life-decorations';

/**
 * Everything drawn in line and element: the stem with its chevrons, branches,
 * bonds, sprigs and the members' elements. The view draws it three times —
 * in its colours (`ink`), in their lighter tints (`tint`), and in white at
 * half opacity (`mask`), which the view turns into a mask of the places
 * where two pieces overlap. The tint copy, seen only through that mask,
 * paints every overlap in the tint of whatever lies on top: the ornament's
 * "transparency", with no off-palette colours.
 *
 * Each piece is one `.unit`; in the mask a unit counts once however its own
 * parts overlap (an element's detail over its body, a polyline's corners).
 */
@Component({
  selector: 'g[lifeScene]',
  imports: [LifeMotifComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.mask]': "mode() === 'mask'" },
  template: `
    @let L = layout();
    @let m = mode();
    <svg:g fill="none" stroke-linecap="round" stroke-linejoin="round" [attr.stroke-width]="g.stroke">
      <!-- Central stem, from the girdle to the rose, with its chevrons. -->
      <svg:line
        class="unit"
        [attr.x1]="L.trunk.x"
        [attr.x2]="L.trunk.x"
        [attr.y1]="L.trunk.bottom"
        [attr.y2]="L.trunk.top"
        [attr.stroke]="paint(green)"
      />
      @for (leaf of L.leaves; track $index) {
        @for (ln of leaf.lines; track $index) {
          <svg:path class="unit" [attr.d]="ln.d" [attr.stroke]="paint(ln.color)" />
        }
      }

      @for (b of L.branches; track b.id) {
        <svg:path
          class="unit branch"
          [attr.d]="b.d"
          [attr.stroke]="paint(b.color)"
          pathLength="1"
          [style.animation-delay.ms]="b.gen * 380 + 200"
          [class.dim]="dims() && !branchLit(b)"
        />
      }
      @for (bond of L.bonds; track bond.id) {
        <svg:path class="unit bond" [attr.d]="bond.d" [attr.stroke]="paint(bond.color)" [class.dim]="dims() && !isLit(bond.memberIds)" />
      }
    </svg:g>

    <svg:g class="decor" [class.dim]="dims() && !!lit()">
      @for (d of decorations(); track d.id) {
        <svg:g class="sprig" [style.animation-delay.ms]="1500 + $index * 60">
          @for (ln of d.lines; track $index) {
            <svg:path
              class="unit"
              [attr.d]="ln"
              [attr.stroke]="paint(d.stubColor)"
              [attr.stroke-width]="g.stroke"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          }
          @if (!d.tip) {
            <svg:g [attr.transform]="'translate(' + d.x + ' ' + d.y + ') scale(' + -d.facing + ' ' + d.flip + ') rotate(' + d.rotate + ')'">
              <svg:g lifeMotif class="unit" [kind]="elementKind(d)" [color]="d.color" [accent]="d.accent" [mode]="m" />
            </svg:g>
          }
        </svg:g>
      }
    </svg:g>

    @for (mo of L.motifs; track mo.id) {
      <svg:g
        class="member"
        [attr.transform]="'translate(' + mo.x + ' ' + mo.y + ')'"
        [class.dim]="dims() && !isLit([mo.id])"
        [class.deceased]="dims() && mo.deceased"
        [style.animation-delay.ms]="mo.gen * 380 + 520"
      >
        <svg:g class="figure" [class.hot]="hovered() === mo.id">
          @if (mo.photo) {
            <!-- The agreed exception: the member's photo in a disc of their line
                 colour, their generation's element riding along as a badge. -->
            <svg:g class="unit">
              <svg:circle [attr.r]="g.avatar" [attr.fill]="paint(mo.color)" />
              @if (m !== 'mask') {
                @if (!broken().has(mo.id)) {
                  <svg:image
                    [attr.href]="mo.member.thumbnailUrl"
                    [attr.x]="-photoR"
                    [attr.y]="-photoR"
                    [attr.width]="2 * photoR"
                    [attr.height]="2 * photoR"
                    preserveAspectRatio="xMidYMid slice"
                    clip-path="url(#tol-avatar-clip)"
                    [class.gray]="mo.deceased"
                    (error)="photoError.emit(mo.id)"
                  />
                } @else {
                  <!-- Photo failed: the element takes its place inside the disc. -->
                  <svg:circle [attr.r]="photoR" [attr.fill]="ground" />
                  <svg:g lifeMotif size="icon" transform="scale(0.78)" [kind]="mo.motif" [color]="mo.color" [accent]="mo.accent" [mode]="m" />
                }
              }
              @if (mo.deceased) {
                <!-- Deceased: the cross moves from the name onto the avatar, opposite the badge. -->
                <svg:g class="badge" transform="translate(-22 -22)">
                  <svg:circle r="12" [attr.fill]="m === 'mask' ? '#fff' : ground" />
                  @if (m !== 'mask') {
                    <svg:path d="M0 -7 V7 M-4.5 -2.5 H4.5" fill="none" stroke="#f2f2f2" stroke-width="2.4" stroke-linecap="round" />
                  }
                </svg:g>
              }
              <svg:g class="badge" transform="translate(24 22)">
                <svg:circle r="15" [attr.fill]="m === 'mask' ? '#fff' : ground" />
                @if (m !== 'mask') {
                  <svg:g lifeMotif size="icon" transform="scale(0.42)" [kind]="mo.motif" [color]="mo.color" [accent]="mo.accent" [mode]="m" />
                }
              </svg:g>
            </svg:g>
          } @else {
            <svg:g
              lifeMotif
              class="unit"
              [attr.transform]="mo.mirror ? 'scale(-1 1)' : null"
              [kind]="mo.motif"
              [color]="mo.color"
              [accent]="mo.accent"
              [mode]="m"
            />
          }
        </svg:g>
      </svg:g>
    }
  `,
  styles: `
    :host {
      pointer-events: none;
    }

    :host(.mask) .unit {
      opacity: 0.5;
    }

    .branch {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: grow 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .branch,
    .bond,
    .decor,
    .member {
      transition: opacity 200ms;
    }

    .dim {
      opacity: 0.12 !important;
    }

    .sprig {
      animation: bloom 600ms ease-out backwards;
    }

    .member {
      animation: bloom 500ms cubic-bezier(0.2, 0.9, 0.3, 1.3) backwards;
    }

    .figure {
      transition: transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1.3);
    }

    .figure.hot {
      transform: scale(1.12);
    }

    /* A deceased member's photo is shown in grayscale (in every copy, so the tint layer matches). */
    .gray {
      filter: grayscale(1);
    }

    .deceased .figure {
      opacity: 0.72;
    }

    @keyframes grow {
      to {
        stroke-dashoffset: 0;
      }
    }

    @keyframes bloom {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .branch {
        animation: none;
        stroke-dashoffset: 0;
      }

      .sprig,
      .member {
        animation: none;
      }
    }
  `,
})
export class LifeSceneComponent {
  readonly layout = input.required<LifeLayout>();
  readonly decorations = input.required<LifeDecoration[]>();
  readonly mode = input<PaintMode>('ink');
  /** The lineage lit on hover/selection, or null when nothing is lit. */
  readonly lit = input<ReadonlySet<string> | null>(null);
  readonly hovered = input<string | null>(null);
  /** Members whose photo failed to load: their element fills the disc instead. */
  readonly broken = input<ReadonlySet<string>>(new Set());
  readonly photoError = output<string>();

  protected readonly g = GEOMETRY;
  protected readonly green = PALETTE.green;
  /** The photo inside the avatar disc: a ring of line colour shows around it. */
  protected readonly photoR = GEOMETRY.avatar - 5;
  /** The page's ground, behind badges and a missing photo. */
  protected readonly ground = '#0b0b0b';
  /** The mask counts overlaps regardless of what is lit. */
  protected readonly dims = computed(() => this.mode() !== 'mask');

  protected paint(c: string): string {
    const m = this.mode();
    return m === 'mask' ? '#fff' : m === 'tint' ? tintOf(c) : c;
  }

  protected isLit(ids: string[]): boolean {
    const lit = this.lit();
    return !lit || ids.some((id) => lit.has(id));
  }

  protected branchLit(b: LifeBranch): boolean {
    const lit = this.lit();
    return !lit || (lit.has(b.childId) && b.parentIds.some((id) => lit.has(id)));
  }

  /** The ornament element a decoration carries (tips carry none and never reach here). */
  protected elementKind(d: LifeDecoration): ElementKind {
    return d.kind as ElementKind;
  }
}
