// Ștefan cel Mare, kneeling — engraved after the votive portrait in the Humor Gospel (1473, public domain).
// Pose, proportions and costume outlines follow the miniature's coordinates; head, hands and folds are drawn,
// shading is generated as clipped parallel hatching. Usage: node gen-stefan.mjs <out.svg>
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const f = (n) => (Math.round(n * 10) / 10).toString();
let seq = 0;
let seed = 1473;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const W = 540;
const TOP = 40;
const H = 860;

/** Parallel lines over a bbox at an angle; clipped to `clipD` (and optional second clip). */
function hatch(clipD, [x0, y0, x1, y1], angle, sp, width = 1.6, clip2 = null, keep = 1) {
  const id = `st${++seq}`;
  const id2 = clip2 ? `st${++seq}` : null;
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  let d = '';
  for (let o = -R; o <= R; o += sp) {
    if (rnd() > keep) continue;
    const px = cx - dy * o;
    const py = cy + dx * o;
    // slightly wavering engraved line
    const pts = [];
    for (let t = -R; t <= R; t += 24) pts.push([px + dx * t + (rnd() - 0.5) * 0.8, py + dy * t + (rnd() - 0.5) * 0.8]);
    d += 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
  }
  const defs = `<clipPath id="${id}"><path d="${clipD}"/></clipPath>` + (id2 ? `<clipPath id="${id2}"><path d="${clip2}"/></clipPath>` : '');
  const inner = `<path class="hatch" d="${d}" style="stroke-width:${width};fill:none"/>`;
  return defs + `<g clip-path="url(#${id})">` + (id2 ? `<g clip-path="url(#${id2})">${inner}</g>` : inner) + '</g>';
}

/** Short strokes along a fold to shade one side of it. */
function foldShade(points, side = 1, len = 10, every = 7) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const segLen = Math.hypot(bx - ax, by - ay);
    const nx = (-(by - ay) / segLen) * side;
    const ny = ((bx - ax) / segLen) * side;
    for (let t = 0; t < segLen; t += every) {
      const x = ax + ((bx - ax) * t) / segLen;
      const y = ay + ((by - ay) * t) / segLen;
      const l = len * (0.6 + rnd() * 0.5);
      d += `M${f(x)} ${f(y)}l${f(nx * l + (bx - ax) / segLen * 2)} ${f(ny * l + (by - ay) / segLen * 2)}`;
    }
  }
  return d;
}

const smooth = (pts) => {
  // Catmull-Rom → cubic Bézier through the points
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
};
const closed = (pts) => smooth([...pts, pts[0]]) + 'Z';

// ───── shapes (coordinates from the Humor miniature, crop-relative) ─────
const robe = closed([
  [236, 250], [300, 262], [330, 300], [352, 440], [382, 470], [388, 600], [396, 738], [420, 784], [440, 826], [432, 850],
  [330, 852], [250, 850], [170, 846], [104, 838], [60, 760], [74, 650], [98, 560], [128, 470], [150, 395],
  [160, 330], [176, 270], [210, 252],
]);
const robeShade = 'M300 240 L560 240 L560 900 L250 900 Q330 600 300 240 Z';
const robeDeep = 'M350 430 L560 430 L560 900 L330 900 Q380 650 350 430 Z';
const hemShade = 'M0 770 L560 770 L560 900 L0 900 Z';
const sleeve = closed([
  [286, 268], [330, 284], [372, 300], [418, 316], [448, 324], [452, 362], [446, 402], [404, 426], [354, 444],
  [318, 432], [288, 404], [272, 350],
]);
const sleeveShade = 'M260 372 Q360 392 470 360 L470 460 L260 460 Z';
const cuff = closed([[440, 320], [462, 326], [466, 366], [460, 408], [438, 404], [444, 362]]);
const belt = closed([[150, 452], [260, 462], [372, 470], [378, 486], [262, 480], [146, 470]]);
const fur = closed([[100, 812], [180, 822], [260, 826], [340, 824], [420, 818], [440, 832], [434, 858], [330, 860], [250, 860], [170, 856], [100, 846]]);
const boot = closed([[106, 812], [80, 818], [62, 834], [44, 858], [30, 880], [42, 886], [62, 874], [86, 860], [104, 846]]);
const collar = closed([[212, 246], [250, 254], [292, 256], [304, 270], [262, 276], [222, 270], [204, 262]]);

