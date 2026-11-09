import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { FamilyMember } from '@app/core/models';
import { Drawer } from 'primeng/drawer';
import { fullName, lifespan } from '../engraving/member-text';

/** Parchment detail leaf for one family member (spec §6, "Detail panel"). */
@Component({
  selector: 'et-member-panel',
  imports: [Drawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <p-drawer
      [visible]="!!member()"
      (visibleChange)="$event || closed.emit()"
      position="right"
      styleClass="engraved-tree et-parchment"
      [closeOnEscape]="true"
      [modal]="false"
      [blockScroll]="false"
      ariaCloseLabel="Close"
    >
      @if (member(); as m) {
        <article class="et-panel">
          <img class="et-panel-portrait" [src]="portrait()" [alt]="'Portrait of ' + name()" (error)="onPortraitError($event)" />
          <h2 class="et-panel-name">{{ name() }}</h2>
          @if (years()) {
            <p class="et-panel-years">{{ years() }}</p>
          }
          @if (m.biography) {
            <p class="et-panel-bio">{{ m.biography }}</p>
          }
          @if (m.media.length) {
            <h3 class="et-panel-heading">Mementos</h3>
            <ul class="et-panel-gallery">
              @for (item of m.media; track item.id) {
                <li>
                  <a class="et-panel-media" [href]="item.url" target="_blank" rel="noopener">
                    @if (item.mime.startsWith('image/')) {
                      <img [src]="item.url" [alt]="item.name" />
                    } @else {
                      <span class="et-panel-file">{{ item.fileName }}</span>
                    }
                  </a>
                </li>
              }
            </ul>
          }
        </article>
      }
    </p-drawer>
  `,
  styles: `
    .p-drawer.et-parchment {
      width: min(26rem, 100vw);
      background: var(--et-paper);
      color: var(--et-ink);
      border-left: 3px double var(--et-ink);
      box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
      font-family: var(--et-font-body);
    }
    .et-parchment .p-drawer-header {
      padding-bottom: 0;
    }
    .et-parchment .p-drawer-close-button {
      color: var(--et-ink);
    }
    .et-parchment .p-drawer-close-button:focus-visible {
      outline: 2px solid var(--et-focus);
    }
    .et-panel {
      /* room for the portrait's double gilt frame, which is drawn outside the image box */
      padding-top: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      text-align: center;
    }
    .et-panel-portrait {
      width: 9rem;
      height: 11rem;
      object-fit: cover;
      border-radius: 50%;
      border: 2px solid var(--et-ink);
      outline: 6px double var(--et-gilt);
      outline-offset: 3px;
      filter: sepia(0.85) contrast(1.05);
      background: var(--et-paper-shade);
      margin-bottom: 0.75rem;
    }
    .et-panel-name {
      margin: 0;
      font-family: var(--et-font-display);
      font-size: 1.75rem;
      font-weight: 400;
    }
    .et-panel-years {
      margin: 0;
      font-style: italic;
      color: var(--et-ink-soft);
      font-size: 1.15rem;
    }
    .et-panel-bio {
      margin: 0.75rem 0 0;
      white-space: pre-wrap;
      word-break: break-word;
      text-align: left;
      font-size: 1.15rem;
      line-height: 1.45;
    }
    .et-panel-bio::first-letter {
      font-family: var(--et-font-display);
      font-size: 2.6em;
      float: left;
      line-height: 0.9;
      padding-right: 0.1em;
      color: var(--et-oxblood);
    }
    .et-panel-heading {
      align-self: stretch;
      margin: 1rem 0 0;
      font-family: var(--et-font-display);
      font-weight: 400;
      border-top: 1px solid var(--et-ink-soft);
      padding-top: 0.75rem;
    }
    .et-panel-gallery {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      align-self: stretch;
    }
    .et-panel-media {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      border: 1px solid var(--et-ink-soft);
      color: var(--et-ink);
      overflow: hidden;
    }
    .et-panel-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: sepia(0.7);
    }
    .et-panel-media:focus-visible {
      outline: 2px solid var(--et-focus);
    }
    .et-panel-file {
      font-size: 0.8rem;
      padding: 0.25rem;
      word-break: break-all;
    }
  `,
})
export class MemberPanelComponent {
  readonly member = input<FamilyMember | null>(null);
  readonly closed = output<void>();

  protected readonly name = computed(() => (this.member() ? fullName(this.member()!) : ''));
  protected readonly years = computed(() => (this.member() ? lifespan(this.member()!) : ''));
  protected readonly portrait = computed(() => {
    const m = this.member();
    return m?.thumbnailUrl || this.silhouette();
  });

  private silhouette(): string {
    const g = this.member()?.data.gender;
    return `motifs/silhouette-${g === 'M' ? 'm' : g === 'F' ? 'f' : 'u'}.svg`;
  }

  protected onPortraitError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const fallback = this.silhouette();
    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }
}
