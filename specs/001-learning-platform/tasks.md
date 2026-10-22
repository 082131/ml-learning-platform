# Tasks: Interactive ML Learning Platform (Release 1)

Each `## Thread` section below is a self-contained brief for one focused thread. Before starting, a thread reads `CLAUDE.md`, the constitution, and **only** the spec documents its brief lists. It follows the working agreement in `plan.md` (clone to local disk, branch, test, fast-forward merge into the shared repo).

Format: `- [ ] ID [P] Description`. **[P]** means the task can run in parallel with the others in its group. A task is done only when its tests pass and the route is checked in Playwright (constitution VI). Tick tasks off in this file as part of the merge.

## Order and parallelism
```
Step 1:  Thread 1  Shell & design system
Step 2:  Thread 2  Code-learning components
Step 3:  Thread 3  Visualization core + reference lesson
Step 4:  Threads 4-11 in parallel
         4 ML Foundations · 5 ML Math · 6 ML Classical · 7 ML Deep Learning
         8 ML Practice + Projects · 9 Data flagship · 10 AI flagship · 11 Inference flagship
Step 5:  Thread 12 Verification & polish
```
Threads 4 to 11 touch disjoint `content/tracks/<track>/<chapter>/` and `src/components/viz/<name>/` folders, so they can run in parallel. Their shared-file edits (glossary, mdx-components, curriculum status) are small and additive. Rebase before merging.

---

## Thread 1: App shell and design system
**Reads**: spec.md, plan.md, data-model.md (Curriculum, Stored progress), design-system.md, curriculum.md.
**Delivers**: A working, navigable app with all four tracks, lesson routing, theme, progress, search and glossary infrastructure, showing every lesson from curriculum.md as "Outline only" until content arrives.

- [x] S001 Scaffold Vite + React + TS (strict) in the repo root. Add ESLint, Prettier, Vitest, Playwright (use the preinstalled Chromium at `/opt/pw-browsers`) and @axe-core/playwright. Add scripts `dev`, `build`, `check`, `e2e`, `preview`. Add `.gitignore` (node_modules, dist, test-results).
- [x] S002 MDX pipeline: @mdx-js/rollup, remark-gfm, remark-math, rehype-katex, and a lazy-import map built with `import.meta.glob('content/tracks/**/index.mdx')`.
- [x] S003 `src/styles/tokens.css` and `base.css` from design-system.md. Self-hosted Geist fonts. Theme provider with the no-flash inline script and a three-way toggle (system, light, dark). Test: toggling persists and sets `data-theme`.
- [x] S004 [P] UI primitives in `src/components/ui/`: Button (primary/secondary), Card, SectionLabel (`[03/12] —— > INTUITION`), Badge (incl. "Outline only" and "Simulated trace"), Tabs, Slider, NumberField, Sheet (bottom sheet), Tooltip/Popover (keyboard-accessible). Each gets a component test.
- [x] S005 `src/lib/types.ts` and `content/curriculum.ts` encoding **every** track, chapter and lesson ID from curriculum.md, with status `outline`. Add `src/lib/curriculum/` (lookup, prerequisites, next/prev, validation: IDs exist, no cycles, folder matches ID). Test: the validation runs in `npm run check` and in `build`.
- [x] S006 Routes (hash): `/` dashboard, `/learn/:track`, `/learn/:track/:chapter/:lesson`, `/glossary`, `/bookmarks`, `/settings`, and a not-found route. Shell with top nav (track chips, search, glossary, bookmarks, theme). Responsive drawer below 900px.
- [x] S007 Track page: header with `/ Title`, track code and stats; **PixelProgressGrid** band (one cell per lesson, keyboard navigable, tooltip, Enter opens); chapters as 3-up card grids grouped by level; lesson cards with `// 001`, level, minutes, status.
- [x] S008 Lesson page layout: LessonLayout with sidebar (chapter lessons and section anchors), header (title, level, minutes, objectives, prerequisite chips with completion state), MDX body, a footer with "Mark complete", bookmark and prev/next. An outline lesson renders objectives and prerequisites with the "Outline only" badge. Add one sample lesson `content/tracks/ml/foundations/what-is-ml/` with only the intuition section, to prove the pipeline (thread 4 replaces it).
- [x] S009 `src/lib/progress/`: store via `useSyncExternalStore`, schema v1, migration and backup, storage-failure detection with a notice, debounced writes, export/import JSON, reset, recommendations (`nextUp`). Unit tests for every function, including corrupt data and an unavailable storage mock.
- [x] S010 Dashboard: progress band, Continue (last viewed), Next up per track, 4-track stat grid, bookmarks, recent. Settings page: theme, export/import/reset, and the plain explanation of persistence limits (spec, US3).
- [x] S011 [P] Search: MiniSearch index over lesson meta and glossary, a ⌘K/Ctrl-K dialog with full keyboard support and an empty state. Glossary page plus a `<Term>` component (popover, link to `introducedIn`). Seed the glossary with ~10 foundation terms.
- [x] S012 E2E smoke (desktop and 390px): visit all four tracks, open a lesson, follow a prerequisite, mark complete, reload and confirm persistence, toggle theme, search, and run axe on the dashboard, track and lesson pages. Add a crawl test that visits every curriculum route and asserts no console errors.
- [x] S013 Write `README.md` (run, test, build, add-a-lesson guide). Review: screenshots and a preview publish per the plan's working agreement.

