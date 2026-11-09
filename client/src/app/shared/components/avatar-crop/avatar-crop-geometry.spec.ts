import { MAX_ZOOM, clampCrop, cropRect } from './avatar-crop-geometry';

const frame = { width: 340, height: 420 };

describe('avatar crop geometry', () => {
  it('crops the centred, frame-shaped region of a wide image at zoom 1', () => {
    const image = { width: 1200, height: 600 };
    const rect = cropRect({ zoom: 1, x: 0, y: 0 }, image, frame);

    expect(rect.sh).toBeCloseTo(600);
    expect(rect.sw).toBeCloseTo(600 * (340 / 420));
    expect(rect.sx).toBeCloseTo((1200 - rect.sw) / 2);
    expect(rect.sy).toBeCloseTo(0);
  });

  it('zooming in shrinks the cropped region around the same centre', () => {
    const image = { width: 1000, height: 1000 };
    const rect = cropRect({ zoom: 2, x: 0, y: 0 }, image, frame);

    expect(rect.sw).toBeCloseTo(1000 * (340 / 420) / 2);
    expect(rect.sx + rect.sw / 2).toBeCloseTo(500);
    expect(rect.sy + rect.sh / 2).toBeCloseTo(500);
  });

  it('moving the image right reveals more of its left side', () => {
    const image = { width: 1200, height: 600 };
    const centred = cropRect({ zoom: 1, x: 0, y: 0 }, image, frame);
    const moved = cropRect({ zoom: 1, x: 0.2, y: 0 }, image, frame);

    expect(moved.sx).toBeLessThan(centred.sx);
  });

  it('never lets the image leave an empty edge inside the frame', () => {
    const image = { width: 1200, height: 600 };
    const clamped = clampCrop({ zoom: 1, x: 99, y: -99 }, image, frame);
    const rect = cropRect(clamped, image, frame);

    expect(clamped.y).toBe(0);
    expect(rect.sx).toBeCloseTo(0);
    expect(rect.sy).toBeCloseTo(0);
  });

  it('keeps zoom within bounds', () => {
    const image = { width: 500, height: 500 };

    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, image, frame).zoom).toBe(1);
    expect(clampCrop({ zoom: 99, x: 0, y: 0 }, image, frame).zoom).toBe(MAX_ZOOM);
  });
});
