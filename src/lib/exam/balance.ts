import type { ExamQuestion } from './types';

// Guards against the classic giveaway of written exams: the longest (or most hedged) option being the answer.
// Every exam must pass these checks in the unit tests.

/** The correct option may be at most this much longer or shorter than the average distractor. */
export const MAX_LENGTH_RATIO = 1.3;
export const MIN_LENGTH_RATIO = 0.75;
/** Across an exam, how often the single correct option may be the strictly longest or shortest option. */
export const MAX_EXTREME_SHARE = 0.36;
export const MIN_EXTREME_SHARE = 0.1;

const BANNED = [/all of the above/i, /none of the above/i, /both [a-d] and [a-d]/i];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export interface BalanceReport {
  /** Single-answer items where the correct option is strictly the longest. */
  longestShare: number;
  shortestShare: number;
  issues: string[];
}

export function lengthRatio(item: ExamQuestion): number {
  const right = item.answer.map((i) => item.options[i]!.length);
  const wrong = item.options.filter((_, i) => !item.answer.includes(i)).map((o) => o.length);
  return mean(right) / mean(wrong);
}

export function analyzeBalance(items: ExamQuestion[]): BalanceReport {
  const issues: string[] = [];
  let longest = 0;
  let shortest = 0;
  let single = 0;
  for (const item of items) {
    const ratio = lengthRatio(item);
    if (ratio > MAX_LENGTH_RATIO || ratio < MIN_LENGTH_RATIO)
      issues.push(`${item.id}: correct option is ${ratio.toFixed(2)}× the average distractor length`);
    for (const o of item.options)
      if (BANNED.some((b) => b.test(o))) issues.push(`${item.id}: avoid "${o}" style options`);
    if (item.answer.length !== 1) continue;
    single++;
    const right = item.options[item.answer[0]!]!.length;
    const others = item.options.filter((_, i) => i !== item.answer[0]).map((o) => o.length);
    if (others.every((l) => right > l)) longest++;
    if (others.every((l) => right < l)) shortest++;
  }
  const longestShare = single ? longest / single : 0;
  const shortestShare = single ? shortest / single : 0;
  if (longestShare > MAX_EXTREME_SHARE)
    issues.push(`correct option is the longest in ${(longestShare * 100).toFixed(0)}% of items`);
  if (longestShare < MIN_EXTREME_SHARE)
    issues.push(`correct option is almost never the longest (${(longestShare * 100).toFixed(0)}%)`);
  if (shortestShare > MAX_EXTREME_SHARE)
    issues.push(`correct option is the shortest in ${(shortestShare * 100).toFixed(0)}% of items`);
  if (shortestShare < MIN_EXTREME_SHARE)
    issues.push(`correct option is almost never the shortest (${(shortestShare * 100).toFixed(0)}%)`);
  return { longestShare, shortestShare, issues };
}
