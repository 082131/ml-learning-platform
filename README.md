# Learn ML: an interactive ML learning platform

A static, client-only learning site for Machine Learning, Data, AI and Inference engineering. Vite + React + TypeScript, lessons in MDX with typed metadata, progress in `localStorage`. There is no backend.

Read `CLAUDE.md` first if you are contributing as a build thread.

## Run

```bash
npm ci
npm run dev        # http://localhost:5173
```

The app uses hash routing (`#/learn/ml/math/tensors`), so the built `dist/` works on any static host (GitHub Pages, Netlify, a plain file server) with no rewrites.

## Test and build

| Command | What it does |
|---|---|
| `npm run check` | `tsc --noEmit`, ESLint and Vitest (unit, component and content-validation tests) |
| `npm run e2e` | Builds, serves `dist/` and runs Playwright at 1280px (`desktop`) and 390px (`phone`), including axe scans and a crawl of every route |
| `npm run build` | Content validation, typecheck, then the production build into `dist/` |
| `npm run validate` | Content validation only |

Playwright is pinned to 1.56.1 (and `playwright-core` is overridden to match) because that version uses the Chromium preinstalled at `/opt/pw-browsers`. Don't run `playwright install`.

## Add a lesson

Every lesson in the curriculum already has a folder with a `meta.ts` (status `outline`). To write one:

1. Open `content/tracks/<track>/<chapter>/<lesson>/`. Refine `meta.ts` if needed (title, minutes, objectives, prerequisites as full IDs, `concepts` as glossary IDs). The `id` must equal the folder path.
2. Add `index.mdx`. Use only the components registered in `src/mdx-components.tsx`: wrap each part in `<Section kind="intuition" title="...">` (kinds follow the 12-part structure: `intuition`, `technical`, `visual`, `code`, `experiment`, `mistakes`, `practice`, `check`, `exercise`, `summary`; objectives and prerequisites are rendered from `meta.ts`). Use `<Term id="...">` for glossary terms and `<Callout kind="note|warning|simplification">`. Math uses `$...$` and `$$...$$` (KaTeX); tables use GitHub syntax. No layout markup or one-off styles.
3. Add any new glossary terms to `content/glossary.ts` (`introducedIn` is the lesson that teaches it).
4. Set the lesson's status to `'written'` in `content/curriculum.ts`.
5. Run `npm run check`. Validation fails on a folder/ID mismatch, a missing prerequisite or glossary term, a prerequisite cycle, or a written lesson without `index.mdx`.

No app code changes are needed unless the lesson needs a new visualization component.

## Layout

```
content/            curriculum.ts, glossary.ts, tracks/<track>/<chapter>/<lesson>/{meta.ts,index.mdx}
src/app/            routes, content loading, progress and theme hooks
src/components/ui/  design-system primitives (Button, Card, SectionLabel, Badge, Tabs, Slider, NumberField, Sheet, Popover, Tooltip)
src/components/     layout/ (shell, nav, pixel grid, lesson layout), learning/ (Section, Term, Callout, cards), search/
src/lib/            pure, tested logic: curriculum/, progress/, search/, theme.ts, types.ts
src/pages/          one file per route
src/styles/         tokens.css (design tokens) and base.css
tests/e2e/          Playwright smoke, axe and crawl tests
```

## Progress data

Everything is stored in this browser under the key `mlp:v1` (schema-versioned). Unreadable data is backed up to `mlp:backup` and reset with a notice. If storage is blocked, the app still works for the session and says so. Settings offers export, import and reset.
