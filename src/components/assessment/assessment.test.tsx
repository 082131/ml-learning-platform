import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RunResult } from '@/lib/python/runner';
import type { Exercise, QuizQuestion } from '@/lib/types';
import { PythonRunnerContext } from '@/components/code/pythonRuntime';
import { LessonIdContext } from '@/components/learning/LessonContext';
import { renderWithApp } from '@/test/render';
import { CommonMistake } from './CommonMistake';
import { KnowledgeCheck } from './KnowledgeCheck';
import { MiniExercise } from './MiniExercise';
import { ProjectBrief } from './ProjectBrief';

const LESSON = 'ml/math/matrix-multiplication';
const inLesson = (ui: React.ReactElement) => (
  <LessonIdContext.Provider value={LESSON}>{ui}</LessonIdContext.Provider>
);

const questions: QuizQuestion[] = [
  {
    id: 'shape',
    type: 'choice',
    prompt: 'A has shape (2, 3) and B has shape (3, 4). What is the shape of A @ B?',
    options: [
      { text: '(2, 4)', correct: true, explain: 'Rows come from A and columns from B.' },
      {
        text: '(3, 3)',
        correct: false,
        explain: 'The shared dimension 3 is summed away, so it does not appear.',
      },
    ],
  },
  {
    id: 'entry',
    type: 'numeric',
    prompt: 'What is 1·4 + 2·5?',
    answer: 14,
    tolerance: 0,
    hint: 'Multiply pairs, then add.',
    explain: '4 + 10 = 14.',
  },
  {
    id: 'steps',
    type: 'order',
    prompt: 'Order the steps.',
    items: ['Check shapes', 'Multiply', 'Sum'],
    explain: 'Shapes first, then multiply-add.',
  },
];

