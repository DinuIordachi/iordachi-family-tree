// Composes the engraved motif SVGs. Usage: node gen-motifs.mjs <outDir>
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

function star(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
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
<symbol id="motif" viewBox="0 0 ${w} ${h}"${symbolAttrs} style="${BASE}">
${body.trim()}
</symbol>
<use href="#motif" width="${w}" height="${h}"/>
</svg>
`;
  writeFileSync(`${out}/${name}.svg`, svg);
}

/* ───────────── Ștefan cel Mare — seated, crowned, holding Putna church ───────────── */
{
  const throne = 'M40 72 L40 202 L140 202 L140 72 Q90 54 40 72 Z';
  const mantle = 'M58 100 Q40 142 28 206 L152 206 Q142 142 122 100 Z';
  const robe = 'M72 102 Q66 150 62 206 L120 206 Q116 150 110 102 Z';
  const roof = 'M43 126 L61 106 L79 126 Z';
  const hair = 'M78 58 Q70 84 74 104 Q80 100 82 86 Q80 70 82 58 Z M106 58 Q114 84 108 104 Q102 100 101 86 Q104 70 102 58 Z';
  file(
    'stefan-cel-mare',
    180,
    220,
    `
<path d="${throne}"/>
${hatch(throne, [40, 54, 140, 202], 82, 2.6)}
<circle cx="40" cy="70" r="4.5"/><circle cx="140" cy="70" r="4.5"/>
<circle cx="92" cy="60" r="25" ${FINE}/><circle cx="92" cy="60" r="21.5" style="fill:var(--et-paper, white);stroke-width:var(--et-stroke-hair, 0.6);stroke-dasharray:1.2 2.2"/>
<path d="${mantle}"/>
${hatch(mantle, [28, 100, 152, 206], 100, 3.4)}
<path d="M58 100 Q48 150 44 204 M122 100 Q134 150 138 204" ${FINE}/>
<path d="${robe}"/>
<path d="M82 122 Q80 160 78 204 M92 120 Q93 160 94 204 M103 122 Q106 160 108 204" ${FINE}/>
<path d="M62 176 Q92 168 122 177" ${FINE}/>
<path d="M68 152 Q91 158 114 152" ${BOLD}/>
<path d="M68 102 Q91 114 114 102 Q112 93 91 97 Q70 93 68 102 Z"/>
<circle cx="76" cy="102" r="1" ${INK}/><circle cx="86" cy="106" r="1" ${INK}/><circle cx="97" cy="106" r="1" ${INK}/><circle cx="107" cy="102" r="1" ${INK}/>
<path d="M72 206 q6 -7 14 0 M98 206 q6 -7 14 0" ${FINE}/>
<path d="M86 84 L86 96 L98 96 L98 84" />
<ellipse cx="92" cy="68" rx="13" ry="16"/>
<path d="${hair}"/>
${hatch(hair, [70, 58, 114, 104], 75, 2.2)}
<path d="M86 64 q2 -1.6 4 0 M95 64 q2 -1.6 4 0" ${FINE}/>
<circle cx="88" cy="65.5" r="0.9" ${INK}/><circle cx="97" cy="65.5" r="0.9" ${INK}/>
<path d="M92 66 L90 74 L93 75" ${FINE}/>
<path d="M83 79 Q88 75.5 92 77.5 Q96 75.5 101 79 Q97 81.5 92 79.5 Q87 81.5 83 79 Z" ${INK}/>
<path d="M88 83.5 Q92 85 96 83.5" ${FINE}/>
<path d="M77 54 L107 54 L107 47 L77 47 Z"/>
${hatch('M77 54 L107 54 L107 47 L77 47 Z', [77, 47, 107, 54], 45, 2)}
<path d="M77 47 L80 36 L84 47 M88 47 L92 31 L96 47 M100 47 L104 36 L107 47"/>
<circle cx="80" cy="34.5" r="1.8"/><circle cx="92" cy="29.5" r="1.8"/><circle cx="104" cy="34.5" r="1.8"/>
<path d="M72 104 Q52 114 46 140 L55 142 Q60 124 78 116 Z"/>
<path d="M110 104 Q102 130 80 140 L76 133 Q92 124 101 104 Z"/>
<path d="M46 142 L46 126 L78 126 L78 142 Z"/>
<path d="${roof}"/>
${hatch(roof, [43, 106, 79, 126], 60, 2)}
<path d="M58 106 L58 97 L66 97 L66 106"/>
<path d="M62 97 Q57 94 62 90 Q67 94 62 97 Z"/>
<path d="M62 90 L62 84 M59.5 86.5 L64.5 86.5" ${FINE}/>
<path d="M58.5 142 L58.5 134 Q62 130 65.5 134 L65.5 142" ${FINE}/>
<path d="M50 131 L50 137 M73 131 L73 137" ${FINE}/>
<ellipse cx="45" cy="142" rx="4" ry="3.2"/><ellipse cx="79" cy="142" rx="4" ry="3.2"/>
<path d="M0 210 L180 210" ${FINE}/>
${hatch('M0 210 L180 210 L180 220 L0 220 Z', [0, 210, 180, 220], 160, 3)}
`,
  );
}

/* ───────────── Molda — lean hunting hound lying, head raised (faces right) ───────────── */
{
  const body = 'M44 84 Q48 66 74 64 Q94 67 110 62 Q132 55 148 62 Q158 72 152 92 Q120 97 70 95 Q48 95 44 84 Z';
  const neck = 'M136 66 Q142 46 154 34 Q164 34 172 42 Q162 58 158 90 Z';
  const head = 'M148 38 Q152 22 168 20 Q181 20 189 30 L198 38 Q198 45 189 46 L172 48 Q156 50 148 38 Z';
  const ear = 'M160 26 Q148 36 152 60 Q161 56 168 32 Z';
  file(
    'molda-hound',
    200,
    110,
    `
<path d="M46 82 Q22 80 12 62 Q9 55 15 57 Q22 72 46 76" ${FINE}/>
<path d="${neck}"/>
${hatch(neck, [136, 34, 172, 90], 60, 4)}
<path d="${body}"/>
${hatch('M48 88 Q90 96 152 90 L152 97 L44 97 Z M110 64 Q132 56 148 62 Q156 70 154 80 Q140 70 112 70 Z', [44, 55, 158, 97], 25, 3)}
<path d="M62 70 Q50 78 52 92" ${FINE}/>
<path d="M66 69 q4 -2 8 0 M84 66 q4 -2 8 0 M100 64 q4 -2 8 0 M118 60 q4 -2 8 0" ${FINE}/>
<path d="M52 88 Q46 99 64 100 L88 100 Q74 94 68 86"/>
<path d="M132 86 L177 93 Q184 95 179 99 L130 97 Z"/>
<path d="M128 92 L171 101 Q178 103 173 107 L126 104 Z"/>
<path d="M177 93 l3 3 M174 101 l3 3" ${FINE}/>
<path d="${head}"/>
${hatch('M150 40 Q160 48 172 48 L174 44 Q160 44 152 36 Z', [148, 36, 175, 49], 70, 1.8)}
<path d="${ear}"/>
${hatch(ear, [148, 26, 168, 60], 80, 1.8)}
<circle cx="172" cy="30" r="1.6" ${INK}/>
<path d="M168 27 q4 -2 7 0" ${FINE}/>
<circle cx="197" cy="38.5" r="2" ${INK}/>
<path d="M180 45 Q188 44 193 41" ${FINE}/>
<path d="M145 50 Q155 60 165 52" ${BOLD}/>
<circle cx="155" cy="57" r="2.2"/>
<path d="M0 108 L200 108" ${FINE}/>
<path d="M10 108 l2 -4 M30 108 l-1 -5 M110 108 l2 -4 M190 108 l-2 -4" ${FINE}/>
`,
  );
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
<path d="M40 58 Q30 63 27 58 Q32 53 41 55 Z M70 58 Q80 63 83 58 Q78 53 69 55 Z"/>
<path d="${head}"/>
<path d="M49 51 q6 6 12 0" ${FINE}/>
<circle cx="48" cy="65" r="1.6" ${INK}/><circle cx="62" cy="65" r="1.6" ${INK}/>
<path d="M52 72 L50 84 M58 72 L60 84" ${FINE}/>
<ellipse cx="55" cy="91" rx="8" ry="6"/>
<circle cx="52" cy="91" r="1.3" ${INK}/><circle cx="58" cy="91" r="1.3" ${INK}/>
${rose(86, 76, 1)}
<path d="${crescent(23, 76, 8)}"/>
`,
  );
}

