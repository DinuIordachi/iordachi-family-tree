// Composes the smaller engraved motif SVGs. Usage: node gen-motifs.mjs <outDir>
// Ștefan (gen-stefan.mjs), Molda (trace-etching.py + molda-trace.json) and the eagle (gen-eagle.mjs) have their own generators.
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2];
mkdirSync(out, { recursive: true });

const f = (n) => (Math.round(n * 10) / 10).toString();
const BASE =
  'fill:var(--et-paper, white);stroke:currentColor;stroke-width:var(--et-stroke-main, 1.6);stroke-linejoin:round;stroke-linecap:round';
const INK = 'style="fill:currentColor;stroke:none"';
const FINE = 'style="fill:none;stroke-width:var(--et-stroke-fine, 1)"';
const BOLD = 'style="stroke-width:var(--et-stroke-bold, 2.4)"';
const NOFILL = 'style="fill:none"';

let clipSeq = 0;
/** Parallel hatching lines at `angle`, covering bbox, clipped to `shapeD`. */
function hatch(shapeD, [x0, y0, x1, y1], angle, sp = 3, extra = '') {
  const id = `h${++clipSeq}`;
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 1;
  let d = '';
  for (let o = -R; o <= R; o += sp) {
    const px = cx - dy * o;
    const py = cy + dx * o;
    d += `M${f(px - dx * R)} ${f(py - dy * R)}L${f(px + dx * R)} ${f(py + dy * R)}`;
  }
  return `<clipPath id="${id}"><path d="${shapeD}"${extra}/></clipPath><path class="hatch" clip-path="url(#${id})" style="fill:none;stroke-width:var(--et-stroke-hair, 0.6)" d="${d}"/>`;
}

function star(cx, cy, R, r, points = 8) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    d += `${i === 0 ? 'M' : 'L'}${f(cx + rad * Math.cos(a))} ${f(cy + rad * Math.sin(a))}`;
  }
  return d + 'Z';
}

function rose(cx, cy, s = 1) {
  let g = '';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    g += `<circle cx="${f(cx + 3.6 * s * Math.cos(a))}" cy="${f(cy + 3.6 * s * Math.sin(a))}" r="${f(3 * s)}"/>`;
  }
  return g + `<circle cx="${cx}" cy="${cy}" r="${f(2 * s)}"/><circle cx="${cx}" cy="${cy}" r="${f(0.8 * s)}" ${INK}/>`;
}

const crescent = (cx, cy, r) =>
  `M${f(cx + r * 0.2)} ${f(cy - r)} A${r} ${r} 0 1 0 ${f(cx + r * 0.2)} ${f(cy + r)} A${f(r * 0.8)} ${f(r * 0.8)} 0 1 1 ${f(cx + r * 0.2)} ${f(cy - r)}Z`;

