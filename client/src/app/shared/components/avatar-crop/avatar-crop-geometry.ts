/**
 * Shape of the oval portrait drawn in the tree (see MedallionComponent).
 * The crop dialog frames the same proportions so what the admin picks is
 * exactly what fills the medallion.
 */
export const PORTRAIT_RX = 34;
export const PORTRAIT_RY = 42;
export const PORTRAIT_ASPECT = PORTRAIT_RX / PORTRAIT_RY;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface Size {
  width: number;
  height: number;
}

/**
 * Where the image sits relative to the crop frame.
 * `x`/`y` are the offset of the image centre from the frame centre,
 * expressed as fractions of the frame height so they survive the dialog
 * being resized. `zoom` is 1 when the image just covers the frame.
 */
export interface CropState {
  zoom: number;
  x: number;
  y: number;
}

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** Pixels per natural-image pixel when the image is displayed in `frame`. */
export function displayScale(image: Size, frame: Size, zoom: number): number {
  return Math.max(frame.width / image.width, frame.height / image.height) * zoom;
}

/** Keep zoom in range and the image covering the whole frame (no empty edges). */
export function clampCrop(state: CropState, image: Size, frame: Size): CropState {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom));
  const scale = displayScale(image, frame, zoom);
  const maxX = Math.max(0, (image.width * scale - frame.width) / 2) / frame.height;
  const maxY = Math.max(0, (image.height * scale - frame.height) / 2) / frame.height;
  const clamp = (v: number, max: number) => Math.min(max, Math.max(-max, v)) || 0;

  return { zoom, x: clamp(state.x, maxX), y: clamp(state.y, maxY) };
}

/** The region of the natural image that is visible inside the frame. */
export function cropRect(state: CropState, image: Size, frame: Size): CropRect {
  const scale = displayScale(image, frame, state.zoom);
  const offsetX = state.x * frame.height;
  const offsetY = state.y * frame.height;
  const sw = frame.width / scale;
  const sh = frame.height / scale;

  return {
    sx: image.width / 2 - offsetX / scale - sw / 2,
    sy: image.height / 2 - offsetY / scale - sh / 2,
    sw,
    sh,
  };
}
