# Design System

Source: the user's three reference images in `design/reference/`. We keep their visual language and drop their marketing patterns (logo walls, "Trusted by" badges, CTA repetition, giant hero).

## What we take from the references
| Reference element | How we use it |
|---|---|
| Dark pixel-grid band with blue cells (01) | **Pixel progress grid**: a slim (~120px) band at the top of the dashboard and each track page. Each cell is a lesson. Filled blue means complete, outlined blue means in progress, and dim means not started. Hovering or focusing a cell shows the lesson title, and Enter opens it. This makes the decoration functional |
| Monospace bracket labels `[N.01/11] —— > KEY VALUE` (01, 02) | **Section labels** on every lesson section: `[03/12] —— > INTUITION`. Track codes `T.01` to `T.04`, lesson numbers `// 001` on cards |
| Inline `<HOME>` style nav chips in mono caps (01) | Top nav: mono uppercase chips, with the active chip filled in the accent color |
| Big grotesk headline with `/` slashes and a bracketed accent word (01, 02) | Lesson and track titles: large sans with a leading `/` in muted gray. Accent color is reserved for the single key term |
| Thin-bordered cards in a 3-up grid (02) | Chapter and lesson cards, 1px border, no shadow, no radius (or 2px) |
| Black rectangular buttons with a square bullet `■ GET STARTED` (01, 02) | Primary button: solid ink, mono caps, small square glyph. Secondary: outlined |
| Dotted background (01, 02) | Page background outside the content column, and the canvas behind visualizations |
| Stat grid `<1.8s / 2-4x` (02) | Track progress stats and inference measurement readouts (only real or computed values) |
| Bar chart with a draggable split handle (02) | Pattern for before/after comparison visualizations (for example FP32 vs INT8, batch sizes) |
| Rounded node boxes, thin blue connectors, square and round junctions, arrowheads (03) | **Flow diagram primitive** for ETL pipelines, RAG flow, agent tool calls, inference pipelines and NN graphs. Nodes can show a `?` or status badge |

## Tokens (`src/styles/tokens.css`)
```css
:root, [data-theme="light"] {
  --bg: #ffffff;          --bg-page: #f4f4f2;     --surface: #ffffff;  --surface-2: #f7f7f5;
  --ink: #0e0e10;         --ink-2: #4a4a50;       --ink-3: #8a8a90;    /* ink-3: labels only, large/mono */
  --line: #e4e4e1;        --line-strong: #c9c9c4; --dot: #d6d6d1;
  --accent: #1d4aff;      --accent-ink: #ffffff;  --accent-soft: #e8edff;
  --band: #f7f7f5;        --band-cell: #ffffff;   --band-line: #d6d6d1;  --band-grid: #ececea;
  --ok: #0f7b4a;          --warn: #9a5b00;        --err: #c0262d;
}
[data-theme="dark"] {
  --bg: #0b0c0f;          --bg-page: #08090b;     --surface: #111317;  --surface-2: #171a1f;
  --ink: #ececee;         --ink-2: #a9abb2;       --ink-3: #74767e;
  --line: #23262d;        --line-strong: #353943; --dot: #1d2026;
  --accent: #5b7fff;      --accent-ink: #0b0c0f;  --accent-soft: #151d3a;
  --band: #050608;        --band-cell: #0f1117;   --band-line: #1b1e27;  --band-grid: #1b1e27;
  --ok: #3ccf8e;          --warn: #f0b048;        --err: #ff6b70;
}
```
- **Type**: Geist Sans for UI and prose, Geist Mono for labels, code and numbers. Scale: 13 / 15 / 17 (body) / 20 / 28 / 40 / 56. Prose line length max 72ch, line-height 1.6.
- **Spacing**: 4px base, using 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Borders**: 1px `--line`. Radius 2px (cards, inputs) and 8px only for flow-diagram nodes, as in reference 03.
- **Motion**: 120 to 180ms ease-out for state changes, with no decorative motion. Disabled under `prefers-reduced-motion`.
- **Syntax theme**: Monochrome base. Keywords in ink-2 bold, strings in `--ok`, numbers in `--accent`, comments in ink-3 italic. Annotation-kind underlines: syntax dotted gray, variable solid accent, function dashed accent, parameter dotted accent, math double ink, framework solid warn.
- **Focus**: 2px `--accent` outline with a 2px offset on everything interactive.

## Layout
- App shell: top nav (logo mark, four track chips, Search ⌘K, Glossary, Bookmarks, theme toggle), then content.
- Lesson page (≥1200px): left sidebar with chapter lessons and section anchors, main column (72ch prose; code and visualization blocks may widen to 960px), and the explanation panel docked right beside code blocks when pinned. Under 900px: drawer sidebar, and the panel becomes a bottom sheet.
- Dashboard: pixel progress band, then "Continue" and "Next up" cards, then a 4-track stat grid, then bookmarks and recent.

## Do not
Gradients, glassmorphism, drop shadows, emoji in UI, stock illustrations, oversized heroes, more than one accent hue, or color as the only status signal (always pair it with text or an icon).