function file(name, w, h, body, symbolAttrs = '') {
  clipSeq = 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">
<!-- Engraved motif: ${name}. Original line art for the Iordachi family tree. Strokes use currentColor; fills use the et-paper theme token. -->
<symbol id="motif" viewBox="0 0 ${w} ${h}"${symbolAttrs}>
<g style="${BASE}">
${body.trim()}
</g>
</symbol>
<use href="#motif" width="${w}" height="${h}"/>
</svg>
`;
  writeFileSync(`${out}/${name}.svg`, svg);
}

/* ───────────── Aurochs (zimbru) head in a heraldic shield, star, rose, crescent ───────────── */
{
  const shield = 'M10 10 L100 10 L100 60 Q100 105 55 125 Q10 105 10 60 Z';
  const head = 'M40 52 Q37 70 46 88 Q50 98 55 100 Q60 98 64 88 Q73 70 70 52 Q62 46 55 47 Q48 46 40 52 Z';
  file(
    'aurochs-shield',
    110,
    130,
    `
<path d="${shield}" ${BOLD}/>
${hatch(shield, [10, 10, 100, 125], 90, 3.2)}
<path d="${star(55, 28, 8.5, 3.6)}"/>
<path d="M41 54 Q25 50 23 33 Q30 43 43 46 Z M69 54 Q85 50 87 33 Q80 43 67 46 Z"/>
<path d="M40 57 L33 53 L27 57 L33 61 Z M70 57 L77 53 L83 57 L77 61 Z"/>
<path d="${head}"/>
<path d="M49 51 q6 6 12 0" ${FINE}/>
<circle cx="48" cy="65" r="1.6" ${INK}/><circle cx="62" cy="65" r="1.6" ${INK}/>
<path d="M52 72 L50 84 M58 72 L60 84" ${FINE}/>
<ellipse cx="55" cy="91" rx="8" ry="6"/>
<circle cx="52" cy="91" r="1.3" ${INK}/><circle cx="58" cy="91" r="1.3" ${INK}/>
${rose(24, 76, 1)}
<path d="${crescent(88, 76, 8)}"/>
`,
  );
}

/* ───────────── River Moldova — tileable engraved waves (600 wide, period 60) ───────────── */
{
  let rows = '';
  [14, 22, 30, 38, 46].forEach((y, row) => {
    const phase = (row % 2) * 30;
    let d = `M0 ${y}`;
    for (let x = 0; x < 600; x += 60) {
      d += ` Q${x + 15 + phase / 2} ${y - 3} ${x + 30} ${y} T${x + 60} ${y}`;
    }
    rows += `<path class="hatch" d="${d}" style="fill:none;stroke-width:${row % 2 ? 'var(--et-stroke-hair, 0.6)' : 'var(--et-stroke-fine, 1)'}"/>`;
  });
  file(
    'river-moldova',
    600,
    60,
    `
<path d="M0 6 L600 6" ${FINE}/>
${rows}
<path d="M0 54 L600 54" ${FINE}/>
`,
    ' preserveAspectRatio="none"',
  );
}

/* ───────────── Grapevine ───────────── */
{
  const leaf = 'M44 26 Q50 12 58 16 Q66 8 70 18 Q78 20 74 30 Q78 40 68 40 Q62 46 56 38 Q48 40 44 26 Z';
  const grapes = [
    [33, 40], [42, 40], [28, 48], [37, 48], [46, 48], [32, 56], [41, 56], [36, 64],
  ];
  file(
    'grapevine',
    80,
    80,
    `
<path d="M8 8 Q28 18 40 32" ${FINE}/>
<path d="M28 18 q6 -7 11 -1 q2 6 -4 6 q-3 -1 -2 -3" ${FINE}/>
<path d="${leaf}"/>${hatch(leaf, [44, 8, 78, 46], 45, 2.4)}
<path d="M46 28 L68 22 M52 30 L62 38 M50 26 L57 15" ${FINE}/>
${grapes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6"/><path d="M${x - 3} ${y + 1.5} A3.2 3.2 0 0 0 ${x + 1.5} ${y + 3}" ${FINE}/>`).join('')}
`,
  );
}

/* ───────────── Perched falcon ───────────── */
{
  const body = 'M30 40 Q28 28 36 22 Q44 18 48 26 Q56 34 58 52 L66 70 L56 62 Q42 64 34 56 Q30 50 30 40 Z';
  const wing = 'M42 32 Q56 40 58 56 Q48 50 40 44 Z';
  file(
    'perched-falcon',
    80,
    80,
    `
<path d="M4 66 Q40 60 76 64" ${BOLD}/>
<path d="M60 63 Q66 56 72 56" ${FINE}/>
<path d="${body}"/>
<path d="M36 23 Q31 16 25 20 L21 23 L26 23 Q24 26 28 25"/>
<circle cx="31.5" cy="21.5" r="1.3" ${INK}/>
<path d="M30 25 Q32 30 36 30" ${FINE}/>
<path d="${wing}"/>${hatch(wing, [40, 32, 58, 56], 30, 2)}
<path d="M34 40 l2 2 l2 -2 M34 47 l2 2 l2 -2 M39 52 l2 2 l2 -2" ${FINE}/>
<path d="M40 60 l-2 4 M40 60 l2 4 M47 61 l-2 4 M47 61 l2 4" ${FINE}/>
`,
  );
}

/* ───────────── Star, rose and crescent roundel ───────────── */
{
  const field = 'M40 10 A30 30 0 1 1 39.9 10 Z';
  file(
    'star-rose-crescent',
    80,
    80,
    `
<circle cx="40" cy="40" r="35"/>
<path d="${field}"/>${hatch(field, [10, 10, 70, 70], 0, 2.8)}
<circle cx="40" cy="40" r="30" style="fill:none"/>
<path d="${star(40, 23, 8.5, 3.6)}"/>
${rose(25, 49, 1)}
<path d="${crescent(57, 49, 8)}"/>
`,
  );
}

/* ───────────── Oak sprig with acorns ───────────── */
{
  const leaf1 = 'M30 52 Q20 50 18 42 Q24 42 22 36 Q28 38 28 30 Q34 34 36 28 Q40 36 38 44 Q36 50 30 52 Z';
  const leaf2 = 'M50 30 Q56 22 64 24 Q62 30 68 32 Q62 36 66 42 Q58 42 56 48 Q50 42 50 30 Z';
  const cup = (x, y) => `M${x - 4.5} ${y} Q${x} ${y - 5} ${x + 4.5} ${y} L${x + 4} ${y + 2.5} L${x - 4} ${y + 2.5} Z`;
  file(
    'oak-sprig',
    80,
    80,
    `
<path d="M10 72 Q36 50 68 12" ${FINE}/>
<path d="${leaf1}"/>${hatch(leaf1, [18, 28, 40, 52], 40, 2.4)}
<path d="M31 50 L33 32" ${FINE}/>
<path d="${leaf2}"/>${hatch(leaf2, [50, 22, 68, 48], 140, 2.4)}
<path d="M52 44 L62 28" ${FINE}/>
<path d="M44 51 L44 54 M52 47 L53 50" ${FINE}/>
<ellipse cx="44" cy="61" rx="4" ry="5.2"/><path d="${cup(44, 56)}"/>${hatch(cup(44, 56), [39, 51, 49, 59], 45, 1.4)}
<ellipse cx="53" cy="57" rx="4" ry="5.2"/><path d="${cup(53, 52)}"/>${hatch(cup(53, 52), [48, 47, 58, 55], 135, 1.4)}
`,
  );
}

/* ───────────── Putna monastery church ───────────── */
{
  const roof = 'M6 52 L20 34 L62 34 L76 52 Z';
  const towerRoof = 'M32 22 L40 12 L48 22 Z';
  file(
    'putna-church',
    80,
    80,
    `
<path d="M12 72 L12 50 L68 50 L68 72 Z"/>
<path d="M68 54 Q76 58 76 64 L76 72 L68 72" ${NOFILL}/>
<path d="M12 56 L68 56" ${FINE}/>
<path d="M22 67 L22 60 Q24 57 26 60 L26 67 Z M31 67 L31 60 Q33 57 35 60 L35 67 Z M56 67 L56 60 Q58 57 60 60 L60 67 Z" ${FINE}/>
<path d="M42 72 L42 63 Q45 59 48 63 L48 72" ${FINE}/>
<path d="${roof}"/>${hatch(roof, [6, 34, 76, 52], 75, 2)}
<path d="M34 34 L34 22 L46 22 L46 34 Z"/>
<path d="M37 31 L37 26 M43 31 L43 26" ${FINE}/>
<path d="${towerRoof}"/>${hatch(towerRoof, [32, 12, 48, 22], 105, 1.8)}
<path d="M40 12 L40 3 M37 6 L43 6 M38 9.5 L42 8.5" ${FINE}/>
<path d="M4 72 L76 72" ${FINE}/>
`,
  );
}

/* ───────────── Portrait silhouettes (68 × 84), clipped to the medallion oval ───────────── */
function silhouette(name, extras, headD) {
  const oval = 'M34 0 A34 42 0 1 1 33.9 0 Z';
  const shoulders = 'M6 84 Q8 58 34 54 Q60 58 62 84 Z';
  const bust = `${headD} ${shoulders}`;
  file(
    name,
    68,
    84,
    `
<clipPath id="oval"><path d="${oval}"/></clipPath>
<g clip-path="url(#oval)">
<path d="M28 46 L28 56 L40 56 L40 46" />
<path d="${shoulders}"/>
${hatch(bust, [6, 14, 62, 84], 45, 2.6)}
<path d="${headD}"/>
${extras}
</g>
`,
  );
}

silhouette(
  'silhouette-m',
  `<path d="M24 26 Q26 16 34 16 Q42 16 44 26 Q40 22 34 22 Q28 22 24 26 Z" ${INK}/>
<path d="M28 58 L34 68 L40 58" ${FINE}/>
<path d="M30 41 Q34 39 38 41" ${FINE}/>`,
  'M34 18 A11 13 0 1 1 33.9 18 Z',
);

silhouette(
  'silhouette-f',
  `<path d="M20 34 Q20 14 34 14 Q48 14 48 34 Q50 46 44 52 L40 48 Q46 40 44 30 Q40 22 34 22 Q28 22 24 30 Q22 40 28 48 L24 52 Q18 46 20 34 Z"/>
<path d="M24 60 L26 62 L28 60 M32 62 L34 64 L36 62 M40 60 L42 62 L44 60" ${FINE}/>`,
  'M34 18 A11 13 0 1 1 33.9 18 Z',
);

silhouette('silhouette-u', `<path d="M30 59 Q34 62 38 59" ${FINE}/>`, 'M34 18 A11 13 0 1 1 33.9 18 Z');

console.log('motifs written to', out);
