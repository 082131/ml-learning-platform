import type { TrackId } from '../types';

/** One multiple-choice exam item. Single answer when `answer` has one index, "choose N" otherwise. */
export interface ExamQuestion {
  id: string;
  domain: string;
  prompt: string;
  options: string[];
  /** Indexes into `options` of every correct option. */
  answer: number[];
  /** Why the answer is right and why the tempting distractors are wrong. */
  explain: string;
}

export interface ExamDomain {
  id: string;
  title: string;
  /** Number of questions from this domain (the domains add up to the exam's question count). */
  count: number;
  /** Which certification objectives this domain maps to. */
  maps: string;
}

export interface Certification {
  name: string;
  vendor: string;
  url: string;
  /** Format facts from the official exam guide. */
  format: string;
}

/** One automatically graded check of a hands-on task. `tests` are assert statements run after the learner's code. */
export interface HandsOnCheck {
  name: string;
  points: number;
  tests: string;
}

export interface HandsOnTask {
  id: string;
  title: string;
  domain: string;
  /** What to build. Plain text with `code` spans, paragraphs separated by blank lines. */
  brief: string;
  starter: string;
  solution: string;
  checks: HandsOnCheck[];
}

export interface ExamDef {
  track: TrackId;
  title: string;
  /** What the exam is modeled on, in one sentence. */
  summary: string;
  certifications: Certification[];
  domains: ExamDomain[];
  minutes: number;
  passPercent: number;
  questions: ExamQuestion[];
  handsOn: { minutes: number; passPercent: number; tasks: HandsOnTask[] };
}
