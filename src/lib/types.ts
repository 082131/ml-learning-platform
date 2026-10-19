// Content types shared by every thread. Change only additively (see data-model.md).

export type TrackId = 'ml' | 'data' | 'ai' | 'inference';
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
  language: 'python' | 'sql' | 'bash' | 'json' | 'typescript';
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
