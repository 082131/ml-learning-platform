import type { HandsOnTask } from '../exam/types';
import type { TrackId } from '../types';

/** A role's question bank, or the behavioral round every loop has. */
export type RoleId = TrackId | 'behavioral';
export type QuestionKind = 'technical' | 'system-design' | 'behavioral';
/** `core` is asked at every level; `senior` expects trade-offs, numbers and production judgment. */
export type QuestionLevel = 'core' | 'senior';

/** One interview question with the answer an interviewer hopes to hear. */
export interface InterviewQuestion {
  id: string;
  role: RoleId;
  kind: QuestionKind;
  level: QuestionLevel;
  topic: string;
  prompt: string;
  /** A model answer, as you would say it. Plain text with `code` spans, paragraphs separated by blank lines. */
  answer: string;
  /** The points an interviewer listens for. */
  covers: string[];
  /** Things weak answers do. */
  redFlags: string[];
  /** What the interviewer is likely to ask next. */
  followUps: string[];
}

export interface RoleInfo {
  id: RoleId;
  /** Short label for filter chips. */
  chip: string;
  title: string;
  /** Which rounds this role's loop usually has. */
  loop: string;
}

/** A timed coding screen: a few tasks, one clock, graded by hidden checks. */
export interface ScreenDef {
  id: string;
  role: TrackId;
  title: string;
  /** What kind of real interview round this imitates. */
  summary: string;
  minutes: number;
  passPercent: number;
  tasks: HandsOnTask[];
}

export interface InterviewSource {
  title: string;
  url: string;
  /** What this source informed. */
  used: string;
}
