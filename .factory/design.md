# Stroke Lab visual thesis

## Direction: brutalist concrete and moss

Stroke Lab should feel like a calibration bench built into a damp concrete studio: blunt slabs, survey markings, and a single living moss accent. The visual language makes timing evidence feel tangible without pretending the tool is another drawing app. Raw input is an electric chalk line; processed input is moss. Hairline grid marks and specimen labels turn the canvas into an instrument.

The treatment is deliberately single-mode. A warm, light concrete field keeps traces legible and evokes a physical test wall; a dark theme would compromise the product metaphor and add visual interpretation risk to trace colors.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Concrete 0 | `#f1efe7` | page background |
| Concrete 1 | `#dedbd0` | raised instrument surfaces |
| Concrete 2 | `#b9b7ae` | rules and disabled controls |
| Rebar | `#20231f` | primary text and hard outlines |
| Dust | `#575c55` | secondary text (7:1 on Concrete 0) |
| Moss | `#47651e` | primary actions and smoothed traces |
| Moss dark | `#263c0d` | active state and accessible accent text |
| Survey orange | `#b74318` | raw traces and warnings |
| Hazard | `#8d241d` | errors |
| Clear | `#315c3a` | success |

Color never carries diagnosis by itself: raw/smoothed traces use different dash/width treatments and all verdicts have text labels.

## Typography

- Display and labels: `Arial Black`, `Arial Narrow`, system sans-serif. Compressed, uppercase specimen labels belong on a workshop instrument.
- Body and numbers: `ui-monospace`, `SFMono-Regular`, `Cascadia Mono`, `Consolas`, monospace. Tabular rhythm makes millisecond values comparable.
- No font files are loaded, eliminating a render dependency and keeping the package/site small. Body copy is at least 16px with 1.55 leading.

Scale: 14px micro labels, 16px body, 20px subhead, 32px section display, clamp(42px, 8vw, 92px) hero display.

## Layout and spacing

An 8px base unit with 4px for optical adjustment. Common gaps: 8, 16, 24, 32, 48, 72px. Content maxes at 1440px; reading copy maxes at 70ch. Thick 2px outlines and offset shadows make control blocks feel bolted on, but grouping is primarily by space. On phones, the instrument toolbar and result grid become one column; secondary explanatory panels follow the live pad.

## Interaction grammar

- Primary actions are dark moss slabs with an offset rebar shadow; press moves the slab 2px toward its shadow.
- Toggles and ranges are explicit native controls with 44px minimum targets and persistent labels.
- The pad cursor is a crosshair. Space/Enter on the focused pad starts a short deterministic keyboard trace; arrows move the trace origin before capture.
- Diagnostics arrive as stamped findings: `INPUT`, `SMOOTHING`, `RENDER`, or `HISTORY`, each with the measured reason and next action.
- Raw points are orange angular marks; smoothed points are continuous moss strokes; both remain distinguishable in monochrome.

## Motion policy

UI transitions last 160ms and affect only transform/opacity. Result rows appear as one group, never staggered. The hero illustration is static. With `prefers-reduced-motion: reduce`, smooth scrolling and transitions are disabled and all state changes are instant. Nothing loops, flashes, or moves merely for ambience.

## Original asset plan and provenance

The hero uses one generated editorial still: a top-down concrete calibration slab with moss occupying the gap between an orange sampled line and a dark green continuous line. It explains the product's raw-versus-smoothed comparison and leaves negative space for the page title. No words, interface chrome, logos, or people.

- Files: `site/public/stroke-slab.webp` plus 720px and 480px responsive WebP derivatives
- Generator: factory `factory-image` deployment via `/opt/fleet/lib/gen-image.sh`
- Prompt: “Top-down editorial still life for a web diagnostic tool: a rough pale concrete calibration slab, one angular vermilion grease-pencil stroke made of separated sample dots, beside one continuous dark moss-green ink stroke, a small patch of real moss growing precisely in the gap between them, subtle engraved timing tick marks and a steel stylus nib, brutalist materials, overcast workshop light, restrained off-white/charcoal/moss/orange palette, wide landscape composition with generous empty concrete on the left for headline overlay, tactile realistic texture, no people, no hands, no letters, no numbers, no logos, no UI, no gradients, no watermark.”
- License: original project asset generated for Stroke Lab; distributed under the repository MIT license.

Icons are hand-authored CSS/inline SVG geometric marks only where a textual label is also present. The live traces and small diagnostic diagrams are deterministic canvas/CSS output from local measurements, not stock imagery.
