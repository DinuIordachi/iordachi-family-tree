import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import {
  CropState,
  MAX_ZOOM,
  MIN_ZOOM,
  PORTRAIT_ASPECT,
  Size,
  clampCrop,
  cropRect,
  displayScale,
} from './avatar-crop-geometry';

/** Output resolution of the cropped portrait (same oval proportions as the tree). */
const OUTPUT_HEIGHT = 630;
const OUTPUT_WIDTH = Math.round(OUTPUT_HEIGHT * PORTRAIT_ASPECT);
/** Gap kept between the oval frame and the top/bottom of the stage. */
const FRAME_INSET = 24;
const KEY_STEP = 0.02;
const ZOOM_STEP = 0.25;

const CENTRED: CropState = { zoom: 1, x: 0, y: 0 };

/**
 * Lets the admin pan / zoom a freshly picked photo inside an oval mask that
 * matches the tree medallion, then emits the cropped portrait as a JPEG file.
 * Opens whenever `file` is set; the parent clears it on `cropped`/`cancelled`.
 */
@Component({
  selector: 'app-avatar-crop-dialog',
  imports: [Dialog, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      header="Position the avatar"
      [visible]="!!file()"
      (visibleChange)="!$event && cancel()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="!saving()"
      [closable]="!saving()"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '96vw' }"
      styleClass="avatar-crop"
    >
      <div
        #stage
        class="avatar-crop__stage"
        tabindex="0"
        role="application"
        aria-label="Avatar crop area. Drag or use the arrow keys to reposition, plus and minus to zoom."
        [class.is-dragging]="dragging()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (wheel)="onWheel($event)"
        (keydown)="onKeydown($event)"
      >
        @if (imageUrl(); as url) {
          <img
            class="avatar-crop__image"
            [src]="url"
            alt=""
            draggable="false"
            [style.width.px]="imageBox().width"
            [style.height.px]="imageBox().height"
            [style.transform]="imageTransform()"
          />
        }
        <div
          class="avatar-crop__mask"
          aria-hidden="true"
          [style.width.px]="frame().width"
          [style.height.px]="frame().height"
        ></div>
        @if (showHint()) {
          <div class="avatar-crop__hint" aria-hidden="true">
            <i class="pi pi-arrows-alt"></i>
            <span>Drag or use the arrow keys to reposition the image</span>
          </div>
        }
      </div>

      <div class="avatar-crop__zoom">
        <p-button icon="pi pi-minus" [text]="true" [rounded]="true" severity="secondary"
                  ariaLabel="Zoom out" [disabled]="state().zoom <= minZoom"
                  (onClick)="zoomBy(-zoomStep)" />
        <input
          type="range"
          class="avatar-crop__slider"
          aria-label="Zoom"
          [min]="minZoom"
          [max]="maxZoom"
          step="0.01"
          [value]="state().zoom"
          (input)="setZoom(+$any($event.target).value)"
        />
        <p-button icon="pi pi-plus" [text]="true" [rounded]="true" severity="secondary"
                  ariaLabel="Zoom in" [disabled]="state().zoom >= maxZoom"
                  (onClick)="zoomBy(zoomStep)" />
      </div>
      <p class="avatar-crop__note">The area inside the oval is what appears in the family tree.</p>

      <ng-template #footer>
        <p-button label="Reset" icon="pi pi-refresh" [text]="true" severity="secondary"
                  [disabled]="saving()" (onClick)="reset()" />
        <span class="flex-1"></span>
        <p-button label="Cancel" severity="secondary" [outlined]="true"
                  [disabled]="saving()" (onClick)="cancel()" />
        <p-button label="Save avatar" icon="pi pi-check"
                  [loading]="saving()" [disabled]="!natural()" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    :host ::ng-deep .avatar-crop .p-dialog-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .avatar-crop__stage {
      position: relative;
      height: min(26rem, 60vh);
      overflow: hidden;
      border-radius: var(--p-border-radius-md, 6px);
      background: #111;
      cursor: grab;
      touch-action: none;
      user-select: none;
      outline: none;
    }
    .avatar-crop__stage:focus-visible {
      box-shadow: 0 0 0 2px var(--p-primary-color);
    }
    .avatar-crop__stage.is-dragging {
      cursor: grabbing;
    }
    .avatar-crop__image {
      position: absolute;
      left: 50%;
      top: 50%;
      max-width: none;
      pointer-events: none;
    }
    .avatar-crop__mask {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.6);
      outline: 2px solid rgba(255, 255, 255, 0.85);
      pointer-events: none;
    }
    .avatar-crop__hint {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      max-width: 85%;
      padding: 0.6rem 0.9rem;
      border-radius: 0.5rem;
      background: rgba(20, 20, 20, 0.85);
      color: #fff;
      font-size: 0.875rem;
      line-height: 1.3;
      pointer-events: none;
    }
    .avatar-crop__zoom {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .avatar-crop__slider {
      flex: 1;
      accent-color: var(--p-primary-color);
    }
    .avatar-crop__note {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      text-align: center;
    }
  `,
})
export class AvatarCropDialogComponent {
  /** The picked image; the dialog is open while this is set. */
  readonly file = input<File | null>(null);
  /** True while the parent uploads the result — locks the dialog. */
  readonly saving = input(false);
  readonly cropped = output<File>();
  readonly cancelled = output<void>();

  protected readonly minZoom = MIN_ZOOM;
  protected readonly maxZoom = MAX_ZOOM;
  protected readonly zoomStep = ZOOM_STEP;

  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly imageUrl = signal<string | null>(null);
  protected readonly natural = signal<Size | null>(null);
  protected readonly state = signal<CropState>(CENTRED);
  protected readonly dragging = signal(false);
  protected readonly showHint = signal(true);
  private readonly stageSize = signal<Size>({ width: 0, height: 0 });

  private image: HTMLImageElement | null = null;
  private drag: { pointerId: number; clientX: number; clientY: number; start: CropState } | null = null;

  /** The oval crop frame, sized to the stage, in CSS pixels. */
  protected readonly frame = computed<Size>(() => {
    const stage = this.stageSize();
    const height = Math.max(0, Math.min(stage.height - FRAME_INSET * 2, (stage.width - FRAME_INSET * 2) / PORTRAIT_ASPECT));
    return { width: height * PORTRAIT_ASPECT, height };
  });

  protected readonly imageBox = computed<Size>(() => {
    const image = this.natural();
    const frame = this.frame();
    if (!image || !frame.height) {
      return { width: 0, height: 0 };
    }
    const scale = displayScale(image, frame, this.state().zoom);
    return { width: image.width * scale, height: image.height * scale };
  });

  protected readonly imageTransform = computed(() => {
    const { x, y } = this.state();
    const h = this.frame().height;
    return `translate(-50%, -50%) translate(${x * h}px, ${y * h}px)`;
  });

  constructor() {
    effect((onCleanup) => {
      const file = this.file();
      this.state.set(CENTRED);
      this.natural.set(null);
      this.showHint.set(true);
      this.image = null;
      if (!file) {
        this.imageUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.natural.set({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
      this.imageUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });

    // Track the stage size so the oval frame follows the dialog width.
    effect((onCleanup) => {
      const el = this.stageRef()?.nativeElement;
      if (!el) {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        this.stageSize.set({ width: entry.contentRect.width, height: entry.contentRect.height });
      });
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  protected setZoom(zoom: number): void {
    this.update({ ...this.state(), zoom });
  }

  protected zoomBy(delta: number): void {
    this.setZoom(this.state().zoom + delta);
  }

  protected reset(): void {
    this.state.set(CENTRED);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.natural()) {
      return;
    }
    const el = event.currentTarget as HTMLElement;
    el.focus();
    el.setPointerCapture?.(event.pointerId);
    this.drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, start: this.state() };
    this.dragging.set(true);
    this.showHint.set(false);
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    const h = this.frame().height;
    if (!drag || drag.pointerId !== event.pointerId || !h) {
      return;
    }
    this.update({
      zoom: drag.start.zoom,
      x: drag.start.x + (event.clientX - drag.clientX) / h,
      y: drag.start.y + (event.clientY - drag.clientY) / h,
    });
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.drag?.pointerId === event.pointerId) {
      this.drag = null;
      this.dragging.set(false);
    }
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.showHint.set(false);
    this.setZoom(this.state().zoom * Math.exp(-event.deltaY * 0.0015));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? KEY_STEP * 5 : KEY_STEP;
    const { zoom, x, y } = this.state();
    const moves: Record<string, CropState> = {
      ArrowLeft: { zoom, x: x - step, y },
      ArrowRight: { zoom, x: x + step, y },
      ArrowUp: { zoom, x, y: y - step },
      ArrowDown: { zoom, x, y: y + step },
      '+': { zoom: zoom + ZOOM_STEP, x, y },
      '=': { zoom: zoom + ZOOM_STEP, x, y },
      '-': { zoom: zoom - ZOOM_STEP, x, y },
    };
    const next = moves[event.key];
    if (next) {
      event.preventDefault();
      this.showHint.set(false);
      this.update(next);
    }
  }

  protected cancel(): void {
    if (!this.saving()) {
      this.cancelled.emit();
    }
  }

  protected async save(): Promise<void> {
    const image = this.image;
    const natural = this.natural();
    const file = this.file();
    if (!image || !natural || !file) {
      return;
    }
    const { sx, sy, sw, sh } = cropRect(this.state(), natural, this.frameOrOutput());
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    // JPEG has no alpha — give transparent PNGs a white backdrop instead of black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      return;
    }
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
    this.cropped.emit(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
  }

  /** The crop maths only depends on the frame's proportions, which are fixed. */
  private frameOrOutput(): Size {
    const frame = this.frame();
    return frame.height ? frame : { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
  }

  private update(next: CropState): void {
    const natural = this.natural();
    const frame = this.frameOrOutput();
    this.state.set(natural ? clampCrop(next, natural, frame) : next);
  }
}