## Thread 2: Interactive code-learning components
**Reads**: spec.md (US1, US4), data-model.md (Code examples, Traces, Assessment, registry), design-system.md (syntax theme, annotation kinds), plan.md (key decisions 1 to 4).
**Delivers**: The registered MDX components for code learning and assessment, each with tests and a demo page at `#/dev/components` (dev builds only).

- [x] C001 Shiki fine-grained highlighter (lazy, cached) and `src/lib/code/segments.ts`, which splits highlighter tokens at annotation boundaries into renderable segments. Unit tests: overlapping annotations, whole-line annotations, unicode, and out-of-range → error.
- [x] C002 `AnnotatedCode`: annotated spans are focusable (roving tabindex per line, arrows to move, Enter to pin, Escape to unpin). Hover shows a preview, and click or Enter pins it to the ExplanationPanel (what, why, inputs, output, kind badge). The active span and line are highlighted. Kind-specific underline styles. The panel becomes a bottom sheet on phone. Component tests cover hover, focus, pin, unpin and keyboard navigation.
- [x] C003 `validateExample()`: ranges in bounds, `match` equals the source slice, unique IDs, slots defined. It's used by the content validation script.
- [x] C004 Slots: `{{name}}` placeholders are filled from experiment state. Annotation ranges are computed after slot fill (a test proves the ranges shift correctly).
- [x] C005 `StepThrough`: controls (first, prev, play/pause, next, last, plus a scrubber), active range highlight, a variables panel (scalars, arrays with shape, changed values marked), the step note, and the required source badge (computed, pyodide, simulated). Keyboard support: ←/→ steps. Tests cover navigation, and that the simulated badge appears.
- [x] C006 `ProgressiveCode`: stage tabs with a line diff against the previous stage (added and removed lines marked, not color-only) and a note per stage.
- [x] C007 Pyodide worker: lazy load from jsDelivr with the version pinned in one constant, a queue, stdout/stderr capture, a 10-second watchdog that terminates and recreates the worker, `loadPackage` on demand, and a matplotlib-to-PNG helper. `PythonRunner` UI: Run, Reset, editable code (a plain textarea with tab handling; no heavy editor), output, error and loading states, and an offline message. E2E test that runs `print(sum(range(5)))` and gets `10`; mark it `@network` so it can be skipped offline.
- [x] C008 `KnowledgeCheck` (choice, numeric, order) with per-option feedback, saved attempts, retry. `MiniExercise` with hints one at a time, an explicit reveal, and Pyodide tests when `tests` is present (pass and fail messages). `CommonMistake` (wrong code, error message, cause, fix). `ProjectBrief` with a saved checklist. Each gets component tests.
- [x] C009 Register everything in `src/mdx-components.tsx`. Build the dev demo page. E2E coverage of the demo page at both widths. Review per the working agreement.

