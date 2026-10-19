# Writing a lesson (for content threads 4 to 11)

The model lesson is `content/tracks/ml/math/matrix-multiplication/`. Copy its shape, not its words. Open it at
`#/learn/ml/math/matrix-multiplication` while you read this.

## 1. Files in a lesson folder

| File | What goes in it |
|---|---|
| `meta.ts` | Title, level, honest minutes, 3 to 5 objectives phrased as abilities, prerequisites as full IDs, `concepts` (glossary IDs), and `references` with a `version` for anything version-sensitive. References render at the end of the lesson. |
| `index.mdx` | Prose and registered components only. One `<Section kind="...">` per part, in the fixed order: intuition, technical, visual, code, experiment, mistakes, practice, check, exercise, summary. Leave a part out when it doesn't fit. |
| `code.ts` | Code examples (`CodeExample`), the experiment definition, and fixed data. No logic beyond wiring: math lives in `src/lib/`. |
| `quiz.ts` | `QuizQuestion[]` and `Exercise` objects. Every wrong option has an `explain` that says why it is wrong. |

Then set the lesson's status to `'written'` in `content/curriculum.ts`.

## 2. How the model lesson is built

- **One experiment, several views.** `code.ts` exports `experiment = matmulExperiment('matmul', A, B, 'matmul-loop')`.
  The lesson renders `<Experiment def={experiment}>` three times (Visual, Code, Experiment sections). Blocks with
  the same `def.id` on a page share one state, so editing a cell in the Visual section changes the code literals
  and the step-through further down. Show the controls once; pass `controls={false}` to the other views.
- **Inside an `<Experiment>`**: a visualization (it reads `(state, result)` through `useExperimentContext`),
  `<Code>` with `{{slot}}` literals filled from state, `<StepThrough>` (it takes `def.trace(state)` when its
  example's id equals `def.traceExample`), and `<Readout />` (it renders `def.readout(state, result)`).
- **Traces** are pure builders in `src/lib/trace/` (`buildMatMulTrace`) with a unit test against a hand-worked
  example and `validateTrace` against the filled source. Python keeps loop variables after a loop ends, so a trace
  must too.
- **Code outside an experiment** has no slots (static `<Code>`, `<ProgressiveCode>`, `<PythonRunner>`).
  Slotted code outside an experiment would show the raw `{{A}}` template.
- **Experiment factories** that other lessons may reuse go in `src/lib/<area>/` (see `matmulExperiment`,
  `gradientDescentExperiment`). `validateExperiment` runs on every exported def during `npm run check`.

## 3. Accuracy (constitution II), with the habits that made the model lesson pass

- Run every code sample and copy outputs and error messages from the real run. NumPy 2.5.3 and Python 3.13 are
  installed in the build container (`python3 -c "import numpy"`). Note the versions in a comment in `code.ts`.
  Pyodide in the browser is 314.0.7 (Python 3.14, NumPy 2.4.6).
- Numbers in prose must be checkable: write the arithmetic (`4·7 + 5·9 + 6·11 = 139`), and keep the same example
  values across sections.
- A value that claims to be what a library prints needs a test against the real output (see
  `formatNumpyIntMatrix` and its test).
- Simulated traces use `source: 'simulated'`; estimates carry an "Estimate" badge and their formula.
- Define every term on first use with `<Term id>` (missing IDs log a console error and fail the crawl test), state
  shapes explicitly, and put production caveats in `<Callout kind="simplification">`.

## 4. Components you can use

Core: `Section`, `Callout`, `Term`, `Code`, `StepThrough`, `ProgressiveCode`, `PythonRunner`, `KnowledgeCheck`,
`MiniExercise`, `CommonMistake`, `Project`, `Experiment`, `Readout`.
Visualizations (thread 3): `LineChart`, `BarCompare`, `FlowDiagram`, `MatMulGrid`, `VectorPlane`,
`GradientDescent1D`. The demo page `#/dev/viz` shows each one with sample data; `#/dev/components` shows the code
components.

Building a new visualization:

1. Pure logic in `src/lib/<area>/` with a unit test against a hand-worked example.
2. The component in `src/components/viz/<Name>/<Name>.tsx`, wrapped in `VizFrame` (title, dotted canvas, a
   table alternative, a caption with the key values). Reuse `Axes`, `Grid`, `Arrow`, `LineChart`, `MatrixGrid`.
   Colors come from tokens (`svg.module.css` tone classes); status is never color alone.
3. Register it by adding `src/components/viz/<Name>/mdx.ts` with `export default { Name };`. Do **not** edit
   `src/mdx-components.tsx`: it picks up every `mdx.ts` and fails on duplicate names.
4. Keyboard: every drag also works with arrow keys; every hover also works on focus or click.
5. An e2e assertion that changing an input changes the output.

## 5. Tests to add per lesson

- Unit tests for every new `src/lib` function (hand-worked numbers in the test).
- `npm run check` validates `code.ts` (annotation ranges and `match`, slots, experiment defs) and `quiz.ts`.
- `tests/e2e/<track>-<lesson>.spec.ts`, modeled on `tests/e2e/matmul-lesson.spec.ts`: change an input and assert
  that the visual, the code literal, the trace and the readout agree; axe in both themes; no horizontal scroll.
  Both the desktop and phone projects run it.
- Python e2e tests are tagged `@network`. Offline, extract the pinned `pyodide` npm package
  (`npm pack pyodide@314.0.7`) and set `PYODIDE_DIR` to its `package/` folder.

## 6. Working in parallel without conflicts

Each content thread owns these paths outright: its chapter folders under `content/tracks/`, its
`src/components/viz/<Name>/` folders, its `src/lib/<area>/` files, and its own e2e spec files. Nobody else edits
them.

| Shared file | Rule |
|---|---|
| `content/glossary.ts` | Don't edit. Put new terms in your chapter's `content/tracks/<track>/<chapter>/glossary.ts` (default export: an array). They are merged automatically, and duplicate IDs fail validation. |
| `src/mdx-components.tsx` | Don't edit. Register visualizations with an `mdx.ts` file (section 4). |
| `content/curriculum.ts` | Only change the `status` of your own lessons, one line each. Edits on different lines merge cleanly. |
| `src/lib/types.ts` | Additive only, and only when unavoidable. Append at the end of the file under a comment naming your thread. |
| `package.json` / lockfile | Avoid new dependencies (constitution VII). If you must add one, record it in plan.md and, after a rebase conflict, take main's lockfile and run `npm install <pkg>` again. |
| `specs/.../plan.md` | Append decision-log lines at the end. On a conflict keep both sides. |
| `specs/.../tasks.md` | Tick only your own task lines. |
| Thread 1 to 3 components | Change only to fix a bug, keep the change backwards compatible, add a test, and say so in your reply. |

Merging (from plan.md): work in a local clone, then
`git fetch origin main && git rebase origin/main`, re-run `npm run check`, `npm run e2e` and `npm run build`, and
fast-forward the shared repo. If main moved meanwhile, repeat the rebase.

## 7. Gotchas

- Prettier skips `*.mdx` (it splits lines that start with a component into new paragraphs). Format MDX by hand.
- In MDX, `{` starts a JavaScript expression. Use math mode (`$...$`) or code spans for braces in prose.
- Code annotation columns count Unicode code points, are 0-based and end-exclusive; column ranges on one line
  may not overlap. Slot values must be single-line.
- Vitest's file-system module cache is off (`fsModuleCache: false`) because it kept stale `import.meta.glob`
  results when lesson files were added.
- KaTeX's CSS must come from the same version that `rehype-katex` uses (0.16.x); a mismatch breaks subscripts.
