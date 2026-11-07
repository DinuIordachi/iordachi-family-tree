# Engraved Family Tree — Design Spec

**Date:** 2026-11-07 · **Page:** `client` → `/tree` (public, no auth) · **Status:** approved direction, pending plan review

## 1. Problem

`/tree` renders family-chart's default dark card grid: flat rectangles, top-down, thin connector lines, one fade transition. It reads as a database diagram, not a family heirloom.

The target is a 17th–18th-century copperplate genealogical tree, like the *Arbor Tarnoviana* and *Arbor Porphyriana* engravings. It should have a living trunk, tapering organic branches, portrait medallions with ribbon banners, ink hatching on aged paper, and Moldovan heraldic and legendary motifs around the trunk and scattered through the crown.

## 2. Decisions (from user)

| Topic | Decision |
|---|---|
| Renderer | **Custom SVG renderer** on `/tree`. family-chart is removed from this page and from the project. |
| Direction | **Ancestors at the roots.** The founding generation sits at the trunk base and each younger generation is higher; the youngest are in the crown. |
| Motif art | **Original engraving-style SVG line art**, one file per motif, so each can later be swapped for sourced or commissioned art. |
| Theme | **Parchment** (light) and **candlelit** (dark) variants of one token set, following the app's `.app-dark` class on `<html>`. |

## 3. Composition (bottom → top)

1. **Ground band**, about 12% of the canvas height: a hatched earth line. The river Moldova runs across it as an engraved wave band, and the roots spread into it.
   - **Ștefan cel Mare** is seated to the **left** of the trunk, in a crowned, bearded, three-quarter pose, holding a sword or a model of a church, after the votive-portrait tradition.
   - **Molda**, the hound, lies to the **right** of the trunk, beside the river (the naming legend).
   - The **zimbru** (aurochs) head, with the star between its horns, rose and crescent, sits in a shield cartouche on the trunk.
2. **Trunk** with bark hatching. It rises from the ground to the founding household.
3. **Branches**: one tapered branch from each parent household to each child household. They are thick near the trunk and thin toward the crown.
4. **Medallions**: one for each person, with a **ribbon banner** below holding the name and years.
5. **Crown**: a stippled foliage mass behind the upper generations. The **eagle** from the coat of arms (cross in beak, sceptre, olive branch) stands at the apex. The user called it a "falcon"; the flag shows an eagle, so the motif is labelled *eagle*.
6. **Title cartouche** at the top center: "Arbor Gentis Iordachi", with "Iordachi Family Tree" as the subtitle.
7. **Scattered ornaments** in the crown, placed "from time to time" in empty space and never overlapping a medallion: grapevine cluster, a small falcon or bird perched on a branch, a star-rose-crescent roundel, an oak sprig, and an engraved church (Putna) vignette.

## 4. Layout rules

