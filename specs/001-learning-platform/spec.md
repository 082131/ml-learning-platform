# Feature Specification: Interactive ML Learning Platform (Release 1)

**Feature Branch**: `001-learning-platform`
**Created**: 2026-10-19
**Status**: Draft, awaiting user confirmation
**Input**: The user's full brief in the project thread (four tracks, lesson structure, interactive code, visualizations, progression, design references in `design/reference/`).

## Interview decisions

The user asked Claude to decide the interview itself. These are the decisions, and every later document follows them.

| # | Question | Decision |
|---|----------|----------|
| Q1 | Stack | Static site built with Vite, React and TypeScript. No backend. |
| Q2 | Running code | Real calculations in TypeScript for math and ML experiments. Precomputed traces of framework code (PyTorch, Spark, ONNX) are labeled "Simulated trace". Optional in-browser Python (Pyodide, in a Web Worker) for Python, NumPy and Pandas lessons. |
| Q3 | Release 1 depth | All four tracks fully outlined. The ML Engineer track is written in full depth. Data, AI and Inference tracks each get 3 flagship lessons in full depth; their other lessons show as "Outline only". |
| Q4 | First track | Machine Learning Engineer. |
| Q5 | Learner level | Absolute beginner: no Python, no linear algebra, no statistics. |
| Q6 | Visual style | Adapt the reference images' technical Swiss style (see `design-system.md`) to a learning app, without the marketing parts. |
| Q7 | Theme | Light by default, with a dark mode. Follows the system setting until the user toggles it, and the choice is remembered. |
| Q8 | Review between threads | Each build thread ends with test results, screenshots at desktop and phone width, and a private preview link of the built site. The user approves before the next dependent thread starts. |
| Q9 | Hosting | No hosting decided for release 1. The build is a static `dist/` folder that can go to GitHub Pages, Netlify or similar later. The site uses hash routing, so it works on any static host without server rewrites. |

## User Scenarios & Testing

### User Story 1 - Learn a lesson end to end (Priority: P1) 🎯 MVP
A beginner opens the ML Engineer track, picks "Vectors and matrices", reads the intuition, explores an interactive matrix-multiplication visualization linked to code, steps through the computation, answers a knowledge check, tries the mini-exercise, and marks the lesson complete.

**Why this priority**: This is the core learning loop. Every other feature supports it.

**Independent Test**: Open `#/learn/ml/math/matrices`, change a matrix cell, and confirm that the code panel, the step-through trace and the result all update to the same values. Then answer the check and mark the lesson complete.

**Acceptance Scenarios**:
1. **Given** a lesson page, **When** the learner clicks a highlighted line of code, **Then** its explanation is pinned beside the code, the line stays highlighted, and pressing Escape or clicking again unpins it.
2. **Given** the matrix visualization, **When** the learner edits cell A[0][1], **Then** the product matrix, the Python snippet's literal values, and the current step's arithmetic all show the new value.
3. **Given** a knowledge-check question, **When** the learner picks a wrong answer, **Then** feedback explains why that answer is wrong, not just that it is.
4. **Given** a mini-exercise, **When** the learner has not attempted it, **Then** the solution stays hidden behind an explicit "Reveal solution" action.

### User Story 2 - Navigate the curriculum (Priority: P1)
The learner moves between four track pages, sees chapters grouped by level (beginner, intermediate, advanced), follows prerequisite links, and jumps freely to any lesson.

**Independent Test**: From the dashboard, open each of the four tracks, open a lesson, follow a prerequisite link, and use browser back. Every route renders without errors.

**Acceptance Scenarios**:
1. **Given** any track page, **Then** it shows chapters, lessons with level and status (Written or Outline only), and a progress indicator.
2. **Given** a lesson with prerequisites, **Then** each prerequisite links to its lesson and shows whether it is complete.
3. **Given** an outline-only lesson, **Then** it shows objectives and prerequisites and is clearly labeled, with no filler.

### User Story 3 - Track progress and resume (Priority: P1)
Lesson completion, quiz results, bookmarks and exercise attempts persist between visits in the browser. The dashboard shows progress per track and recommends next lessons.

**Independent Test**: Complete two lessons and bookmark one, reload the page, and confirm that progress, bookmarks and the recommendation survive. Clear the data from the settings and confirm it resets.

**Acceptance Scenarios**:
1. **Given** completed lessons, **When** the dashboard loads, **Then** each track shows "n of m written lessons complete" and a "Next up" lesson whose prerequisites are done.
2. **Given** storage is unavailable (private mode, quota), **Then** the app still works for the session and shows a one-line notice that progress won't be saved.
3. The settings page explains the limitation: progress lives in this browser only, isn't synced across devices, and is lost if site data is cleared. It offers Export and Import of progress as a JSON file.

### User Story 4 - Interactive code learning (Priority: P1)
Code blocks explain tokens, expressions and lines on hover, focus and click. Selected examples can be stepped through line by line with variable state shown. Progressive examples show stage-by-stage changes. Python lessons can run predefined or edited code in the browser.

**Independent Test**: On a lesson with annotated code, Tab to a token and confirm its explanation appears. Step forward and back through a trace and confirm the variables panel changes. Run a Pyodide example and confirm real output, or a clear error message if loading fails.

**Acceptance Scenarios**:
1. Annotation kinds are visually distinguishable: syntax, variable, function, parameter, math operation, framework API.
2. A step-through shows the active line, the variables in scope with shapes for arrays, and the change from the previous step.
3. A trace not produced by real execution shows a "Simulated trace" badge.
4. A Python run that exceeds the time limit (10 seconds by default) is stopped, and the learner is told why.

