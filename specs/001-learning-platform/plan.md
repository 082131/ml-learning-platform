# Implementation Plan: Interactive ML Learning Platform (Release 1)

**Branch**: `001-learning-platform` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)
Related: [data-model.md](data-model.md) · [curriculum.md](curriculum.md) · [design-system.md](design-system.md) · [tasks.md](tasks.md)

## Summary
This is a static, client-only React app. Curriculum content lives as MDX plus typed metadata under `content/`. A fixed registry of learning components (annotated code, step-through, experiments, quizzes, exercises, visualizations) is backed by pure, unit-tested TypeScript logic in `src/lib/`. Progress is kept in versioned localStorage. Python runs optionally in the browser through Pyodide in a Web Worker.

## Technical Context
- **Language**: TypeScript (strict), Node 22 for tooling.
- **Framework**: React 19 + Vite. Versions are the latest stable at install time, pinned by `package-lock.json`.
- **Routing**: React Router in hash mode (`#/learn/:track/:chapter/:lesson`), so any static host works with no rewrites.
- **Storage**: localStorage, one key `mlp:v1`, schema-versioned with migrations (see data-model.md).
- **Testing**: Vitest + Testing Library (unit and component tests), Playwright (e2e on the preinstalled Chromium at desktop 1280px and phone 390px), @axe-core/playwright (accessibility).
- **Quality gates**: `npm run check` runs `tsc --noEmit`, ESLint and Vitest. `npm run e2e` runs Playwright. `npm run build` runs a production build that includes content validation.
- **Target**: Evergreen desktop and mobile browsers. Works offline except for Pyodide's first download.
- **Performance**: Code-split per lesson (MDX is lazy-imported), and Pyodide loads only on first Run. The initial JS budget is ~250 KB gzipped, excluding lesson chunks.

## Dependencies (each one justified)
| Package | Why |
|---|---|
| react, react-dom | UI |
| react-router | Hash routing, nested layouts, lazy routes |
| @mdx-js/rollup + remark-gfm + remark-math + rehype-katex | Lesson prose in MDX with tables and LaTeX math. Far cheaper to author than prose in TS strings |
| katex | Render math (gradients, matrix notation) accurately |
| shiki (fine-grained bundle: python, sql, bash, json, typescript; JS regex engine) | Syntax highlighting that produces tokens with positions, which annotations attach to by range. Highlighting is for display only and never drives explanations |
| minisearch | Small client-side full-text search over lessons and glossary |
| d3-scale, d3-shape, d3-array | Scales, paths and ticks for custom SVG visualizations. No charting framework, because the interactions are bespoke |
| @fontsource/geist-sans, @fontsource/geist-mono | Self-hosted fonts matching the reference look (OFL license). No external font requests |
| pyodide (loaded at runtime from jsDelivr, pinned version, not bundled) | Real Python, NumPy and Pandas in the browser for Python lessons |

Dev only: vite, typescript, vitest, @testing-library/react, @testing-library/user-event, jsdom, @playwright/test, @axe-core/playwright, eslint (+ typescript-eslint, react-hooks plugin), prettier.

No CSS framework. Plain CSS with custom properties (tokens) and CSS Modules per component keeps the bundle small and the look exact.

## Constitution Check
- Static, with no backend or auth (VII). ✓
- Simulated content is labeled (II). ✓ Enforced by the `Trace.source` field, which is required.
- Visual and code share state (III). ✓ Experiments own a single reducer, and code literals are rendered from state through template slots (data-model.md).
- Content as data (IV). ✓ MDX plus typed meta, and a validation test.
- Pure logic tested (V). ✓ `src/lib/**` has 100% of its exported functions covered by tests.

