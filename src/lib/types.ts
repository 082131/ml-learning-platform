// Content types shared by every thread. Change only additively (see data-model.md).

export type TrackId = 'ml' | 'data' | 'ai' | 'inference' | 'python' | 'dataops' | 'deploy';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type LessonStatus = 'written' | 'outline';

export interface Track {
  id: TrackId;
  title: string;
  code: string;
  summary: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  level: Level;
  lessons: LessonRef[];
  project?: string;
}

export interface LessonRef {
  id: string;
  status: LessonStatus;
}

export interface LessonMeta {
  id: string;
  title: string;
  level: Level;
  minutes: number;
  objectives: string[];
  prerequisites: string[];
  concepts: string[];
  kind: 'lesson' | 'project' | 'capstone';
  references?: { title: string; url: string; version?: string }[];
}

export type AnnotationKind = 'syntax' | 'variable' | 'function' | 'parameter' | 'math' | 'framework';

export interface CodeRange {
  line: number;
  startCol?: number;
  endCol?: number;
}

export interface Annotation {
  id: string;
  range: CodeRange;
  match?: string;
  kind: AnnotationKind;
  title: string;
  what: string;
  why: string;
  inputs?: string;
  output?: string;
}

export interface CodeExample {
  id: string;
  language: 'python' | 'sql' | 'bash' | 'json' | 'typescript' | 'yaml';
  source: string;
  slots?: Record<string, (state: unknown) => string>;
  annotations: Annotation[];
  stages?: { id: string; title: string; source: string; note: string }[];
  run?: 'pyodide' | 'none';
  expectedOutput?: string;
}

export type TraceSource = 'computed' | 'pyodide' | 'simulated';
export type TraceValue =
  | { kind: 'scalar'; value: number }
  | { kind: 'array'; shape: number[]; data: number[] | number[][] }
  | { kind: 'text'; value: string };

export interface TraceStep {
  range: CodeRange;
  vars: Record<string, TraceValue>;
  note: string;
  highlight?: Record<string, number[][]>;
}

export interface Trace {
  source: TraceSource;
  steps: TraceStep[];
}

export type QuizQuestion =
  | {
      id: string;
      type: 'choice';
      prompt: string;
      options: { text: string; correct: boolean; explain: string }[];
    }
  | {
      id: string;
      type: 'numeric';
      prompt: string;
      answer: number;
      tolerance: number;
      hint: string;
      explain: string;
    }
  | { id: string; type: 'order'; prompt: string; items: string[]; explain: string };

export interface Exercise {
  id: string;
  prompt: string;
  starter?: string;
  hints: string[];
  solution: string;
  explanation: string;
  tests?: string;
}

export interface ProjectBrief {
  goal: string;
  dataset: string;
  milestones: string[];
  rubric: { criterion: string; detail: string }[];
  hints: string[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  short: string;
  long?: string;
  introducedIn: string;
  aliases?: string[];
}

/** The fixed 12-part lesson structure, in teaching order (FR-003). */
export const SECTION_KINDS = [
  'objectives',
  'prerequisites',
  'intuition',
  'technical',
  'visual',
  'code',
  'experiment',
  'mistakes',
  'practice',
  'check',
  'exercise',
  'summary',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/** One input of an experiment. `get` reads the control's value from state; `set` returns the next state. */
export type Control<S> =
  | {
      kind: 'slider';
      id: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      get: (s: S) => number;
      set: (s: S, value: number) => S;
      format?: (value: number) => string;
    }
  | {
      kind: 'number';
      id: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      get: (s: S) => number;
      set: (s: S, value: number) => S;
    }
  | {
      /** An editable grid of numbers, for example a matrix. Cells accept integers only when `integer` is set. */
      kind: 'matrix-cell';
      id: string;
      label: string;
      min?: number;
      max?: number;
      integer?: boolean;
      get: (s: S) => number[][];
      set: (s: S, i: number, j: number, value: number) => S;
      /** Rows and columns to mark, for example the row of A that feeds the selected output cell. */
      highlight?: (s: S) => { rows?: number[]; cols?: number[] };
    }
  | {
      kind: 'select';
      id: string;
      label: string;
      options: { value: string; label: string }[];
      get: (s: S) => string;
      set: (s: S, value: string) => S;
    }
  | {
      kind: 'text';
      id: string;
      label: string;
      maxLength?: number;
      get: (s: S) => string;
      set: (s: S, value: string) => S;
    };

/** A readout line computed from state and result, for example `C[0][1] = 64`. Only computed values. */
export interface ReadoutItem {
  label: string;
  value: string;
  /** 'diverged' or 'error' values are labeled, not just colored. */
  status?: 'ok' | 'diverged' | 'error';
}

/** Shared state between a visualization, the code beside it and the readout (data-model.md, Experiments). */
export interface ExperimentDef<S, R> {
  id: string;
  initial: S;
  controls: Control<S>[];
  /** Pure. Unit-tested against a hand-worked example. */
  compute: (s: S) => R;
  trace?: (s: S) => Trace;
  /** The id of the code example `trace` steps through. StepThrough blocks for other examples ignore it. */
  traceExample?: string;
  readout?: (s: S, r: R) => ReadoutItem[];
  /** Where the readout's values come from, when not computed live: "recorded in CPython 3.13". */
  resultSource?: string;
}
