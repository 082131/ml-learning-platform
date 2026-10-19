# Data Model

These are the TypeScript shapes every thread builds against. They live in `src/lib/types.ts` (content types) and `src/lib/progress/schema.ts` (stored state). Change them only additively. A breaking change needs a Decision log entry in plan.md.

## Curriculum
```ts
type TrackId = 'ml' | 'data' | 'ai' | 'inference';
type Level = 'beginner' | 'intermediate' | 'advanced';
type LessonStatus = 'written' | 'outline';

interface Track {
  id: TrackId;
  title: string;             // "Machine Learning Engineer"
  code: string;              // "T.01", used in the mono labels
  summary: string;           // One sentence
  chapters: Chapter[];
}
interface Chapter {
  id: string;                // "math" (unique within track)
  title: string;
  level: Level;
  lessons: LessonRef[];
  project?: string;          // Lesson ID of the chapter project
}
interface LessonRef { id: string; status: LessonStatus; }   // Global ID: "ml/math/matrices"

interface LessonMeta {
  id: string;                // Must equal its folder path under content/tracks
  title: string;
  level: Level;
  minutes: number;           // Honest reading and doing estimate
  objectives: string[];      // "By the end you can..." phrased as abilities
  prerequisites: string[];   // Lesson IDs. Validated to exist and to have no cycles
  concepts: string[];        // Glossary term IDs introduced or used (for search and links)
  kind: 'lesson' | 'project' | 'capstone';
  references?: { title: string; url: string; version?: string }[];
}
```

## Code examples and annotations
```ts
type AnnotationKind = 'syntax' | 'variable' | 'function' | 'parameter' | 'math' | 'framework';

interface Annotation {
  id: string;
  range: { line: number; startCol?: number; endCol?: number }; // Whole line if cols are omitted. Line is 1-based, cols are 0-based with end exclusive
  match?: string;            // Must equal the source slice (drift guard, tested)
  kind: AnnotationKind;
  title: string;             // "np.dot(A, B)"
  what: string;              // What it does
  why: string;               // Why it is needed here
  inputs?: string;           // "A: shape (2, 3), B: shape (3, 2)"
  output?: string;           // "Returns shape (2, 2)" or the state change
}

interface CodeExample {
  id: string;
  language: 'python' | 'sql' | 'bash' | 'json' | 'typescript';
  source: string;            // May contain {{slot}} placeholders
  slots?: Record<string, (state: unknown) => string>;   // Filled from experiment state
  annotations: Annotation[];
  stages?: { id: string; title: string; source: string; note: string }[]; // ProgressiveCode
  run?: 'pyodide' | 'none';  // Default 'none'
  expectedOutput?: string;   // Shown and explained. For pyodide, real output replaces it
}
```

## Traces (step-through)
```ts
type TraceSource = 'computed' | 'pyodide' | 'simulated';
interface TraceStep {
  range: Annotation['range'];   // Active code
  vars: Record<string, TraceValue>;
  note: string;                 // Plain-language description of this step
  highlight?: Record<string, number[][]>; // For example the matrix cells involved: {A: [[0,0],[0,1]]}
}
type TraceValue = { kind: 'scalar'; value: number } | { kind: 'array'; shape: number[]; data: number[] | number[][] }
               | { kind: 'text'; value: string };
interface Trace { source: TraceSource; steps: TraceStep[]; }   // source is REQUIRED. 'simulated' renders a badge
```

## Experiments (shared state between visualization and code)
```ts
interface ExperimentDef<S, R> {
  id: string;
  initial: S;
  controls: Control<S>[];     // slider | number | matrix-cell | select | text
  compute: (s: S) => R;       // Pure. Unit-tested against a hand-worked example
  trace?: (s: S) => Trace;
}
```
The visualization component, the `CodeExample.slots`, and the result readout all receive the same `(state, result)`.

## Assessment
```ts
type QuizQuestion =
  | { id: string; type: 'choice'; prompt: string; options: { text: string; correct: boolean; explain: string }[] }
  | { id: string; type: 'numeric'; prompt: string; answer: number; tolerance: number; hint: string; explain: string }
  | { id: string; type: 'order'; prompt: string; items: string[]; explain: string };   // items are listed in the correct order

interface Exercise {
  id: string;
  prompt: string;            // MDX string allowed
  starter?: string;
  hints: string[];           // Revealed one at a time
  solution: string;
  explanation: string;
  tests?: string;            // Python assert code, run in Pyodide against the learner's code
}

interface ProjectBrief {
  goal: string; dataset: string; milestones: string[];
  rubric: { criterion: string; detail: string }[]; hints: string[];
}
```

## Glossary
```ts
interface GlossaryTerm { id: string; term: string; short: string; long?: string; introducedIn: string; aliases?: string[]; }
```

## Stored progress (localStorage key `mlp:v1`)
```ts
interface ProgressState {
  schema: 1;
  completed: Record<string, string>;          // lessonId → ISO date
  quiz: Record<string, { correct: boolean; attempts: number }>; // `${lessonId}#${qid}`
  exercises: Record<string, { revealed: boolean; passed?: boolean }>;
  projects: Record<string, boolean[]>;        // Checklist state per project lesson
  bookmarks: string[];
  recent: string[];                           // Last 10 viewed lesson IDs
  theme: 'system' | 'light' | 'dark';
}
```
Unknown or corrupt data: try `migrate(raw)`. On failure, keep a backup under `mlp:backup`, reset, and show a notice.

## Lesson component registry (only these may appear in MDX)
`<Section kind="intuition|technical|visual|code|experiment|mistakes|practice|check|exercise|summary">`, `<Term id>`, `<Callout kind="note|warning|simplification">`, `<Code example>`, `<StepThrough example>`, `<ProgressiveCode example>`, `<Experiment def viz>`, `<KnowledgeCheck questions>`, `<MiniExercise exercise>`, `<CommonMistake>`, `<Project brief>`, `<Math>` (via remark-math), and named visualization components registered in `src/mdx-components.tsx`.