### User Story 5 - Experiment with visualizations (Priority: P2)
The learner changes parameters (learning rate, epochs, batch size, noise, matrix values, precision, input text) and sees the computation and plot respond.

**Independent Test**: In the gradient-descent lesson, raise the learning rate past the divergence point and confirm that the loss curve diverges and the displayed update arithmetic matches the plotted step.

### User Story 6 - Search, glossary and bookmarks (Priority: P2)
The learner searches across lesson titles, objectives, glossary terms and concepts, opens glossary definitions inline from lesson text, and keeps a bookmarks list.

**Independent Test**: Search "gradient" and confirm the results include lessons and the glossary term, reachable by keyboard. Click a glossary term in a lesson and confirm its definition appears with a link to the lesson that introduces it.

### User Story 7 - Projects and capstones (Priority: P3)
Each chapter can end with a project brief: goal, dataset, milestones, rubric and hints, with a self-assessed checklist that is saved. Capstones follow the same format.

### Edge Cases
- A lesson ID referenced as a prerequisite doesn't exist: the build fails (curriculum validation test).
- An annotation range is out of bounds for its code: the unit test fails, never a runtime crash.
- Pyodide fails to download (offline): the code still displays, the Run button reports "Python runtime couldn't load", and simulated or precomputed output (if provided) stays visible and labeled.
- A slider is set to an extreme value (learning rate 10, for example): the calculation stays numerically safe (NaN or Infinity is caught and shown as "diverged").
- Stored progress data is corrupted or from an older schema: it is migrated or reset with a notice, never a crash.
- Phone-width screen (390px): code and visualization stack vertically, the explanation panel becomes a bottom sheet, and there is no horizontal page scroll (code blocks scroll internally).

## Requirements

### Functional Requirements
- **FR-001**: The app MUST have four tracks (ML Engineer, Data Engineering, AI Engineer, Inference Engineer), each with chapters, lessons, levels, projects and a progress indicator.
- **FR-002**: The full curriculum outline in `curriculum.md` MUST be represented as data. Every lesson has an ID, title, level, objectives and prerequisites.
- **FR-003**: Lessons MUST use the 12-part teaching structure where it fits (objectives, prerequisites, intuition, technical explanation, visual, code walkthrough, experiment, common mistakes, practical application, knowledge check, mini-exercise, summary). Sections may be omitted when they don't fit.
- **FR-004**: Code annotations MUST be structured metadata (line and column ranges, kind, what, why, inputs, output or state change) and MUST be available by hover, keyboard focus and click-to-pin.
- **FR-005**: Step-through traces MUST be data (steps of active range, variables, note) generated either by a pure TypeScript function from the same inputs as the visualization, or by Pyodide, or precomputed and labeled simulated.
- **FR-006**: Experiments MUST recompute from shared state. Visualization, code literals and outputs come from one state object.
- **FR-007**: Progress (completions, quiz attempts, exercise reveals, project checklists, bookmarks, theme) MUST persist to localStorage under one versioned key, with export, import and reset.
- **FR-008**: Search MUST cover lessons (title, objectives, concept tags) and glossary terms, client-side.
- **FR-009**: The glossary MUST define each term, link the lesson that introduces it, and be usable inline from lessons.
- **FR-010**: The dashboard MUST show per-track progress, recently viewed lessons, bookmarks and recommended next lessons, where a recommendation is the first incomplete written lesson whose prerequisites are all complete.
- **FR-011**: Release 1 MUST include the ML track lessons written in full, and 3 written flagship lessons each for Data, AI and Inference (listed in `curriculum.md`).
- **FR-012**: Exercises MUST give specific feedback. Multiple-choice gives a per-option explanation. Numeric answers have a tolerance and a hint. Code exercises in Python lessons run hidden tests in Pyodide.
- **FR-013**: The UI MUST work in light and dark themes and at widths from 360px to 1600px.

### Key Entities
See `data-model.md`: Track, Chapter, LessonMeta, CodeExample, Annotation, Trace and TraceStep, Experiment, QuizQuestion, Exercise, Project, GlossaryTerm, ProgressState.

## Success Criteria
- **SC-001**: `npm run build` and `npm run check` pass with zero errors. The Playwright smoke suite passes on desktop (1280px) and phone (390px).
- **SC-002**: Every route in the curriculum renders without console errors (automated crawl).
- **SC-003**: Every written lesson passes content validation: objectives present, prerequisites resolve, annotations in range, quiz answers valid, glossary links resolve.
- **SC-004**: Every interactive visualization has a unit test showing that its computation matches a hand-computed example, and an e2e test showing that input changes the output.
- **SC-005**: Axe accessibility scan reports no serious or critical violations on the dashboard, a track page and three lesson pages.

## Assumptions
- One learner per browser. No accounts of our own. Since 2026-11-16, progress syncs across devices when the site is opened as a Claude artifact (see plan.md decisions); elsewhere it stays in the browser.
- Python execution happens only in the learner's own browser (Pyodide in a Web Worker). Nothing runs on a server.
- Framework-heavy code (PyTorch, Spark, ONNX Runtime, vLLM) is taught with real code the learner can run locally, plus labeled simulated traces and in-browser TypeScript re-implementations of the core math.
- Remaining Data, AI and Inference lessons are a release 2 effort, one thread per track, using the same components.
