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
- 2026-10-19 (thread 1): ~~The pixel band is dark in both themes~~ (superseded 2026-10-27, see below). The band has its own `--band-*` tokens in tokens.css. Sections inside lessons get their `[NN/12]` number from the fixed 12-part order, not from their position in the file.
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
- 2026-10-19 (thread 9): No sql.js. Joins run in TypeScript (`src/lib/data/join.ts`), and their results are checked in unit tests against the same queries run in SQLite 3.45.1 (Python 3.13's sqlite3), so the lesson shows SQLite's real rows without a ~1 MB WebAssembly download. Pyodide's sqlite3 is a separately downloaded package that this build environment can't fetch, so the in-browser Python examples are pure Python.
- 2026-10-19 (thread 9): The index step-through models an index as a sorted Python list with binary search, labeled as a simplification of a B-tree; "entries read" counts every probe and every forward read, including the one that ends the run. Every table size and target the lesson offers is checked against CPython (`src/lib/data/fixtures/lookup.py`).
- 2026-10-19 (thread 9): Readout values wrap (`pre-wrap`, `overflow-wrap: anywhere`) instead of scrolling, because a scrolling readout cell is not keyboard-focusable and failed axe.
- 2026-10-22 (thread 9): The ETL vs ELT lesson's pipeline (`src/lib/data/etl.ts`) reproduces the Python and SQLite behaviors it depends on (float(), fromisoformat, CAST AS REAL, datetime(), a PRIMARY KEY), and all 32 combinations of mode, injected record and validation are checked against `fixtures/etl.py` run with CPython 3.13 and SQLite 3.45.1. The code the lesson shows is copied from that script, and a test keeps the two identical. Duplicate order ids quarantine every copy, because nothing says which one is right.
- 2026-10-22 (thread 9): The batch vs stream simulator uses one fixed set of 16 events, recomputes the watermark (largest event time seen minus the allowed lateness) after every event, emits a tumbling window once the watermark reaches its end, and drops later events for it. The lesson labels this as a simplification of Spark's micro-batch watermark and of engines that emit corrections. Its printout is checked against the lesson's Python for every window size and lateness. The PySpark example is checked against the PySpark 4.2.0 docstrings and is not run.
- 2026-10-22 (thread 11): Inference model presets (GPT-2 small, Llama 3.1 8B and 70B) come from the llama-models `sku_list.py` and the Transformers `GPT2Config` source; unit tests pin their parameter counts (124,439,808; 8,030,261,248; 70,553,706,496). Memory is shown in GiB (2^30 bytes). The GPU sizes offered are 16, 24, 40, 48 and 80, labeled in GB as GPUs are sold and compared as GiB; the lesson's callout says the CUDA context and allocator reserve part of that. The activation term is labeled an estimate: batch · seq_len · (2 · hidden + 2 · intermediate) values for one layer during prefill, plus the attention scores when the naive kernel is selected, not a measured peak.
- 2026-10-22 (thread 11): The precision lesson's "real weights" are a 64-16-10 MLP trained with scikit-learn 1.9.1 on the digits dataset (`generate_weights.py` in the lesson folder; 349 of 360 held-out images correct), because pretrained model weights can't be downloaded from this environment. FP16 and BF16 values are converted from FP32 with round half to even, and the bit patterns are checked against Python's `struct` and ml_dtypes 0.6.0. ml_dtypes and scikit-learn were installed only to verify outputs and are not dependencies of the site.
- 2026-10-22 (thread 11): The batching simulator reuses the mulberry32 generator from `src/lib/classical/random.ts`, so the lesson's Python port reproduces the browser's numbers exactly (checked against CPython for six settings). The service time `t0 + per_item · batch` is an explicit assumption labeled as a model, and the roofline example uses round numbers for a hypothetical GPU. Percentiles use the nearest-rank method.
- 2026-10-22 (thread 11): Thread 11's Readout overflow fix was dropped in favor of thread 9's wrapping fix, which landed first and solves the same axe finding.
- 2026-10-22 (thread 11): Objectives and prerequisites for the 11 outline inference lessons are filled in (I004). Where an outline lesson needs ML-track background, it lists the ML lesson it builds on (for example, forward propagation for what-is-inference and PyTorch basics for loading and serialization).
- 2026-10-22 (thread 10): The AI track's embeddings come from `sentence-transformers/all-MiniLM-L6-v2` (Apache-2.0, revision 7dbbc903…), run from Chroma's ONNX export (archive sha256 913d7300…, model.onnx sha256 4f148ba8…) because Hugging Face is unreachable from the build container. `scripts/ai/generate_embeddings.py` checks both checksums and reproduces the sentence-transformers README similarities (0.6660, 0.1046, 0.1411) before writing anything. Mean pooling, then L2 normalization.
- 2026-10-22 (thread 10): Vectors are stored as float16 in base64 (29.7 KB for 27 texts, 156.6 KB for every RAG chunk setting). The script measures the largest cosine error this causes (at most 6e-5) and stores it next to the vectors.
- 2026-10-22 (thread 10): The tokenizer playground runs a TypeScript WordPiece (`src/lib/ai/wordpiece.ts`) with the model's own vocab.txt, tested against the `tokenizers` library's output on 10 fixtures, so the token chips are real, not simulated.
- 2026-10-22 (thread 10): RAG chunks are counted in words, not tokens, so chunking runs live in the browser and every chunk setting (sizes 20/40/80, overlaps 0/10) is embedded ahead of time. The lesson labels this as a simplification.
- 2026-10-22 (thread 10): The RAG reranker is a hybrid score, (1 − w)·cosine + w·BM25 scaled by its maximum, over the top 8 cosine candidates, instead of a cross-encoder, which cannot run in the browser at this size. The lesson says production rerankers are usually cross-encoders.
- 2026-10-22 (thread 10): No language model runs in the AI lessons. The RAG response and the agent's model turns are scripted and labeled "Simulated response" and "Scripted model turn"; retrieval, prompt assembly, the agent loop and both tools (an arithmetic parser and BM25 search) are computed. The Anthropic tool-use loop was run against a mocked HTTP transport with anthropic 2.1.0, not against the API.
- 2026-10-22 (thread 10): The readout pre-wrap fix for clipped values was made on main by thread 9 at the same time; main's version was kept.
- 2026-10-26 (thread 4): Every runnable example in ML Foundations was run for real in both runtimes: `content/tracks/ml/foundations/python-outputs.test.ts` runs each `expectedOutput` example and each exercise (solution passes, starter fails) under CPython, and, when `PYODIDE_DIR` points at an extracted Pyodide 314.0.7 release, in Pyodide under Node. jsDelivr is unreachable from the build container, so the release archive was downloaded from GitHub and the same `PYODIDE_DIR` serves the e2e runs.
- 2026-10-26 (thread 4): The Python basics and control-flow step-throughs are computed in TypeScript and compared step by step with a CPython tracer that uses the harness's stepping rules (`src/lib/foundations/pythonOracle.ts`). Floats and other non-integer values appear as Python `repr` text, exactly as Python prints them.
- 2026-10-26 (thread 4): Explorers are checked exhaustively against the real libraries: slicing against CPython for every bound and step offered, NumPy indexing and broadcasting (values, shapes and exact error text), the pandas table explorer for all 1,024 control combinations, and histogram counts and edges (NumPy's `np.histogram` bin rule is reproduced) for every column and bin count.
- 2026-10-26 (thread 4): NumPy's default integer is `int32` in Pyodide (32-bit WebAssembly) and `int64` on 64-bit computers. Lessons show the browser's output and say why; the test maps `int64` to `int32` for that one example (`testSetup.ts`).
- 2026-10-26 (thread 4): The pandas, Matplotlib and project lessons load thread 6's bundled penguins CSV inside Pyodide: the file is imported with `?url`, and the runner code calls `pyodide.http.open_url` with its absolute address, next to a comment giving the `pd.read_csv("penguins.csv")` equivalent. Tests replace `open_url` with a stand-in that reads the same file. Ties in `sort_values` are ordered differently by CPython and Pyodide, so the lessons sort with `kind="stable"`.
- 2026-10-26 (thread 4): The loop vs NumPy timing runner has no expected output; its numbers exist only after the learner runs it, and the printout says "Measured in your browser just now". It takes the best of 3 runs of each and compares a loop over a Python list with `np.sum(x * x)`.
- 2026-10-26 (thread 4): The spam toy learns +1/−1 word scores and a threshold (the middle one of the whole-number thresholds with the fewest training mistakes); the types-of-ml k-means starts from farthest-point seeds so it is deterministic. Both are checked against Python.
- 2026-10-26 (thread 4): Shared files changed: `PixelProgressGrid.test.tsx` reads each cell's expected status from the curriculum instead of assuming the second lesson is an outline, and `src/workers/harness.py` ignores Matplotlib 3.10's "The x/y parameter as float was deprecated" warning while saving figures, because Pyodide's Agg renderer raises it for its own text positions on every plot.
- 2026-10-22 (thread 5): Math chapter outputs come from NumPy 2.5.3 on CPython 3.13, generated by scripts beside the fixtures (`src/lib/linalg/fixtures`, `src/lib/calculus/fixtures`, `src/lib/optimization/fixtures`). Readouts labeled "What the code prints" reproduce Python and NumPy printing exactly (`src/lib/linalg/pyFormat.ts`) and are unit-tested against those fixtures for every slider setting, or a 1,504-case sample where the grid is too large.
- 2026-10-22 (thread 5): `Readout` sets `tabIndex=0` on a value cell only when it still overflows after rendering (axe scrollable-region-focusable), with a component test. Thread 9's wrapping fix makes this rare; it stays as a fallback. The app test for outline lessons now picks an outline lesson with prerequisites from the curriculum data, because the hard-coded one (tensors) became written.
- 2026-10-22 (thread 5): `gradients-chain-rule` is intermediate, 45 minutes: it is the chapter's first multi-step derivation. The 2-D gradient field is shown in `loss-optimization`'s contour map (`DescentContour`) rather than in the gradients lesson, so the field appears where it drives an algorithm.
- 2026-10-26 (thread 5): Probability and statistics reuse thread 6's seeded mulberry32 generator and statistics helpers. Their NumPy code is shown without a printed-output claim for the simulator's settings, because NumPy's PCG64 draws different numbers for the same seed; fixed examples with real NumPy output sit beside them. Glossary term `random-seed` is thread 8's.
- 2026-10-26 (thread 5): The statistics confounder is a binary season (40 summer and 40 winter days) rather than a continuous temperature, so splitting by it makes the within-group correlation drop to near 0, which a coarse temperature band would not.
- 2026-10-26 (thread 5): `DescentContour` draws the MSE of a line fit to four points as exact ellipses (the loss is quadratic) on one scale for both axes, so −∇L visibly crosses contours at right angles. The linked code uses plain Python lists; `pySum` reproduces CPython 3.12+'s compensated `sum()` so the printout matches to the last digit.
- 2026-10-26 (thread 5): Merges into the shared repo use the fetched commit's SHA (`git merge --ff-only <sha>`), not `FETCH_HEAD`, because parallel threads overwrite the shared repo's `FETCH_HEAD`; one thread 5 merge was lost that way and redone. `tests/e2e/math-python.spec.ts` (@network) runs every math runner and exercise solution in Pyodide; offline, point `PYODIDE_DIR` at the `pyodide@314.0.7` npm package.
- 2026-10-27 (thread 8): The Practical ML lessons use a seeded 32-bit LCG (`src/lib/practice/lcg.ts`) and synthetic delivery datasets with a known rule, so each visual's TypeScript is a bit-identical mirror of the lesson's Python and every readout is what the code prints (checked in unit tests against CPython 3.13.16 output). Python-style formatting lives in `src/lib/practice/pyFormat.ts`.
- 2026-10-27 (thread 8): MLflow 3.17, DVC 3.67.1, pytest 9.1.1 and PyTorch 2.14.1 commands shown in lessons were run locally; the PyTorch AMP loop ran on CPU (no GPU available) and the lesson says so. GPU figures are datasheet values (dense, half the "with sparsity" number) and the GPU lesson's throughput and memory model is labeled as an estimate with its formulas.
- 2026-10-27 (thread 8): Capstones use offline data where possible (scikit-learn's bundled breast cancer and digits sets, a generated dataset for the reproduction). The fine-tuning and NLP capstones need the Hugging Face Hub, which was unreachable here: their scripts were run in smoke-test mode or on a demo corpus only, and the pages say no full-run numbers are given.
- 2026-10-27 (thread 8): Terms owned by other threads are defined in prose rather than with `<Term>`. Shared-file change: `src/components/code/AnnotatedLines.tsx` makes overflowing code without annotations keyboard-focusable (axe scrollable-region-focusable).
- 2026-10-28 (thread 7): Shared deep learning logic lives in `src/lib/deep/` (dense layers in the `X @ W + b`, (in, out) convention of the matrix lessons; backprop checked against NumPy and against central-difference gradients). Lessons note that PyTorch's `nn.Linear` stores its weight as (out, in). `playwright.config.ts` reads `PW_PORT` so parallel checkouts can run e2e at once.
- 2026-10-28 (thread 7): Forward propagation uses a 2-3-1 network with hand-picked weights on the four XOR corners (batch 1 to 4, so batch size never equals a layer width). Backprop uses a 2-2-1 network with MSE on one example; the diagram adds a loss node, and a live table compares all 9 gradients with central differences (ε = 1e-5). Code readouts print with f-strings or `.round(4).tolist()` so they match real output exactly.
- 2026-10-28 (thread 7): Optimizer race: SGD and momentum share one η, Adam has its own (its steps are about η long whatever the gradient scale). Momentum uses PyTorch's form (u ← βu + g; θ −= ηu) and Adam adds ε outside the square root, as `torch.optim.Adam` does; checked against torch 2.14.1 in float64.
- 2026-10-28 (thread 7): The training-loop lesson trains a 2-8-1 MLP live on seeded two-moons or circles data with a flat-array trainer (tested equal to `mlp.ts` to 1e-13). Its code is shown in TypeScript because that is what runs; the static NumPy version says its random numbers differ.
- 2026-10-28 (thread 7): PyTorch values in `pytorch-basics` were recorded by running `src/lib/deep/fixtures/tiny_net.py` with PyTorch 2.14.1 on CPU (generator script committed). The trace carries the Simulated trace badge with that provenance; `StepThrough` gained an optional `simulatedNote` prop for it (backwards compatible). A TypeScript twin reruns the network live and reports its difference from the recorded run.
- 2026-10-28 (thread 7): The neural-network project uses scikit-learn's bundled breast cancer data (NumPy first, then PyTorch) with pinned numpy 2.5.4, scikit-learn 1.9.1, torch 2.14.1 and matplotlib 3.10.8, to stay distinct from the digits capstone.
- 2026-10-28 (thread 7): The toy BPE in `tokenization` drops spaces, falls back to `[UNK]` for unseen characters and breaks ties by first occurrence (like Python's `max`); IDs are 0 = `[UNK]`, then base characters by code point, then merges. A callout covers byte-level BPE and SentencePiece; the lesson links to `ai/representations/tokens-embeddings` for real tokenizers.
- 2026-10-28 (thread 7): `embeddings` uses hand-made 2-D vectors for 8 tokens and says so; points can't sit on the origin (cosine undefined). The attention heatmap draws each weight as a square sized by area with the number printed, so it reads in both themes without relying on color. Attention values are checked against a NumPy 2.5.3 fixture.
- 2026-10-28 (thread 7): `transformers` follows GPT-2 (pre-LN, learned positions, GELU, tied output layer); per-block parameters 4d² + 2d·d_ff + 9d + d_ff, checked by hand for GPT-2 small (7,087,872 per block, 124,439,808 total). A callout lists the 2017 differences and newer variants (RMSNorm, RoPE, SwiGLU, GQA). PyTorch was not run for this lesson and it says so.
- 2026-10-27 (theme colors): At the user's request the pixel band follows the active theme: a light band (`--band` #f7f7f5, white outline-only cells, gray-blue not-started cells, `--accent` for complete and in-progress) in light mode, unchanged in dark mode. All `--band-*` tokens now live in the per-theme blocks; `--band-grid` draws the faint background grid separately from cell borders. An audit of every route in both themes found no other hardcoded colors (the Matplotlib white plot background and the sheet scrim are intentional).
- 2026-11-01 (thread 12, data track): Each data lesson's experiment follows one pattern: a Python fixture script in `src/lib/data/fixtures/` embeds the lesson's Python as `SOURCE` with `{{slot}}` placeholders, runs every control setting under CPython 3.13.18 and writes a JSON fixture; the TypeScript simulator must print exactly the same for every setting, and a test checks that the TS source string is embedded verbatim in the script. `content/tracks/data/python-outputs.test.ts` runs every data-track runner and exercise under CPython (solution passes, starter fails).
- 2026-11-01 (thread 12): Static outputs were produced by running the real tools in this container: pandas 3.0.5, pyarrow 26.0.0, DuckDB 2.0.0, deltalake 1.6.6, PySpark 4.3.0 (local mode, Java 21; plan ids stripped), pytest 9.2.0, SQLite 3.53.1. Airflow 3 and dbt were not run; their code follows the documentation and the pages do not show output for them. The lakehouse byte counts come from the real files' Parquet metadata.
- 2026-11-01 (thread 12): Cloud prices could not be checked against live price lists from here, so the cost lesson uses round example prices, says so in the text, and carries the Estimate badge. Inline math in MDX avoids `\$` (it breaks the MDX expression parser); amounts are written as USD.
- 2026-11-01 (thread 12): Shared-file changes: `src/app/app.test.tsx` uses `queryAllByText` for the outline count (the data track now has none) and gives the outline-lesson test a 15 s timeout, since the first outline lesson now lives in another track and loads slower under a full parallel run.

