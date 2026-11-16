import { shuffleItems } from '../quiz';
import type { ExamDef, ExamQuestion, HandsOnTask } from './types';

/** One sitting of the multiple-choice exam. Answers are stored as indexes into the original options. */
export interface Attempt {
  seed: string;
  startedAt: number;
  /** Question ids in the order this attempt shows them. */
  order: string[];
  /** For each question, the original option indexes in display order. */
  optionOrder: Record<string, number[]>;
  answers: Record<string, number[]>;
  flagged: string[];
  submittedAt?: number;
}

const MS_PER_MINUTE = 60_000;
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];

const shuffledIndexes = (n: number, seed: string): number[] =>
  shuffleItems(
    Array.from({ length: n }, (_, i) => String(i)),
    seed,
  ).map(Number);

/** Starts a sitting: question order and option order are shuffled from the seed, so position never gives the answer away. */
export function startAttempt(exam: ExamDef, seed: string, now: number): Attempt {
  const qs = exam.questions;
  const order = shuffledIndexes(qs.length, `${seed}:order`).map((i) => qs[i]!.id);
  const optionOrder: Record<string, number[]> = {};
  for (const item of qs) optionOrder[item.id] = shuffledIndexes(item.options.length, `${seed}:${item.id}`);
  return { seed, startedAt: now, order, optionOrder, answers: {}, flagged: [] };
}

export const isMulti = (item: ExamQuestion) => item.answer.length > 1;

/** Picks an option: replaces the choice for single-answer items, toggles it for "choose N" items (capped at N). */
export function choose(attempt: Attempt, item: ExamQuestion, option: number): Attempt {
  if (attempt.submittedAt !== undefined) return attempt;
  const current = attempt.answers[item.id] ?? [];
  let next: number[];
  if (!isMulti(item)) next = [option];
  else if (current.includes(option)) next = current.filter((o) => o !== option);
  else if (current.length >= item.answer.length) return attempt;
  else next = [...current, option];
  return { ...attempt, answers: { ...attempt.answers, [item.id]: next } };
}

export function toggleFlag(attempt: Attempt, id: string): Attempt {
  const flagged = attempt.flagged.includes(id)
    ? attempt.flagged.filter((f) => f !== id)
    : [...attempt.flagged, id];
  return { ...attempt, flagged };
}

export const submit = (attempt: Attempt, now: number): Attempt =>
  attempt.submittedAt !== undefined ? attempt : { ...attempt, submittedAt: now };

/** Milliseconds left, never below zero. */
export function timeLeft(attempt: Pick<Attempt, 'startedAt'>, minutes: number, now: number): number {
  return Math.max(0, attempt.startedAt + minutes * MS_PER_MINUTE - now);
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** All-or-nothing, like the real exams: a "choose two" item scores only when both picks are right. */
export function isCorrect(item: ExamQuestion, chosen: number[] | undefined): boolean {
  if (!chosen || chosen.length !== item.answer.length) return false;
  return item.answer.every((a) => chosen.includes(a));
}

export interface DomainScore {
  id: string;
  title: string;
  correct: number;
  total: number;
}

export interface ExamResult {
  correct: number;
  total: number;
  answered: number;
  percent: number;
  passed: boolean;
  byDomain: DomainScore[];
  wrong: string[];
}

export function gradeAttempt(exam: ExamDef, attempt: Attempt): ExamResult {
  const byDomain = new Map<string, DomainScore>(
    exam.domains.map((d) => [d.id, { id: d.id, title: d.title, correct: 0, total: 0 }]),
  );
  let correct = 0;
  let answered = 0;
  const wrong: string[] = [];
  for (const item of exam.questions) {
    const chosen = attempt.answers[item.id];
    if (chosen && chosen.length > 0) answered++;
    const ok = isCorrect(item, chosen);
    const d = byDomain.get(item.domain)!;
    d.total++;
    if (ok) {
      correct++;
      d.correct++;
    } else wrong.push(item.id);
  }
  const total = exam.questions.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
  return {
    correct,
    total,
    answered,
    percent,
    passed: percent >= exam.passPercent,
    byDomain: [...byDomain.values()],
    wrong,
  };
}

/** "(Choose two.)" in the prompt must match the number of correct options. */
export function chooseCount(prompt: string): number {
  const m = /\(Choose (\w+)\.\)/.exec(prompt);
  if (!m) return 1;
  const n = NUMBER_WORDS.indexOf(m[1]!.toLowerCase());
  return n > 0 ? n : Number(m[1]);
}

/** Points earned on a hands-on task from the names of the checks that passed. */
export function taskScore(task: HandsOnTask, passed: string[]): number {
  return task.checks.filter((c) => passed.includes(c.name)).reduce((sum, c) => sum + c.points, 0);
}

export const taskPoints = (task: HandsOnTask) => task.checks.reduce((sum, c) => sum + c.points, 0);
