# ML Learning Platform Constitution

The rules every thread follows when building this project. When a spec, plan or task conflicts with this file, this file wins.

## Core Principles

### I. Learning Value Over Surface
Every screen, component and interaction must help the learner understand something. No marketing sections, logo walls, decorative animations, fake metrics, or buttons that do nothing. A lesson that is outlined but not yet written says so plainly ("Outline only") and shows its objectives and prerequisites; it never shows filler text.

### II. Accuracy Is Non-Negotiable
- Never fabricate benchmarks, timings, memory numbers or claims that code ran. Numbers shown are either computed live in the browser from the visible inputs, produced by real execution (Pyodide), or labeled as an estimate with the formula shown.
- Anything that looks like execution but is not (a precomputed trace of PyTorch code, for example) carries a visible **Simulated trace** label.
- Version-sensitive facts (library APIs, runtime flags) cite the official documentation, with the version, in the lesson's references.
- Define every term and abbreviation on first use, state tensor shapes explicitly, show intermediate calculations, and separate conceptual simplifications from production behavior.

### III. One Source of Truth Between Visuals and Code
A visualization and the code beside it read from the same state object. Changing a matrix cell, learning rate or batch size changes the computation, the plot, and the displayed values together. Visual-only changes that don't touch the computation are not allowed.

### IV. Content Is Data, Presentation Is Components
- Lessons are MDX files plus typed metadata. They compose a fixed set of registered components; they never contain layout markup or one-off styling.
- Code explanations use structured annotations (line and column ranges with typed kinds), never regex or substring matching over source.
- Adding a lesson means adding files under `content/`, with no app code changes, unless the lesson needs a new visualization.

### V. Pure, Tested Logic
All math, ML calculations, simulations, trace generation and progress logic live in pure TypeScript modules under `src/lib/` with unit tests. Components stay thin: they render state and dispatch input. A feature is not done until its tests pass and it has been checked in a real browser (Playwright).

### VI. Test Every Feature When It Is Finished
Each task ends with its tests passing, `npm run check` (typecheck, lint, unit tests) green, and the affected route verified in Playwright, including a 390px-wide viewport. A thread does not start the next task while the current one is red.

### VII. Simplicity and Justified Dependencies
Static site, no backend, no accounts, no database. Every runtime dependency is listed in `plan.md` with its reason. Don't add a dependency for something a small function can do. No giant components (keep components under ~200 lines), no dead code, and named constants instead of magic numbers.

### VIII. Accessible by Default
Everything reachable by keyboard, with visible focus. Hover is never the only way to get information: every hover explanation is also available on click or focus. Text contrast meets WCAG AA in both themes, `prefers-reduced-motion` is respected, and visualizations have a text or table alternative for their key values.

### IX. Token Discipline
Threads read `CLAUDE.md`, this file and their own brief in `tasks.md`, then only the files they need. They don't re-plan decisions recorded in `plan.md`. If a decision must change, record it in `plan.md` under "Decision log" with the reason.

## Governance
Amend this file only with the user's agreement, recording the change and date below. Version: 1.0.0, ratified 2026-10-19.