describe('KnowledgeCheck', () => {
  it('explains why a wrong choice is wrong, saves the attempt, and allows a retry', async () => {
    const user = userEvent.setup();
    const { store } = renderWithApp(inLesson(<KnowledgeCheck questions={questions} />));
    const q1 = screen.getByRole('group', { name: /What is the shape/ });
    await user.click(within(q1).getByRole('radio', { name: '(3, 3)' }));
    await user.click(screen.getAllByRole('button', { name: 'Check answer' })[0]!);
    expect(screen.getByText(/Not quite\./).parentElement).toHaveTextContent(
      'The shared dimension 3 is summed away',
    );
    expect(store.getState().quiz[`${LESSON}#shape`]).toEqual({ correct: false, attempts: 1 });

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(within(q1).getByRole('radio', { name: '(2, 4)' }));
    await user.click(screen.getAllByRole('button', { name: 'Check answer' })[0]!);
    expect(screen.getByText(/✓ Correct\./).parentElement).toHaveTextContent('Rows come from A');
    expect(store.getState().quiz[`${LESSON}#shape`]).toEqual({ correct: true, attempts: 2 });
    expect(screen.getByText('2 attempts · last answer correct')).toBeInTheDocument();
  });

  it('gives a hint for a wrong number and rejects text that is not a number', async () => {
    const user = userEvent.setup();
    renderWithApp(inLesson(<KnowledgeCheck questions={[questions[1]!]} />));
    const input = screen.getByRole('textbox', { name: /What is 1·4/ });
    await user.type(input, 'fourteen{Enter}');
    expect(screen.getByText(/Enter a number/)).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, '13{Enter}');
    expect(screen.getByText(/Hint: Multiply pairs/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.clear(input);
    await user.type(input, '14');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('4 + 10 = 14.')).toBeInTheDocument();
  });

  it('orders items with move buttons and marks each position', async () => {
    const user = userEvent.setup();
    renderWithApp(inLesson(<KnowledgeCheck questions={[questions[2]!]} />));
    const list = () =>
      within(screen.getByRole('list', { name: 'Q1. Order the steps.' })).getAllByRole('listitem');
    const texts = () => list().map((li) => li.textContent?.replace(/^\d\.(✓ |✗ )?/, '').replace(/↑↓$/, ''));
    expect(texts()).not.toEqual(['Check shapes', 'Multiply', 'Sum']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText(/are in the right place/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    // Bubble each item into place.
    for (const [target, item] of ['Check shapes', 'Multiply', 'Sum'].entries()) {
      while (texts().indexOf(item) > target)
        await user.click(screen.getByRole('button', { name: `Move “${item}” up` }));
    }
    expect(texts()).toEqual(['Check shapes', 'Multiply', 'Sum']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Shapes first, then multiply-add.')).toBeInTheDocument();
    expect(list().every((li) => li.textContent?.includes('✓'))).toBe(true);
  });
});

const exercise: Exercise = {
  id: 'dot',
  prompt: 'Write `dot(a, b)` that returns the dot product.',
  starter: 'def dot(a, b):\n    pass',
  hints: ['Pair up items with `zip`.', 'Sum the products.'],
  solution: 'def dot(a, b):\n    return sum(x * y for x, y in zip(a, b))',
  explanation: 'zip pairs the items; sum adds the products.',
  tests: 'assert dot([1, 2], [3, 4]) == 11',
};

describe('MiniExercise', () => {
  it('reveals hints one at a time and the solution only on request', async () => {
    const user = userEvent.setup();
    const { store } = renderWithApp(inLesson(<MiniExercise exercise={{ ...exercise, tests: undefined }} />));
    expect(screen.getByText('dot(a, b)').tagName).toBe('CODE');
    expect(screen.queryByText(/zip pairs the items/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show hint 1 of 2' }));
    expect(screen.getByText(/Pair up items/)).toBeInTheDocument();
    expect(screen.queryByText('Sum the products.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show hint 2 of 2' }));
    expect(screen.queryByRole('button', { name: /Show hint/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reveal solution' }));
    expect(screen.getByText(/zip pairs the items/)).toBeInTheDocument();
    expect(store.getState().exercises[`${LESSON}#dot`]).toEqual({ revealed: true });
  });

  it('runs the hidden tests in Pyodide and reports pass and fail', async () => {
    const user = userEvent.setup();
    const results: RunResult[] = [
      {
        status: 'test-failed',
        stdout: '',
        stderr: '',
        images: [],
        message: 'assert dot([1, 2], [3, 4]) == 11',
      },
      { status: 'ok', stdout: '', stderr: '', images: [] },
    ];
    const run = vi.fn(async () => results.shift()!);
    const { store } = renderWithApp(
      <PythonRunnerContext.Provider value={{ run }}>
        {inLesson(<MiniExercise exercise={exercise} />)}
      </PythonRunnerContext.Provider>,
    );
    await user.click(screen.getByRole('button', { name: 'Run tests' }));
    expect(run).toHaveBeenCalledWith({ code: exercise.starter, tests: exercise.tests }, expect.anything());
    expect(screen.getByRole('alert')).toHaveTextContent('assert dot([1, 2], [3, 4]) == 11');
    expect(store.getState().exercises[`${LESSON}#dot`]).toEqual({ revealed: false, passed: false });
    await user.click(screen.getByRole('button', { name: 'Run tests' }));
    expect(screen.getByText(/All tests passed/)).toBeInTheDocument();
    expect(screen.getByText('✓ Tests passed')).toBeInTheDocument();
  });
});

describe('CommonMistake', () => {
  it('shows the wrong code, the error, the cause and the fix', () => {
    renderWithApp(
      <CommonMistake
        title="Shape mismatch"
        wrong="A @ A"
        error="ValueError: matmul: mismatch"
        cause="Inner sizes differ."
        fix="A @ A.T"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Shape mismatch' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Error message' })).toHaveTextContent(
      'ValueError: matmul: mismatch',
    );
    expect(screen.getByRole('group', { name: 'Fixed code' })).toHaveTextContent('A @ A.T');
  });
});

describe('ProjectBrief', () => {
  it('saves the milestone checklist', async () => {
    const user = userEvent.setup();
    const { store } = renderWithApp(
      inLesson(
        <ProjectBrief
          brief={{
            goal: 'Build it.',
            dataset: 'Iris.',
            milestones: ['Load', 'Train'],
            rubric: [{ criterion: 'Works', detail: 'Runs end to end' }],
            hints: ['Start small.'],
          }}
        />,
      ),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Train' }));
    expect(store.getState().projects[LESSON]).toEqual([false, true]);
    expect(screen.getByText('Milestones · 1 of 2 done')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: 'Works Runs end to end' })).toBeInTheDocument();
  });
});