/* ───────────── Eagle with Orthodox cross, sceptre and olive branch ───────────── */
{
  const wingUp = 'M98 72 C70 66 40 50 22 14 C32 22 40 24 46 22 C42 30 48 36 54 36 C50 44 56 50 62 50 C58 58 64 64 72 64 C66 74 78 82 98 88 Z';
  const wingDown = 'M98 92 C80 100 50 104 28 132 C40 126 48 126 54 128 C50 136 54 142 60 142 C60 132 70 128 76 128 C76 136 82 140 86 140 C86 126 92 112 100 108 Z';
  const mirror = 'transform="matrix(-1 0 0 1 220 0)"';
  const body = 'M98 70 Q92 100 96 130 Q104 150 110 152 Q116 150 124 130 Q128 100 122 70 Q110 62 98 70 Z';
  const tail = 'M100 146 L92 176 L102 170 L110 182 L118 170 L128 176 L120 146 Z';
  const head = 'M106 74 Q99 62 100 54 Q101 42 92 38 Q84 35 78 40 Q73 41 70 46 Q69 52 74 51 Q74 48 78 48 Q82 50 86 50 Q92 56 96 74 Z';
  const breast = 'M100 92 L120 92 L120 108 Q120 120 110 124 Q100 120 100 108 Z';
  let leaves = '';
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = 128 + 36 * t;
    const y = 160 + 26 * t * t;
    leaves += `<ellipse cx="${f(x + (i % 2 ? 4 : -2))}" cy="${f(y + (i % 2 ? -4 : 4))}" rx="2.4" ry="5" transform="rotate(${i % 2 ? 40 : -50} ${f(x + (i % 2 ? 4 : -2))} ${f(y + (i % 2 ? -4 : 4))})"/>`;
  }
  file(
    'eagle-cross',
    220,
    200,
    `
<path d="${wingUp}"/>${hatch(wingUp, [22, 14, 98, 88], 55, 3.2)}
<path d="${wingDown}"/>${hatch(wingDown, [28, 92, 100, 142], 120, 3.2)}
<g ${mirror}><path d="${wingUp}"/><path d="${wingDown}"/></g>
<g ${mirror}>${hatch(wingUp, [22, 14, 98, 88], 55, 3.2)}${hatch(wingDown, [28, 92, 100, 142], 120, 3.2)}</g>
<path d="M40 44 Q60 60 84 70 M58 30 Q70 50 90 62 M44 112 Q66 106 92 100" ${FINE}/>
<g ${mirror}><path d="M40 44 Q60 60 84 70 M58 30 Q70 50 90 62 M44 112 Q66 106 92 100" ${FINE}/></g>
<path d="${tail}"/>${hatch(tail, [92, 146, 128, 182], 90, 2.4)}
<path d="M64 184 L84 150" ${BOLD}/><circle cx="86" cy="147" r="3.8"/>
<path d="M104 140 L90 156 M88 154 l-4 4 M90 156 l-2 6 M92 156 l3 5" ${FINE}/>
<path d="M128 160 Q148 170 164 186" ${FINE}/>${leaves}
<path d="M116 140 L130 158 M128 156 l-3 5 M130 158 l1 6 M132 157 l4 4" ${FINE}/>
<path d="${body}"/>${hatch(body, [92, 62, 128, 152], 30, 3)}
<path d="${breast}"/>${hatch(breast, [100, 92, 120, 124], 90, 2.2)}
<path d="M103 99 Q102 94 106 96 M117 99 Q118 94 114 96" ${FINE}/>
<ellipse cx="110" cy="104" rx="5" ry="6.5"/>
<path d="${head}"/>
${hatch('M106 74 Q99 62 100 54 Q98 58 92 56 Q94 64 96 74 Z', [92, 54, 106, 74], 100, 2)}
<path d="M78 41 Q80 45 78 48" ${FINE}/>
<path d="M83 40 Q87 38.5 91 41" ${FINE}/>
<circle cx="86.5" cy="43" r="1.6" ${INK}/>
<path d="M66 22 L66 64 M58 34 L74 34" ${BOLD}/>
<path d="M61 56 L71 51" ${FINE}/>
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
<path d="${crescent(25, 49, 8)}"/>
${rose(55, 49, 1)}
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
