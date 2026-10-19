import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from '../types';
import { diffLines } from '../code/diff';
import {
  gradeChoice,
  gradeNumeric,
  gradeOrder,
  move,
  parseAnswer,
  shuffleItems,
  validateAssessment,
} from './index';

const choice: QuizQuestion = {
  id: 'q1',
  type: 'choice',
  prompt: 'Shape of A @ B for A (2, 3) and B (3, 4)?',
  options: [
    { text: '(2, 4)', correct: true, explain: 'Rows of A, columns of B.' },
    { text: '(3, 3)', correct: false, explain: 'The inner dimension 3 is summed away.' },
  ],
};
const numeric: QuizQuestion = {
  id: 'q2',
  type: 'numeric',
  prompt: 'p',
  answer: 0.5,
  tolerance: 0.01,
  hint: 'h',
  explain: 'e',
};
const order: QuizQuestion = {
  id: 'q3',
  type: 'order',
  prompt: 'p',
  items: ['load', 'clean', 'train'],
  explain: 'e',
};

describe('grading', () => {
  it('returns the chosen option’s own explanation', () => {
    expect(gradeChoice(choice as Extract<QuizQuestion, { type: 'choice' }>, 1)).toEqual({
      correct: false,
      explain: 'The inner dimension 3 is summed away.',
    });
  });

  it('grades numeric answers within the tolerance and flags non-numbers', () => {
    const q = numeric as Extract<QuizQuestion, { type: 'numeric' }>;
    expect(gradeNumeric(q, 0.505).correct).toBe(true);
    expect(gradeNumeric(q, 0.52).correct).toBe(false);
    expect(gradeNumeric(q, parseAnswer('0,5')).correct).toBe(true);
    expect(gradeNumeric(q, parseAnswer('half'))).toEqual({ correct: false, valid: false });
    expect(parseAnswer('  ')).toBeNaN();
  });

  it('grades order answers position by position', () => {
    const q = order as Extract<QuizQuestion, { type: 'order' }>;
    expect(gradeOrder(q, ['load', 'train', 'clean'])).toEqual({
      correct: false,
      positions: [true, false, false],
    });
    expect(gradeOrder(q, ['load', 'clean', 'train']).correct).toBe(true);
  });

  it('shuffles deterministically and never starts in the correct order', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(shuffleItems(items, 'lesson#q')).toEqual(shuffleItems(items, 'lesson#q'));
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      expect(shuffleItems(['x', 'y'], seed)).toEqual(['y', 'x']);
      expect(shuffleItems(items, seed).sort()).toEqual(items);
    }
  });

  it('moves list items and ignores moves past the ends', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    const list = ['a'];
    expect(move(list, 0, -1)).toBe(list);
  });
});

describe('validateAssessment', () => {
  it('accepts valid questions and reports broken ones', () => {
    expect(validateAssessment([choice, numeric, order], [])).toEqual([]);
    const errors = validateAssessment(
      [
        { ...choice, options: [{ text: 'x', correct: false, explain: '' }] } as QuizQuestion,
        { ...numeric, id: 'q1', tolerance: -1 } as QuizQuestion,
      ],
      [{ id: 'e1', prompt: 'p', hints: [], solution: 's', explanation: 'e' }],
    );
    expect(errors).toEqual([
      'q1: a choice question needs at least 2 options',
      'q1: no option is marked correct',
      'q1: every option needs an explanation (FR-012)',
      'duplicate question or exercise id "q1"',
      'q1: tolerance must be 0 or more',
      'e1: needs at least one hint',
    ]);
  });
});

describe('diffLines', () => {
  it('marks added, removed and unchanged lines with their line numbers', () => {
    expect(diffLines('a\nb\nc', 'a\nB\nc\nd')).toEqual([
      { type: 'same', text: 'a', oldLine: 1, newLine: 1 },
      { type: 'del', text: 'b', oldLine: 2 },
      { type: 'add', text: 'B', newLine: 2 },
      { type: 'same', text: 'c', oldLine: 3, newLine: 3 },
      { type: 'add', text: 'd', newLine: 4 },
    ]);
  });
});
