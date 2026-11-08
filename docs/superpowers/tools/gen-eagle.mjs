// Heraldic eagle of the Moldovan coat of arms, engraved: displayed wings of individually drawn feathers,
// head turned to dexter holding an Orthodox cross, sceptre and olive branch in the talons, breast shield
// per fess gules and azure with the aurochs head, star, rose and crescent. Tinctures follow the engravers'
// hatching code (or = stipple, gules = vertical lines, azure = horizontal lines). Usage: node gen-eagle.mjs <out.svg>
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const f = (n) => (Math.round(n * 10) / 10).toString();
let seed = 1359;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
let clipSeq = 0;

const rad = (d) => (d * Math.PI) / 180;
const P = (x, y) => `${f(x)} ${f(y)}`;

function hatch(clipD, [x0, y0, x1, y1], angle, sp, width = 0.7) {
  const id = `k${++clipSeq}`;
  const a = rad(angle);
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 1;
  let d = '';
  for (let o = -R; o <= R; o += sp) {
    const px = cx - dy * o;
    const py = cy + dx * o;
    d += `M${P(px - dx * R, py - dy * R)}L${P(px + dx * R, py + dy * R)}`;
  }
  return `<clipPath id="${id}"><path d="${clipD}"/></clipPath><path class="hatch" clip-path="url(#${id})" d="${d}" style="fill:none;stroke-width:${width}"/>`;
}

function stipple(clipD, [x0, y0, x1, y1], density) {
  const id = `k${++clipSeq}`;
  let d = '';
  const n = Math.round((x1 - x0) * (y1 - y0) * density);
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    d += `M${P(x, y)}h0.01`;
  }
  return `<clipPath id="${id}"><path d="${clipD}"/></clipPath><path clip-path="url(#${id})" d="${d}" style="fill:none;stroke-width:1.3;stroke-linecap:round"/>`;
}

/** One feather: tapered vane with a rounded tip, rachis and barbs shaded on the lower side. */
function feather(bx, by, angleDeg, len, wid, shade = true) {
  const a = rad(angleDeg);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;
  const tip = [bx + ux * len, by + uy * len];
  const l1 = [bx + nx * wid * 0.5, by + ny * wid * 0.5];
  const r1 = [bx - nx * wid * 0.5, by - ny * wid * 0.5];
  const lm = [bx + ux * len * 0.75 + nx * wid, by + uy * len * 0.75 + ny * wid];
  const rm = [bx + ux * len * 0.75 - nx * wid, by + uy * len * 0.75 - ny * wid];
  const body = `M${P(...l1)}Q${P(lm[0] - ux * len * 0.2, lm[1] - uy * len * 0.2)} ${P(...lm)}Q${P(tip[0] + nx * wid * 0.6, tip[1] + ny * wid * 0.6)} ${P(...tip)}Q${P(tip[0] - nx * wid * 0.6, tip[1] - ny * wid * 0.6)} ${P(...rm)}Q${P(rm[0] - ux * len * 0.2, rm[1] - uy * len * 0.2)} ${P(...r1)}Z`;
  let barbs = '';
  if (shade) {
    for (let t = 0.15; t < 0.92; t += 0.07) {
      const sx = bx + ux * len * t;
      const sy = by + uy * len * t;
      const w = wid * (0.55 + 0.4 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
      barbs += `M${P(sx, sy)}l${P(-nx * w + ux * 3, -ny * w + uy * 3)}`;
    }
  }
  const rachis = `M${P(bx + ux * len * 0.12, by + uy * len * 0.12)}L${P(bx + ux * len * 0.9, by + uy * len * 0.9)}`;
  return { body, detail: rachis + barbs };
}

/** Left (dexter) wing; the right wing is its mirror image. */
function wing() {
  let bodies = '';
  let detail = '';
  // primaries and secondaries fan from the wrist, raised and spread
  const wrist = [-62, -38];
  const shoulder = [-24, -26];
  const primaries = 11;
  for (let i = 0; i < primaries; i++) {
    const t = i / (primaries - 1);
    const angle = 168 + t * 98; // from out-and-slightly-down to nearly straight up
    const len = 70 + Math.sin(Math.PI * (0.25 + t * 0.6)) * 48;
    // roots sit on a small arc around the wrist (hidden under the arm), so the fan never knots
    const base = [wrist[0] + Math.cos(rad(angle)) * 13, wrist[1] + Math.sin(rad(angle)) * 13];
    const fe = feather(base[0], base[1], angle, len, 9.5);
    bodies += fe.body;
    detail += fe.detail;
  }
  // secondaries hanging below the arm, between wrist and shoulder
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const bx = wrist[0] + (shoulder[0] - wrist[0]) * t;
    const by = wrist[1] + (shoulder[1] - wrist[1]) * t + 4;
    const fe = feather(bx, by, 150 - t * 55, 58 - t * 14, 8.5);
    bodies += fe.body;
    detail += fe.detail;
  }
  // two rows of scalloped coverts over the arm
  let coverts = '';
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = shoulder[0] + (wrist[0] - shoulder[0] - 10) * t - row * 6;
      const y = shoulder[1] - 6 + (wrist[1] - shoulder[1]) * t - row * 11 - Math.sin(Math.PI * t) * 10;
      coverts += `M${P(x - 7, y)}Q${P(x - 7, y + 10)} ${P(x, y + 11)}Q${P(x + 7, y + 10)} ${P(x + 7, y)}`;
    }
  }
  const arm = `M${P(...shoulder)}Q${P(-44, -64)} ${P(-70, -52)}Q${P(-74, -36)} ${P(-58, -28)}Q${P(-40, -20)} ${P(-22, -12)}Z`;
  return { bodies, detail, coverts, arm };
}