// head (profile facing right, raised toward the tree)
const neck = closed([[244, 214], [282, 222], [290, 258], [246, 258]]);
const face = closed([
  [262, 116], [282, 122], [292, 138], [298, 150], [312, 170], [302, 177], [305, 186], [301, 197], [298, 212],
  [286, 226], [268, 232], [252, 222], [248, 190], [252, 150],
]);
const hairBack = closed([
  [208, 122], [238, 112], [262, 116], [254, 150], [250, 190], [256, 230], [268, 252], [236, 262], [200, 268],
  [176, 262], [168, 230], [174, 190], [186, 150],
]);
const crownBand = closed([[200, 126], [232, 114], [268, 104], [276, 118], [240, 128], [206, 140]]);
const fleurons = [[204, 124], [222, 116], [242, 110], [260, 106], [274, 104]]
  .map(([x, y], i) => {
    const h = i % 2 === 0 ? 26 : 18;
    const tx = x - 5;
    const ty = y - h;
    return `M${x - 6} ${y}L${tx} ${ty + 8}Q${tx - 6} ${ty} ${tx} ${ty - 4}Q${tx + 6} ${ty} ${tx} ${ty + 8}L${x + 4} ${y}`;
  })
  .join('');
const moustache = 'M288 184 Q296 180 304 186 Q300 190 294 190 Q288 196 280 206 Q282 196 288 184 Z';
const hand = closed([
  [452, 330], [480, 334], [504, 344], [520, 360], [528, 380], [524, 392], [514, 386], [506, 372], [496, 378],
  [488, 392], [478, 388], [474, 370], [460, 372], [452, 360],
]);
const nimbus = 'M228 160 m-92 0 a92 92 0 1 0 184 0 a92 92 0 1 0 -184 0';

// pomegranate brocade marks scattered over the caftan's lit side
let brocade = '';
for (let i = 0; i < 26; i++) {
  const x = 120 + rnd() * 210;
  const y = 300 + rnd() * 490;
  if (x > 160 + (y - 300) * 0.3 + 120) continue;
  brocade += `M${f(x)} ${f(y - 7)}Q${f(x + 6)} ${f(y - 2)} ${f(x)} ${f(y + 7)}Q${f(x - 6)} ${f(y - 2)} ${f(x)} ${f(y - 7)}Z`;
  brocade += `M${f(x - 7)} ${f(y + 9)}Q${f(x)} ${f(y + 4)} ${f(x + 7)} ${f(y + 9)}`;
}