## Thread 3: Visualization core and the reference lesson
**Reads**: spec.md (US1, US5), data-model.md (Experiments), design-system.md (flow diagram, dotted canvas, comparison bars), curriculum.md (ml/math/*), plan.md.
**Delivers**: The visualization primitives, the experiment framework, and the **reference lesson `ml/math/matrix-multiplication`**, written in full as the quality bar every content thread copies.

- [x] V001 `src/lib/math/`: vectors, matrices (shape checks with clear errors, multiply, transpose, add), and numeric safety (`isFiniteOrDiverged`). Exhaustive unit tests against hand-worked examples.
- [x] V002 `Experiment` component and `useExperiment(def)`: a single state reducer, controls rendered from `def.controls` (slider, number, matrix-cell, select, text), `compute` memoized, and `(state, result)` passed to children (viz, code slots, readout). Test: a control change updates all three consumers.
- [x] V003 Viz primitives: `VizFrame` (title, dotted canvas, a text/table alternative toggle, a reduced-motion guard), Axes, Grid, Arrow, `MatrixGrid` (editable cells, row/column highlight), `FlowDiagram` (nodes, ports, orthogonal connectors with arrowheads and junction markers, status badges, per reference 03), `LineChart`, `BarCompare` (draggable split, per reference 02). Component tests for each.
- [x] V004 `VectorPlane` (drag arrows, add, scale, dot product readout), used by `ml/math/scalars-vectors` and `dot-product` later.
- [x] V005 Reference lesson `ml/math/matrix-multiplication`, all 12 sections: editable A (2×3) and B (3×2); the MatrixGrid highlights the current row and column; StepThrough is computed from `buildMatMulTrace(A, B)` and shows each multiply-add; the NumPy code is linked through slots; ProgressiveCode goes from triple loop to row·column to `A @ B`; a common mistake (shape mismatch, with the real NumPy error text); a knowledge check; a mini-exercise run in Pyodide; and the summary links to `tensors`. Glossary terms: matrix, shape, dot product.
- [x] V006 `GradientDescent1D` visualization plus `src/lib/ml/gradientDescent.ts` (a quadratic and a non-convex function, a learning-rate slider, steps; divergence is detected and labeled). This de-risks thread 5's `loss-optimization`.
- [x] V007 E2E: edit a matrix cell, then assert that the grid result, the code literal, the trace arithmetic and the readout all match. Gradient descent at a high learning rate shows "diverged". Axe passes on the reference lesson. Review per the working agreement.

---

## Content threads (4 to 11): shared rules
**Each reads**: CLAUDE.md, the constitution, data-model.md, the curriculum.md section for its scope, design-system.md (only if it builds new visuals), and the reference lesson `content/tracks/ml/math/matrix-multiplication/` as the pattern.
For **each lesson**: write `meta.ts`, `index.mdx`, `code.ts` and `quiz.ts`, and set its status to `written` in `content/curriculum.ts`. Add the glossary terms it introduces. Every number shown is computed, real (Pyodide) or a labeled estimate. Version-sensitive APIs cite official docs with the version.
For **each new visualization**: pure logic in `src/lib/<area>/` with unit tests against a hand-worked example, a component in `src/components/viz/<Name>/` registered in mdx-components, and an e2e assertion that input changes the output.
Close each content thread with: content validation green, `check`, `e2e` and `build` green, an axe scan of 3 of its lessons, screenshots of 2 lessons at both widths, and a preview publish.

## Thread 4: ML Foundations (`ml/foundations`, 10 entries)
- [x] M101 `what-is-ml` (replaces the shell's sample): rule-based vs learned spam toy (computed word counts and threshold).
- [x] M102 `types-of-ml`: scenario-sorting exercise (`order` and `choice` checks).
- [ ] M103 to M105 Python basics, control flow, collections: Pyodide runners, step-throughs of state changes (trace via Pyodide where possible, otherwise computed), and a slice visualizer.
- [ ] M106 to M107 NumPy arrays and vectorization: shape explorer, broadcasting visualizer, loop vs vectorized timing measured live in Pyodide and labeled "measured in your browser".
- [ ] M108 to M109 Pandas and Matplotlib: a bundled small CSV (≤50 KB, source and license noted), table explorer, plots rendered by Pyodide.
- [ ] M110 `project-foundations` brief, rubric and checklist.

## Thread 5: ML Mathematical Foundations (`ml/math`, 11 entries; `matrix-multiplication` already done)
- [x] M201 to M203 scalars-vectors, dot-product, matrices (VectorPlane, transpose visualizer).
- [x] M204 `tensors`: shape builder, reshape/transpose/batch dimension visual.
- [ ] M205 to M206 derivatives (tangent slider, numerical vs analytic derivative), gradients and the chain rule (computation-graph step-through with computed local gradients).
- [ ] M207 to M208 probability (sampling simulator with a seeded RNG, so results are reproducible), statistics (correlation vs causation with a confounder toggle).
- [ ] M209 `loss-optimization` using GradientDescent1D plus a 2-D contour version.
- [ ] M210 `project-math`.

## Thread 6: ML Classical (`ml/classical`, 12 entries)
- [ ] M301 to M303 cleaning, EDA (Pyodide on the bundled dataset), features and scaling (distance changes under scaling).
- [ ] M304 splits and leakage visualizer (a leakage toggle shows the inflated score, computed).
- [ ] M305 linear regression (slope/intercept sliders, residuals, MSE, closed form vs GD). M306 logistic regression (2-D decision boundary trained in TypeScript).
- [ ] M307 trees and ensembles (Gini split search computed on a toy dataset, forest voting). M308 k-means step-through and PCA projection.
- [ ] M309 to M311 fit and regularization (polynomial degree and λ, train vs validation curves), cross-validation, metrics (threshold → confusion matrix, precision/recall, ROC curve).
- [ ] M312 `project-classification`.

## Thread 7: ML Deep Learning (`ml/deep`, 11 entries)
- [ ] M401 to M403 neurons and activations, forward propagation (NNDiagram: selecting a layer highlights its code), backpropagation (a computed gradient-flow step-through on a 2-2-1 net, checked against numerical gradients in tests).
- [ ] M404 to M405 optimizers race (SGD, momentum, Adam on a 2-D surface), training loop (a tiny MLP trained live in TypeScript; lr, batch and epoch controls; loss curve).
- [ ] M406 `pytorch-basics`: annotated PyTorch (current stable docs cited), a simulated trace with the badge, and the TypeScript equivalent run live.
- [ ] M407 to M410 tokenization (toy BPE, computed), embeddings (2-D map, cosine), attention (Q/K/V computed on small matrices, heatmap, selecting a token), transformers (block diagram with shapes).
- [ ] M411 `project-neural-net`.

## Thread 8: ML Practice and Projects (`ml/practice`, `ml/projects`, 11 entries)
- [ ] M501 to M506 experiment tracking, tuning (a search visualizer on a known function), versioning (lineage FlowDiagram), ablations, model testing, GPU training (throughput model labeled as an estimate with its formula; link to the inference track).
- [ ] M601 to M605 five capstone briefs with milestones, rubric, hints, local-run instructions (pinned versions, official docs) and self-assessment checklists.

## Thread 9: Data Engineering flagship (3 lessons)
- [x] D001 `data/relational/joins-indexes`: a join visualizer with SQL linked to the result rows, implemented in TypeScript over small tables. Index vs full-scan step-through counting rows touched (computed). Optional: real SQL via sql.js only if justified in the plan's decision log.
- [x] D002 `data/etl/etl-vs-elt`: FlowDiagram pipeline, inject a bad record, validation rules, a quarantine path, ETL vs ELT placement of the transform step.
- [x] D003 `data/processing/batch-vs-stream`: an event-time simulator (tumbling windows, watermark, late events), batch vs stream latency and completeness, computed.
- [x] D004 Fill objectives and prerequisites for all 9 outline lessons in this track.

## Thread 10: AI Engineer flagship (3 lessons)
- [ ] A001 `ai/representations/tokens-embeddings`: a tokenizer playground and similarity search over a bundled precomputed embedding table. Generate it offline with a named small open model, record the model and version, keep it ≤300 KB, and commit the generation script.
- [ ] A002 `ai/rag/rag-pipeline`: chunking controls (size and overlap), real cosine retrieval over the bundled embeddings, a reranking step, prompt assembly shown verbatim, and generation shown as a labeled simulated response.
- [ ] A003 `ai/agents/tool-calling`: an agent loop step-through. Model turns are a scripted, labeled trace, while tool execution (calculator, doc search) really runs in the browser. Includes a failure and retry case.
- [ ] A004 Fill objectives and prerequisites for all 10 outline lessons, including the "train vs fine-tune vs pretrained vs API" distinction in `ai-landscape`'s objectives.

## Thread 11: Inference Engineer flagship (3 lessons)
- [ ] I001 `inference/memory/memory-estimation`: an estimator for parameters × bytes(precision) + KV cache (layers × 2 × heads × head_dim × seq × batch × bytes) + an activation estimate. Every term is explained, model presets come with cited configs, and the results are labeled estimates.
- [ ] I002 `inference/precision/precision-quantization`: a bit-layout explorer (FP32, FP16, BF16, INT8) and real quantize/dequantize of a weight vector with an error histogram (computed, symmetric and asymmetric, per-tensor vs per-channel).
- [ ] I003 `inference/throughput/batching-throughput`: a discrete-event queueing simulator (seeded) for arrival rate, max batch and max wait, giving p50/p95 latency and throughput. The service-time model is stated explicitly and labeled as a model.
- [ ] I004 Fill objectives and prerequisites for all 11 outline lessons.

## Thread 12: Verification and polish
**Reads**: spec.md (Success Criteria, Edge Cases), constitution, tasks.md.
- [ ] Q001 Run the full crawl, axe and e2e at 360, 390, 768, 1280 and 1600px, then fix what fails.
- [ ] Q002 Content audit: every written lesson against the constitution's accuracy rules (definitions on first use, shapes stated, labels on simulated or estimated values, references with versions). Fix or list the issues.
- [ ] Q003 Prerequisite coherence across tracks, glossary coverage (every `concepts` entry exists), and the search quality spot check (10 queries).
- [ ] Q004 Performance: bundle budget, lazy chunks, and Pyodide loading only on demand.
- [ ] Q005 Remove dead code and unused dependencies, confirm no placeholder buttons remain, update the README. Final review: screenshots and a preview publish.