const w = wing();
const mirror = 'transform="scale(-1 1)"';

const body = `M${P(0, -40)}C${P(26, -40)} ${P(30, -6)} ${P(24, 22)}C${P(18, 44)} ${P(8, 54)} ${P(0, 56)}C${P(-8, 54)} ${P(-18, 44)} ${P(-24, 22)}C${P(-30, -6)} ${P(-26, -40)} ${P(0, -40)}Z`;
let tail = '';
let tailDetail = '';
for (let i = 0; i < 7; i++) {
  const angle = 90 + (i - 3) * 11;
  const fe = feather((i - 3) * 3, 46, angle, 46 + (3 - Math.abs(i - 3)) * 5, 8);
  tail += fe.body;
  tailDetail += fe.detail;
}
const neck = `M${P(-10, -36)}Q${P(-16, -58)} ${P(-10, -70)}L${P(6, -66)}Q${P(4, -52)} ${P(10, -36)}Z`;
// head turned to dexter (viewer's left) with a hooked beak and small crest
const head = `M${P(-2, -82)}C${P(8, -82)} ${P(10, -66)} ${P(2, -62)}L${P(-14, -62)}L${P(-24, -64)}Q${P(-34, -66)} ${P(-38, -60)}Q${P(-38, -70)} ${P(-30, -74)}L${P(-16, -78)}Q${P(-10, -84)} ${P(-2, -82)}Z`;
const crest = `M${P(-2, -82)}l${P(4, -6)}l${P(1, 7)}l${P(5, -4)}l${P(-1, 7)}`;
// Orthodox cross held in the beak
const cross = `M${P(-44, -112)}L${P(-44, -40)}M${P(-56, -98)}L${P(-32, -98)}M${P(-52, -108)}L${P(-36, -108)}M${P(-52, -54)}L${P(-36, -48)}`;
// talons
const legs = `M${P(-12, 48)}L${P(-24, 70)}M${P(12, 48)}L${P(24, 70)}`;
const talons = `M${P(-24, 70)}l${P(-6, 4)}M${P(-24, 70)}l${P(-2, 7)}M${P(-24, 70)}l${P(4, 6)}M${P(24, 70)}l${P(6, 4)}M${P(24, 70)}l${P(2, 7)}M${P(24, 70)}l${P(-4, 6)}`;
// sceptre (dexter) and olive branch (sinister)
const sceptre = `M${P(-60, 108)}L${P(-20, 62)}`;
let olive = `M${P(22, 66)}Q${P(48, 88)} ${P(70, 112)}`;
for (let i = 0; i < 6; i++) {
  const t = 0.15 + i * 0.14;
  const x = 22 + 48 * t;
  const y = 66 + 46 * t;
  const s = i % 2 ? 1 : -1;
  olive += `M${P(x, y)}q${P(s * 8, -4)} ${P(s * 12, -10)}q${P(-s * 6, 2)} ${P(-s * 12, 10)}`;
}
// breast shield per fess: gules (vertical) over azure (horizontal)
const shield = `M${P(-17, -14)}L${P(17, -14)}L${P(17, 10)}Q${P(17, 26)} ${P(0, 32)}Q${P(-17, 26)} ${P(-17, 10)}Z`;
const chief = `M${P(-17, -14)}L${P(17, -14)}L${P(17, 9)}L${P(-17, 9)}Z`;
const base = `M${P(-17, 9)}L${P(17, 9)}Q${P(17, 26)} ${P(0, 32)}Q${P(-17, 26)} ${P(-17, 9)}Z`;
const aurochs = `M${P(-6, -6)}Q${P(-7, 4)} ${P(-3, 9)}Q${P(0, 12)} ${P(3, 9)}Q${P(7, 4)} ${P(6, -6)}Q${P(0, -9)} ${P(-6, -6)}ZM${P(-6, -5)}Q${P(-13, -6)} ${P(-13, -13)}M${P(6, -5)}Q${P(13, -6)} ${P(13, -13)}M${P(-6, -3)}l-3 -2l-3 2l3 2ZM${P(6, -3)}l3 -2l3 2l-3 2Z`;
const star = (() => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 1.5 : 3.6;
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    d += `${i ? 'L' : 'M'}${P(Math.cos(a) * r, -11 + Math.sin(a) * r)}`;
  }
  return d + 'Z';
})();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-185 -165 370 300" width="740" height="600">
<!-- Heraldic eagle of the Moldovan arms: original engraved line art for the Iordachi family tree. Strokes use currentColor; fills use the et-paper theme token. -->
<symbol id="motif" viewBox="-185 -165 370 300">
<g style="fill:var(--et-paper, white);stroke:currentColor;stroke-width:1.1;stroke-linejoin:round;stroke-linecap:round">
<g>
  <path d="${w.bodies}"/>
  <path class="hatch" d="${w.detail}" style="fill:none;stroke-width:0.6"/>
  <path d="${w.arm}"/>
  ${stipple(w.arm, [-80, -70, -18, -8], 0.12)}
  <path d="${w.coverts}" style="fill:none;stroke-width:0.8"/>
