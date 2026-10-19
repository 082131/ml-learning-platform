# ML Learning Platform: read this first

An interactive, static (no backend) learning site for ML, Data, AI and Inference engineering. Vite + React + TypeScript, with MDX lessons, localStorage progress, and optional Pyodide.

## Before you touch anything
1. `.specify/memory/constitution.md`: the rules (accuracy, labeled simulations, one source of truth, tests per feature).
2. `specs/001-learning-platform/tasks.md`: find **your thread's brief**. It lists which other spec files to read. Read only those.
3. `specs/001-learning-platform/plan.md` → "Working agreement": clone the repo to local disk, work on a branch, fast-forward merge back. Never run `npm install` inside `/mnt/project-files`.

## Map
- `specs/001-learning-platform/`: spec (what and why), plan (stack, structure, decisions), data-model (types), curriculum (every lesson ID), design-system (tokens and visual rules), tasks (thread briefs).
- `design/reference/`: the user's UI references.
- `content/`: lessons as data. `src/lib/`: pure tested logic. `src/components/`: UI. `src/mdx-components.tsx`: the only components lessons may use.

## Commands (once thread 1 lands)
`npm run dev` · `npm run check` (types, lint, unit) · `npm run e2e` (Playwright) · `npm run build`

## Spec Kit
Installed with the `specify` CLI (Claude integration). Skills live in `.claude/skills/speckit-*`. To change scope, update spec.md and plan.md first (`/speckit-specify`, `/speckit-plan`), then tasks.md.
