"""
Trace an etching (dark lines on light paper) into SVG ink shapes.

Pure numpy + Pillow: masked crop -> light blur -> marching squares at an ink
threshold -> stitched, simplified contours (fill-rule evenodd), plus a solid
silhouette (dilate -> flood-fill holes -> erode) used as a paper backing.

Usage:
  python3 -I trace-etching.py <image> <out.svg> <json-config>
config: {"poly": [[x,y],...] (source px), "threshold": 0-255, "name": "...",
         "credit": "...", "mirror": bool, "silhouette_close": px}
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw


def box_blur(a, r=1):
    pad = np.pad(a, r, mode="edge")
    out = np.zeros_like(a, dtype=np.float32)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out += pad[r + dy : r + dy + a.shape[0], r + dx : r + dx + a.shape[1]]
    return out / (2 * r + 1) ** 2


def dilate(b, r):
    out = b.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out |= np.roll(np.roll(b, dy, 0), dx, 1)
    return out


def erode(b, r):
    return ~dilate(~b, r)


def marching_squares(field, iso):
    """Closed iso-contours of `field` (padded with zeros so every loop closes)."""
    f = np.pad(field, 1, constant_values=0).astype(np.float32)
    h, w = f.shape
    tl, tr, br, bl = f[:-1, :-1], f[:-1, 1:], f[1:, 1:], f[1:, :-1]
    case = (tl > iso) * 8 + (tr > iso) * 4 + (br > iso) * 2 + (bl > iso) * 1
    ys, xs = np.nonzero((case != 0) & (case != 15))

    def lerp(v0, v1):
        d = v1 - v0
        return 0.5 if abs(d) < 1e-6 else (iso - v0) / d

    nxt = {}
    for y, x in zip(ys.tolist(), xs.tolist()):
        c = int(case[y, x])
        a, b_, c_, d_ = float(tl[y, x]), float(tr[y, x]), float(br[y, x]), float(bl[y, x])
        top = (x + lerp(a, b_), y)
        right = (x + 1, y + lerp(b_, c_))
        bottom = (x + lerp(d_, c_), y + 1)
        left = (x, y + lerp(a, d_))
        centre = (a + b_ + c_ + d_) / 4
        segs = {
            1: [(left, bottom)], 2: [(bottom, right)], 3: [(left, right)], 4: [(right, top)],
            5: [(left, top), (right, bottom)] if centre > iso else [(left, bottom), (right, top)],
            6: [(bottom, top)], 7: [(left, top)], 8: [(top, left)], 9: [(top, bottom)],
            10: [(top, right), (bottom, left)] if centre > iso else [(top, left), (bottom, right)],
            11: [(top, right)], 12: [(right, left)], 13: [(right, bottom)], 14: [(bottom, left)],
        }[c]
        for p, q in segs:
            kp = (round(p[0], 3), round(p[1], 3))
            kq = (round(q[0], 3), round(q[1], 3))
            nxt.setdefault(kp, []).append(kq)
            nxt.setdefault(kq, []).append(kp)

    loops, seen = [], set()
    for start in list(nxt.keys()):
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            options = [n for n in nxt[cur] if n != prev]
            if not options:
                break
            n = options[0]
            if n == start:
                break
            if n in seen:
                break
            loop.append(n)
            seen.add(n)
            prev, cur = cur, n
        if len(loop) >= 3:
            loops.append([(p[0] - 1, p[1] - 1) for p in loop])
    return loops


def rdp(points, eps):
    if len(points) < 4:
        return points
    pts = np.array(points)
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab)
    if n < 1e-9:
        d = np.hypot(*(pts - a).T)
    else:
        d = np.abs(np.cross(ab, pts - a)) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


def area(loop):
    p = np.array(loop)
    return 0.5 * abs(np.dot(p[:, 0], np.roll(p[:, 1], 1)) - np.dot(p[:, 1], np.roll(p[:, 0], 1)))


def to_path(loops, eps, min_area, ox, oy, mirror_w=None):
    out = []
    for loop in loops:
        if area(loop) < min_area:
            continue
        s = rdp(loop + [loop[0]], eps)[:-1]
        if len(s) < 3:
            continue
        pts = [((mirror_w - x) if mirror_w is not None else x) - ox for x, _ in s], [y - oy for _, y in s]
        out.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in zip(*pts)) + "Z")
    return "".join(out)


def main():
    src, out_svg, cfg_path = sys.argv[1:4]
    cfg = json.load(open(cfg_path))
    poly = cfg["poly"]
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    pad = 6
    box = (int(min(xs)) - pad, int(min(ys)) - pad, int(max(xs)) + pad, int(max(ys)) + pad)
    gray = Image.open(src).convert("L").crop(box)
    w, h = gray.size

    mask_img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask_img).polygon([(x - box[0], y - box[1]) for x, y in poly], fill=255)
    mask = np.array(mask_img) > 0

    a = np.array(gray).astype(np.float32)
    # flatten the paper tone: normalise to the local paper level so faint plate tone vanishes
    paper = np.percentile(a[mask], 92)
    ink = np.clip((paper - a) / max(1.0, paper - np.percentile(a[mask], 3)), 0, 1) * 255
    ink[~mask] = 0
    ink = box_blur(ink, 1)

    ink_loops = marching_squares(ink, cfg.get("threshold", 70))

    solid = dilate(ink > cfg.get("threshold", 70), cfg.get("silhouette_close", 7))
    flood = Image.fromarray(((~solid) * 255).astype(np.uint8))
    ImageDraw.floodfill(flood, (0, 0), 128)
    outside = np.array(flood) == 128
    sil = erode(~outside, max(1, cfg.get("silhouette_close", 7) - 2)) & mask
    sil_loops = marching_squares(box_blur(sil.astype(np.float32) * 255, 2), 127)
    sil_loops = sorted(sil_loops, key=area, reverse=True)[:1]

    mirror_w = w if cfg.get("mirror") else None
    ink_d = to_path(ink_loops, 0.35, 1.2, 0, 0, mirror_w)
    sil_d = to_path(sil_loops, 0.8, 50, 0, 0, mirror_w)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
<!-- {cfg['name']}: {cfg['credit']}. Traced to SVG ink shapes; strokes use currentColor and the paper backing uses the et-paper theme token. -->
<symbol id="motif" viewBox="0 0 {w} {h}">
<g style="fill:currentColor;stroke:none">
<path class="paper" d="{sil_d}" style="fill:var(--et-paper, white)"/>
<path class="hatch" d="{ink_d}" fill-rule="evenodd"/>
</g>
</symbol>
<use href="#motif" width="{w}" height="{h}"/>
</svg>
"""
    open(out_svg, "w").write(svg)
    print(f"{out_svg}: {w}x{h}, {len(ink_loops)} ink loops, {len(svg) // 1024} KB")


if __name__ == "__main__":
    main()