</g>
<g ${mirror}>
  <path d="${w.bodies}"/>
  <path class="hatch" d="${w.detail}" style="fill:none;stroke-width:0.6"/>
  <path d="${w.arm}"/>
  <path d="${w.coverts}" style="fill:none;stroke-width:0.8"/>
</g>
<g ${mirror}>${stipple(w.arm, [-80, -70, -18, -8], 0.12)}</g>
<path d="${tail}"/>
<path class="hatch" d="${tailDetail}" style="fill:none;stroke-width:0.6"/>
<path d="${sceptre}" style="stroke-width:2.6"/>
<circle cx="-62" cy="110" r="3.2"/>
<path d="M${P(-24, 58)}m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M${P(-24, 51)}l0 -5" style="stroke-width:1"/>
<path d="${olive}" style="fill:none;stroke-width:0.9"/>
<path d="${legs}" style="stroke-width:3.2"/>
<path d="${talons}" style="fill:none;stroke-width:1.4"/>
<path d="${body}"/>
${stipple(body, [-30, -42, 30, 58], 0.16)}
${hatch(body, [-30, -42, 30, 58], 75, 3, 0.55)}
<path d="${neck}"/>
${stipple(neck, [-18, -72, 12, -34], 0.2)}
<path d="${head}"/>
${stipple(head, [-40, -86, 12, -58], 0.16)}
<path d="${crest}" style="fill:none;stroke-width:0.8"/>
<circle cx="-12" cy="-72" r="1.9" style="fill:currentColor;stroke:none"/>
<path d="M${P(-24, -64)}Q${P(-28, -62)} ${P(-32, -63)}" style="fill:none;stroke-width:0.8"/>
<path d="${cross}" style="fill:none;stroke-width:2.4"/>
<path d="${shield}" style="stroke-width:1.2"/>
${hatch(chief, [-18, -15, 18, 10], 90, 1.7, 0.45)}
${hatch(base, [-18, 8, 18, 33], 0, 1.7, 0.45)}
<path d="${aurochs}" style="stroke-width:0.8"/>
<path d="${star}" style="stroke-width:0.6"/>
<circle cx="-11" cy="0" r="2.4" style="stroke-width:0.6"/><circle cx="-11" cy="0" r="0.8" style="fill:currentColor;stroke:none"/>
<path d="M${P(13, -3)}a3.2 3.2 0 1 0 0 6a2.4 2.4 0 1 1 0 -6Z" style="stroke-width:0.6"/>
</g>
</symbol>
<use href="#motif" x="-185" y="-165" width="370" height="300"/>
</svg>
`;
writeFileSync(out, svg);
console.log(`${out}: ${(svg.length / 1024).toFixed(0)} KB`);
