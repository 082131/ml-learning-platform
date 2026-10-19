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
3. Add any new glossary terms to your chapter's `content/tracks/<track>/<chapter>/glossary.ts` (merged into the glossary automatically; `introducedIn` is the lesson that teaches it).
4. Set the lesson's status to `'written'` in `content/curriculum.ts`.
5. Run `npm run check`. Validation fails on a folder/ID mismatch, a missing prerequisite or glossary term, a prerequisite cycle, a written lesson without `index.mdx`, an annotation range that is out of bounds or whose `match` no longer equals the code (in `code.ts`), or a malformed quiz answer (in `quiz.ts`).

No app code changes are needed unless the lesson needs a new visualization component. **[AUTHORING.md](AUTHORING.md)** is the full guide: it walks through the model lesson `ml/math/matrix-multiplication` and lists which shared files parallel threads may touch.

## Code and assessment components

Put code examples in the lesson's `code.ts` and questions in `quiz.ts` (types in `src/lib/types.ts`), import them in `index.mdx`, and pass them in:

```mdx
import { matmul, matmulStages, sumTrace } from './code';
import { questions, dotExercise } from './quiz';

<Code example={matmul} title="matmul.py" />                       {/* hover, focus or click a part to explain it */}
<StepThrough example={matmul} trace={sumTrace} />                 {/* trace.source: computed | pyodide | simulated */}
<StepThrough example={pythonOnly} />                              {/* no trace: "Record trace" runs it in Pyodide */}
<ProgressiveCode example={matmulStages} />
<PythonRunner example={matmul} />                                 {/* editable, runs in the browser */}
<CommonMistake title="..." wrong="..." error="(real error text)" cause="..." fix="..." />
<KnowledgeCheck questions={questions} />
<MiniExercise exercise={dotExercise}>Optional MDX prompt.</MiniExercise>
<Project brief={brief} />
```

- **Annotations** use `range: { line, startCol, endCol }` (1-based line; columns count characters, 0-based, end exclusive) and `match` with the exact text. Leave out the columns for a whole-line note, shown on the line number. Column ranges on one line must not overlap.
- **Slots**: write `{{A}}` in the source and give `slots: { A: (state) => '...' }`. Inside an experiment the code shows the live values, and annotation ranges (written against the template) move with them.
- **Traces** are data. Build computed ones with a pure function in `src/lib/` (see `src/lib/trace/runningSum.ts`) and test them with `validateTrace`. Anything not produced by real execution is `source: 'simulated'` and shows the badge.
- **Python** runs in Pyodide (version pinned in `src/lib/python/protocol.ts`), loaded from jsDelivr on the first Run, with a 10-second limit. Exercises with `tests` run those asserts against the learner's code.
- The demo page `#/dev/components` shows every component; it exists in `npm run dev` and in the e2e build, not in production.

Python e2e tests are tagged `@network` because they download Pyodide. Offline, skip them with `npx playwright test --grep-invert @network`, or extract the `pyodide` npm package of the pinned version and set `PYODIDE_DIR=<its package folder>` to serve it locally.

## Experiments and visualizations

An experiment is a pure definition (`ExperimentDef` in `src/lib/types.ts`: initial state, controls, `compute`, optional `trace`, `readout`) built in `src/lib/` and exported from the lesson's `code.ts`. In MDX, `<Experiment def={...}>` renders the controls and a Reset button and gives its children the live state: visualizations, `Code` slots, `StepThrough` (fed `def.trace`, filtered by `def.traceExample`) and `<Readout />`. Every `<Experiment>` with the same `def.id` on one lesson page shares one state, so a visual section and a code section stay in sync; pass `controls={false}` where the controls would repeat.

Visualizations live in `src/components/viz/<Name>/` and register themselves for MDX through that folder's `mdx.ts` (no edit to `mdx-components.tsx`; duplicate names fail the build): `VizFrame`, `MatrixGrid`, `MatMulGrid`, `LineChart`, `BarCompare`, `FlowDiagram`, `GradientDescent1D`, `VectorPlane`. Each has a table alternative. Their math is in `src/lib/math/`, `src/lib/viz/` and `src/lib/ml/`. The demo page `#/dev/viz` shows them all.

## Layout

```
content/            curriculum.ts, glossary.ts, tracks/<track>/<chapter>/<lesson>/{meta.ts,index.mdx,code.ts,quiz.ts}
src/app/            routes, content loading, progress and theme hooks
src/components/ui/  design-system primitives (Button, Card, SectionLabel, Badge, Tabs, Slider, NumberField, Sheet, Popover, Tooltip)
src/components/     layout/ (shell, nav, pixel grid, lesson layout), learning/ (Section, Term, Callout, cards), search/,
                    code/ (Code, StepThrough, ProgressiveCode, PythonRunner), assessment/ (quiz, exercise, mistake, project),
                    experiment/ (Experiment, Readout), viz/ (one folder per visualization, each with mdx.ts)
src/lib/            pure, tested logic: math/, ml/, viz/, experiment/, code/, trace/, python/, quiz/, curriculum/, progress/, search/, theme.ts, types.ts
src/workers/        pyodide.worker.ts and harness.py (runs learner code, records traces, runs exercise tests)
src/dev/            the #/dev/components and #/dev/viz demo pages
src/pages/          one file per route
src/styles/         tokens.css (design tokens) and base.css
tests/e2e/          Playwright smoke, axe and crawl tests
```

## Progress data

Everything is stored in this browser under the key `mlp:v1` (schema-versioned). Unreadable data is backed up to `mlp:backup` and reset with a notice. If storage is blocked, the app still works for the session and says so. Settings offers export, import and reset.