## Project Structure
```
ml-learning-platform/
├── CLAUDE.md                  # Read first: rules and where things are
├── .specify/memory/constitution.md
├── specs/001-learning-platform/   # spec, plan, data-model, curriculum, design-system, tasks
├── design/reference/          # User's UI reference images
├── content/
│   ├── curriculum.ts          # Tracks → chapters → lesson IDs (generated from curriculum.md by hand once, then edited here)
│   ├── glossary.ts
│   └── tracks/<track>/<chapter>/<lesson>/
│       ├── index.mdx          # Prose using registered components
│       ├── meta.ts            # LessonMeta (title, level, objectives, prereqs, concepts, references)
│       ├── code.ts            # CodeExample[] with annotations and trace generators
│       └── quiz.ts            # QuizQuestion[] and Exercise[]
├── src/
│   ├── app/                   # Routes, layouts, providers
│   ├── components/
│   │   ├── ui/                # Design-system primitives: Button, Card, SectionLabel, Badge, Tabs, Slider, NumberField, Sheet
│   │   ├── layout/            # Shell, TopNav, Sidebar, LessonLayout, PixelProgressGrid
│   │   ├── code/              # AnnotatedCode, ExplanationPanel, StepThrough, ProgressiveCode, PythonRunner
│   │   ├── learning/          # LessonSection, KnowledgeCheck, MiniExercise, CommonMistake, ProjectBrief, GlossaryTerm
│   │   └── viz/               # VizFrame, axes, and one folder per visualization
│   ├── lib/
│   │   ├── math/              # vectors, matrices, numeric safety
│   │   ├── ml/                # regression, gradient descent, logistic, trees, nn forward/backward, attention, embeddings
│   │   ├── data/              # pipeline simulation (DAG, retries), batch vs stream
│   │   ├── inference/         # memory estimate, precision and quantization, batching model
│   │   ├── trace/             # Trace builders shared by step-through
│   │   ├── progress/          # Store, schema, migrations, recommendations
│   │   ├── curriculum/        # Lookup, prerequisite resolution, validation
│   │   └── search/            # Index build and query
│   ├── mdx-components.tsx     # The ONLY registry of components lessons may use
│   ├── workers/pyodide.worker.ts
│   └── styles/                # tokens.css, base.css, themes
├── tests/e2e/                 # Playwright specs
└── scripts/validate-content.ts
```

## Key design decisions
1. **Annotations attach to source ranges, not to highlighter tokens.** `Annotation.range = {line, startCol, endCol}` (1-based line, 0-based columns, end exclusive). The renderer splits Shiki tokens at annotation boundaries. A test asserts every range is in bounds and that its `match` text equals the source slice, which catches drift when code is edited.
2. **Linked code.** A `CodeExample` may declare `slots` (for example `{{A}}`) that are filled from experiment state with a formatter. The displayed code is therefore always the code that produces the displayed numbers.
3. **Traces are data.** `buildTrace(inputs) → TraceStep[]` is pure for TypeScript-computed examples. Pyodide examples produce traces with `sys.settrace`-style hooks through a small helper, and precomputed traces carry `source: "simulated"`.
4. **Pyodide in a worker** with a 10-second watchdog that terminates and recreates the worker. Output, errors and the runtime version are shown. Packages load on demand (numpy, pandas). Since this runs in the learner's own browser, there is no server-side risk, and learner-edited code is allowed there.
5. **Progress store** is a tiny module using `useSyncExternalStore` (no state library). Writes are debounced, with storage failure detection.
6. **Theme** uses a `data-theme` attribute on `<html>`, set before first paint by an inline script to avoid a flash.
7. **Responsive**: Below 900px the sidebar becomes a drawer, code and visualization stack, and the explanation panel becomes a bottom sheet.