- A **household** is one person plus their spouses. Spouses sit side by side on the same branch tip, joined by a small ribbon knot.
- A child household hangs from the household that contains **both** of its parents. If only one parent is in the tree, it hangs from that parent's household.
- Each **generation** is a horizontal band. The vertical position is `y = groundY − (generation × generationSpacing)`, so generation 0 is closest to the ground.
- Siblings spread horizontally with a tidy-tree layout (`d3-hierarchy` `tree().nodeSize`), so households never overlap.
- **More than one founder household** (several roots): they sit side by side, joined by a virtual root, and share one trunk that forks just above the ground.
- **Members unreachable from any root** (data gaps, such as a spouse's parent stored without links): they appear in an "Alii" side cartouche list at the lower right. They must never be silently dropped.
- The layout is **deterministic**: the same data always gives the same picture. Branch wobble and ornament placement use a seeded PRNG keyed on member ids.

## 5. Design tokens

All tokens are CSS custom properties scoped to `.engraved-tree`. The candlelit set applies under `:root.app-dark .engraved-tree`.

### Color

| Token | Parchment | Candlelit | Use |
|---|---|---|---|
| `--et-paper` | `#efe3c6` | `#2a1f17` | page background |
| `--et-paper-shade` | `#d9c49a` | `#1c140e` | vignette edge, foliage fill |
| `--et-ink` | `#2b1d12` | `#ead9b0` | all line art and text |
| `--et-ink-soft` | `#5a4330` | `#b89f74` | hatching, secondary text |
| `--et-sepia` | `#8a5a2b` | `#c08a4c` | bark, banner shading |
| `--et-gilt` | `#b08a3e` | `#e0b862` | medallion rims, hover lineage, title |
| `--et-oxblood` | `#7a2e22` | `#c4614e` | deceased dagger, wax-seal accents |
| `--et-focus` | `#1f5f8b` | `#8cc4ec` | keyboard focus ring (accessibility; not period) |

Contrast requirement: `--et-ink` on `--et-paper` must be at least 7:1, and `--et-ink-soft` on `--et-paper` at least 4.5:1, in both themes.

### Typography

Fonts are self-hosted via `@fontsource` (OFL), with no runtime requests to Google.

| Token | Value | Use |
|---|---|---|
| `--et-font-display` | `"IM Fell English SC", serif` | title cartouche, "Alii" cartouche heading |
| `--et-font-name` | `"IM Fell English", serif` | names on banners |
| `--et-font-body` | `"Cormorant Garamond", serif` | years, detail panel |
| `--et-size-title` | `clamp(1.75rem, 3vw, 2.75rem)` | |
| `--et-size-name` | `15px` (SVG user units, scales with zoom) | |
| `--et-size-years` | `12px` | |

### Line weights (SVG user units)

| Token | Value | Use |
|---|---|---|
| `--et-stroke-hair` | `0.6` | hatching, stipple |
| `--et-stroke-fine` | `1` | ornaments, banner folds |
| `--et-stroke-main` | `1.6` | medallion rims, motif outlines |
| `--et-stroke-bold` | `2.4` | trunk silhouette |

### Geometry and motion

| Token | Value |
|---|---|
| Medallion | oval `rx 34 × ry 42`, with a laurel ring 6 units outside it |
| Banner | width `max(120, textWidth + 28)`, height 22, with swallow-tail ends |
| `generationSpacing` | 190 |
| `householdGap` (horizontal node size) | 170 per person |
| Branch width | starts at `max(6, 28 − 4·generation)`, ends at `max(2, start × 0.35)` |
| `--et-dur-grow` | 1600ms total. Trunk 0–400ms, then one 300ms stagger per generation |
| `--et-ease` | `cubic-bezier(.2,.7,.2,1)` |

Under `prefers-reduced-motion: reduce`, every animation is skipped and the final state renders immediately.

## 6. Components

### Medallion (`[etMedallion]`, an SVG `<g>`)

| State | Visual | Behaviour |
|---|---|---|
| Default | Ink oval frame and laurel ring. Shows the member's thumbnail clipped to the oval with a sepia filter, or an engraved silhouette for the member's gender (M, F, or unknown) when there is no thumbnail. | — |
| Hover / focus | Gilt rim. The lineage path down to the trunk is redrawn in gilt. | `--et-focus` ring on keyboard focus |
| Deceased | Cross-hatched darker rim and an oxblood **†** at the top right. Banner text in italics. | — |
| Selected | Gilt rim stays on while the detail panel is open. | — |

Accessibility: `role="button"`, `tabindex="0"`, and an `aria-label` such as "Ion Iordachi, born 1955". The label adds ", died 1998" when the member has died. Enter or Space opens the detail panel.

### Ribbon banner (`[etBanner]`)
- **Line 1:** the full name.
- **Line 2:** the years, as `1925 – 1998`, or `1955 –` while living.

The last name is never shown on its own: a lone first name is fine, a lone last name is not.

### Detail panel
This is a PrimeNG `Drawer` on the right, restyled as a parchment leaf. It shows the portrait, name, years, biography, and a media gallery (the `media` URLs). Esc closes it and focus returns to the medallion that opened it.

### Motif (`[etMotif]`)
Each motif renders one SVG `<symbol>` from the motif catalogue by id.

| id | Placement |
|---|---|
| `stefan-cel-mare` | fixed, ground left |
| `molda-hound` | fixed, ground right |
| `aurochs-shield` | fixed, on the trunk |
| `eagle-cross` | fixed, crown apex |
| `river-moldova` | fixed, ground band |
| `grapevine` | scattered |
| `perched-falcon` | scattered |
| `star-rose-crescent` | scattered |
| `oak-sprig` | scattered |
| `putna-church` | scattered |

Scatter rule: at most one scattered ornament for every 4 medallions, with a minimum of 2 and a maximum of 8. Each ornament keeps at least 90 units from any medallion center and any other ornament. Ornaments sit near branch midpoints. If a slot can't be found, the ornament is skipped and nothing overlaps.

### Paper and engraving defs
These are SVG filters and patterns:
- `paper-grain` (`feTurbulence` grain)
- `ink-bleed` (a slight displacement on lines)
- hatching patterns at 45°, at −45°, and crossed
- a stipple pattern for the foliage

## 7. Interaction
- Pan and zoom with `d3-zoom` (scale 0.25–2.5). The tree fits the viewport on load.
- **Reset view** and **zoom ±** controls are styled as small brass engraved buttons.
- Clicking a medallion opens the detail panel.
- No editing on this page; the back-office remains the editor.

## 8. States
- **Loading:** an engraved quill-and-inkwell spinner with "Se încarcă arborele…" and "Loading tree…".
- **Error:** a torn-paper notice with the error text and a **Retry** button.
- **Empty:** the trunk and ground motifs still render, plus a cartouche reading "No family members yet".

## 9. Out of scope
Editing on `/tree`, printing or PDF export, i18n beyond the two loading strings, and changes to the back-office pages.
