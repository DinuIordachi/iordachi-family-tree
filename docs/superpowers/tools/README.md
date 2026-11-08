# Engraved tree — artwork tools

The motif files in `client/public/motifs/` are generated. Edit the generator, then regenerate the file.

| Motif | Generator | Source |
|---|---|---|
| `stefan-cel-mare.svg` | `node gen-stefan.mjs <out>` | Pose, proportions and costume after the votive portrait of Ștefan cel Mare in the Humor Gospel (1473). Public domain (Wikimedia Commons: *Ștefan cel Mare – Evangheliarul de la Humor – Enciclopedia României 1938*). Redrawn as engraved line work. |
| `molda-hound.svg` | `python3 -I trace-etching.py <4.webp> <out> molda-trace.json` | Traced from Stefano della Bella (1610–1664), etching of two hounds. Public domain (Met Open Access). The seated hound is masked, traced and mirrored. |
| `eagle-cross.svg` | `node gen-eagle.mjs <out>` | Original heraldic drawing of the Moldovan arms: the eagle holds a cross, a sceptre and an olive branch. The shield is per fess gules and azure, with an aurochs head (lozenge ears), an eight-pointed star, a rose to dexter and a crescent to sinister. |
| Other motifs | `node gen-motifs.mjs <dir>` | Original line art. |

## Rules
- Every file's `<symbol id="motif">` puts its base paint on an inner `<g>`. Chrome drops a `style` set on an external `<symbol>`.
- Colours come only from `currentColor` and `var(--et-paper)`. Never use hex: clip ids must not look like hex either.
- Shading uses line hatching (`class="hatch"`) and stipple, not gradients.

`client/src/app/features/tree/components/public-motifs.spec.ts` enforces all three rules.
