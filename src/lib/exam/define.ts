import type { ExamQuestion } from './types';

/** Compact constructor for exam items, so content files stay readable. */
export function q(
  id: string,
  domain: string,
  prompt: string,
  options: string[],
  answer: number[],
  explain: string,
): ExamQuestion {
  return { id, domain, prompt, options, answer, explain };
}