## Working agreement for threads (keeps the shared folder safe)
- The canonical repo is `/mnt/project-files/ml-learning-platform` on branch `main`. It's a network mount, so **don't install node_modules there**.
- Each thread clones it to local disk: `git clone /mnt/project-files/ml-learning-platform ~/work && cd ~/work && git checkout -b <thread-branch>`, then runs `npm ci`, builds and tests locally.
- When the thread's work is green, it merges into the shared repo: `cd /mnt/project-files/ml-learning-platform && git fetch ~/work <thread-branch> && git merge --ff-only FETCH_HEAD`. If main moved, rebase in `~/work` first (`git fetch origin main && git rebase origin/main`), re-run checks, then merge.
- Threads that can run in parallel touch disjoint directories (see tasks.md). Shared files (`src/mdx-components.tsx`, `content/curriculum.ts`, `content/glossary.ts`) get small, additive edits only.
- Commit messages: imperative summary, with the task IDs in the body.
- Each thread ends with: `npm run check`, `npm run e2e` and `npm run build` all green. Screenshots go to `/mnt/project-files/ml-learning-platform-review/<thread>/` (desktop and phone), the built `dist/` is published as a private preview page, and the thread replies with results.

## Decision log
- 2026-10-19: Interview answered by Claude at the user's request (spec.md, Q1 to Q9).
- 2026-10-19 (thread 1): `nextUp` treats an *outline* prerequisite as satisfied, because outline lessons can't be completed; otherwise a written lesson behind an unwritten one would never be recommended. Marking complete is only offered on written lessons.
- 2026-10-19 (thread 1): Every lesson has a `meta.ts` from day one (objectives and prerequisites drafted from curriculum.md, minutes as 35/45/50 per level, 180 per project, 600 per capstone). Content threads refine them. Prerequisites in `meta.ts` are always full IDs.
- 2026-10-19 (thread 1): Playwright pinned to 1.56.1 with an npm `overrides` entry for `playwright-core`, to match the preinstalled Chromium build. Tool versions installed: React 19.3, React Router 8.5, Vite 8.3, Vitest 5, TypeScript 6.0, ESLint 10.
- 2026-10-19 (thread 1): The pixel band is dark in both themes, so it has its own fixed tokens (`--band-*` in tokens.css). Sections inside lessons get their `[NN/12]` number from the fixed 12-part order, not from their position in the file.
- 2026-10-19 (thread 2): Pyodide pinned to 314.0.7 (the current npm `latest`; Python 3.14.2, NumPy 2.4.6, pandas 3.0.2, Matplotlib 3.10.8 per its lock file). This build environment can't reach jsDelivr, so the Python e2e tests (tagged `@network`) ran against the same version's npm files through `PYODIDE_DIR`; package loading (NumPy and up) was not exercised here.
- 2026-10-19 (thread 2): Column annotations on one line may not overlap, and whole-line annotations render as a button on the line number. This keeps every annotation a separate, non-nested button (nested interactive controls fail axe) and makes a click unambiguous. `validateExample` enforces it.
- 2026-10-19 (thread 2): Annotation columns count Unicode code points, not UTF-16 units. Ranges are written against the template source; `fillSlots` shifts them after `{{slot}}` values are filled. Slot values must be single-line.
- 2026-10-19 (thread 2): Experiments provide their state through `SlotStateContext` (`src/components/code/slotState.ts`); `Code` and `StepThrough` read it to fill slots. Thread 3's `Experiment` wraps its children in that provider and passes `trace={def.trace(state)}` to `StepThrough`.
- 2026-10-19 (thread 2): `LessonBody` provides the lesson ID through `LessonIdContext`, so quizzes, exercises and project checklists save progress under it.
- 2026-10-19 (thread 2): Section bodies may widen to 960px for blocks marked `data-wide` (code, visualizations); prose keeps 72ch. Code comments use ink-2 italic rather than ink-3, which is below AA at 13px.
- 2026-10-19 (thread 2): Each Python run gets a fresh namespace; nothing carries over between runs. The 10-second watchdog starts when code starts running, not while Pyodide downloads. Pyodide-recorded traces stop at 500 steps and say so.
- 2026-10-19 (thread 2): The demo page `#/dev/components` is built when `import.meta.env.DEV` or `VITE_DEV_PAGES=true` (set by the Playwright web server), so production builds leave it out.
- 2026-10-19 (thread 2): `MiniExercise` takes MDX children as the prompt; the string `prompt` renders as text with `inline code` only (no runtime MDX compiler). Exercises without `tests` show the starter read-only. Order questions are shuffled with a seed from the lesson and question ID and never start in the correct order.
- 2026-10-19 (thread 2): Shiki uses its CSS-variables theme mapped to our own classes, and loads each grammar the first time a language is shown.
- 2026-10-19 (thread 3): Added d3-scale, d3-shape and d3-array (as planned). katex is pinned to ^0.16.47 to match the version rehype-katex renders with; katex 0.19's CSS broke subscripts.
- 2026-10-19 (thread 3): `<Experiment>` instances with the same `def.id` on one lesson page share one store (`ExperimentStoresContext`, created in `LessonBody`), so one experiment can appear in the visual, code and experiment sections. `controls={false}` hides repeated controls. `def.traceExample` names the example whose `StepThrough` gets `def.trace`. Two different defs with one id throw.
- 2026-10-19 (thread 3): Visualizations register for MDX through `src/components/viz/<Name>/mdx.ts`, globbed by `mdx-components.tsx`; chapter glossaries live in `content/tracks/<track>/<chapter>/glossary.ts`, globbed by `content/index.ts`. Both let content threads add components and terms without editing a shared file. Duplicate names fail.
- 2026-10-19 (thread 3): Glossary `introducedIn` is the lesson that first teaches the term (matrix and shape: `ml/math/matrices`; dot product: `ml/math/dot-product`), even though matrix-multiplication uses them first in writing.
- 2026-10-19 (thread 3): Matrix-multiplication cells are whole numbers in −20..20 and sizes 1..4, so the readout can show NumPy's exact `print(C)` output (format checked against NumPy 2.5.3). The lesson takes 40 minutes.
- 2026-10-19 (thread 3): Computed traces keep loop variables in scope after their loop ends, as Python does.
- 2026-10-19 (thread 3): Scrollable regions that overflow (wide math, tables, viz, variables panel) become keyboard-focusable via `useOverflowFocus` (axe scrollable-region-focusable). FlowDiagram nodes are named by an SVG `<title>`, not `aria-label`, so the visible label is part of the name.
- 2026-10-19 (thread 3): Lesson `references` from `meta.ts` now render at the end of written lessons.
- 2026-10-19 (thread 3): Prettier ignores `*.mdx` (it inserted blank lines that changed MDX output). Vitest runs with `fsModuleCache: false`, because the cache served stale `import.meta.glob` results.
- 2026-10-19 (thread 6): The Classical ML chapter uses the Palmer penguins dataset (CC0, 344 rows, unmodified, source and checksum in `src/lib/classical/data/SOURCE.md`). TypeScript experiments read the whole file; Python examples inline a small, named subset, because `PythonRunner` has no file access and the CSV would swamp the editor.
- 2026-10-19 (thread 6): Expected outputs of NumPy, pandas and scikit-learn code in the chapter come from CPython 3.13 with the library versions Pyodide 314.0.7 ships (NumPy 2.4.6, pandas 3.0.2, scikit-learn 1.8.0), so they match what learners get in the browser. jsDelivr is unreachable from the build container, so those packages were not run inside Pyodide here.
- 2026-10-19 (thread 6): Chapter glossary terms live in `content/tracks/ml/classical/glossary/<lesson>.ts`, merged by the chapter's `glossary.ts`, so the chapter's lessons can be written in parallel.
- 2026-10-19 (thread 6): Added `ScatterPlot` (groups differ by marker shape as well as tone), `src/lib/classical/` (seeded RNG, statistics matching NumPy and pandas defaults, the dataset).