const folds = [
  [[214, 478], [196, 600], [170, 720], [146, 816]],
  [[262, 486], [258, 620], [250, 740], [244, 820]],
  [[314, 488], [322, 620], [330, 740], [336, 818]],
  [[352, 490], [364, 640], [384, 760], [420, 800]],
  [[330, 760], [372, 784], [418, 806]],
  [[318, 800], [370, 816], [426, 824]],
  [[176, 300], [158, 380], [140, 450]],
];
const sleeveFolds = [
  [[300, 300], [350, 318], [410, 332]],
  [[296, 340], [352, 360], [430, 366]],
  [[318, 404], [370, 404], [430, 392]],
];
const hairStrands = Array.from({ length: 14 }, (_, i) => {
  const x0 = 190 + i * 5;
  return smooth([[x0 + 10, 124 + (i % 3) * 3], [x0 - 4 + (i % 2) * 6, 170], [x0 + 2, 210], [x0 - 6 + (i % 3) * 4, 256]]);
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${TOP} ${W} ${H}" width="${W}" height="${H}">
<!-- Ștefan cel Mare: kneeling figure engraved after the votive portrait in the Humor Gospel (1473), public domain. Strokes use currentColor; fills use the et-paper theme token. -->
<symbol id="motif" viewBox="0 ${TOP} ${W} ${H}">
<g style="fill:var(--et-paper, white);stroke:currentColor;stroke-width:3.4;stroke-linejoin:round;stroke-linecap:round">
<path d="${nimbus}" style="fill:none;stroke-width:1.8"/>
<path d="M228 160 m-84 0 a84 84 0 1 0 168 0 a84 84 0 1 0 -168 0" style="fill:none;stroke-width:1;stroke-dasharray:2 6"/>
<ellipse cx="240" cy="866" rx="210" ry="16" style="fill:none;stroke:none"/>
${hatch('M20 850 L470 850 L470 892 L20 892 Z', [20, 850, 470, 892], 0, 4.5, 1.4, 'M240 870 m-220 0 a220 20 0 1 0 440 0 a220 20 0 1 0 -440 0')}
<path d="${boot}"/>
${hatch(boot, [28, 840, 110, 888], 30, 4, 1.4)}
<path d="${robe}"/>
${hatch(robe, [60, 250, 440, 860], 82, 9, 1.4, null, 0.85)}
${hatch(robe, [60, 250, 440, 860], 82, 4.5, 1.4, robeShade)}
${hatch(robe, [60, 250, 440, 860], 22, 5, 1.3, robeDeep)}
${hatch(robe, [60, 250, 440, 860], 76, 4.5, 1.3, hemShade, 0.8)}
<path d="${brocade}" style="fill:none;stroke-width:1.5"/>
<path d="${folds.map(smooth).join('')}" style="fill:none;stroke-width:2.6"/>
<path class="hatch" d="${folds.map((p) => foldShade(p, -1, 11, 6)).join('')}" style="fill:none;stroke-width:1.3"/>
<path d="${fur}"/>
<path d="${Array.from({ length: 70 }, (_, i) => { const x = 104 + i * 4.3; const y = 818 + (rnd() * 20); return `M${f(x)} ${f(y)}l${f(rnd() * 3 - 1)} ${f(6 + rnd() * 6)}`; }).join('')}" style="fill:none;stroke-width:1.2"/>
<path d="${belt}"/>
${hatch(belt, [140, 450, 380, 490], 60, 3, 1.3)}
<circle cx="300" cy="476" r="8"/><circle cx="300" cy="476" r="3" style="fill:currentColor"/>
<path d="${hairBack}"/>
${hatch(hairBack, [160, 100, 280, 270], 76, 4.5, 1.3)}
<path d="${hairStrands}" style="fill:none;stroke-width:1.4"/>
<path d="${collar}"/>
<path d="${neck}"/>
${hatch(neck, [240, 210, 296, 262], 110, 4, 1.2)}
<path d="${face}"/>
${hatch(face, [246, 110, 316, 236], 105, 3.6, 1.0, 'M248 196 Q262 222 292 214 L296 240 L240 240 Z', 0.9)}
<path d="M271 141 Q281 135 292 140" style="fill:none;stroke-width:2"/>
<path d="M276 150 Q284 145 292 150 Q284 155 276 150 Z" style="stroke-width:1.6"/>
<circle cx="287" cy="149" r="2.6" style="fill:currentColor;stroke:none"/>
<path d="M298 152 Q305 162 310 170" style="fill:none;stroke-width:1.6"/>
<path d="${moustache}" style="fill:currentColor;stroke-width:1.2"/>
<path d="M290 205 Q296 207 301 203" style="fill:none;stroke-width:1.4"/>
<path d="M264 196 Q270 206 268 214" style="fill:none;stroke-width:1.2"/>
<path d="${crownBand}"/>
${hatch(crownBand, [196, 100, 280, 142], 45, 3, 1.1)}
<path d="${fleurons}" style="stroke-width:2.2"/>
<circle cx="218" cy="127" r="3.4" style="stroke-width:1.4"/><circle cx="238" cy="121" r="3.4" style="stroke-width:1.4"/><circle cx="258" cy="114" r="3.4" style="stroke-width:1.4"/>
<path d="${sleeve}"/>
${hatch(sleeve, [266, 264, 470, 450], 12, 6.5, 1.4)}
${hatch(sleeve, [266, 264, 470, 450], 12, 3.2, 1.4, sleeveShade)}
<path d="${sleeveFolds.map(smooth).join('')}" style="fill:none;stroke-width:2.2"/>
<path d="${cuff}"/>
<path d="${Array.from({ length: 14 }, (_, i) => `M${f(442 + (i % 2) * 8)} ${f(326 + i * 6)}l${f(10 + rnd() * 6)} ${f(rnd() * 3 - 1)}`).join('')}" style="fill:none;stroke-width:1.1"/>
<path d="${hand}"/>
${hatch(hand, [450, 328, 530, 396], 120, 4, 1.1, 'M450 362 L532 362 L532 400 L450 400 Z')}
<path d="M496 352 Q506 362 512 374 M486 356 Q494 368 498 378" style="fill:none;stroke-width:1.3"/>
</g>
</symbol>
<use href="#motif" width="${W}" height="${H}"/>
</svg>
`;
writeFileSync(out, svg);
console.log(`${out}: ${(svg.length / 1024).toFixed(0)} KB`);
