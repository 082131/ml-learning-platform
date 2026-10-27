import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PythonRunner, RunResult } from '@/lib/python/runner';
import { buildRunningSumTrace, RUNNING_SUM_SOURCE } from '@/lib/trace/runningSum';
import { scalar } from '@/lib/trace/values';
import type { CodeExample } from '@/lib/types';
import { PythonRunnerContext } from './pythonRuntime';
import { SlotStateContext } from './slotState';
import { PLAY_INTERVAL_MS, StepThrough } from './StepThrough';

const example: CodeExample = {
  id: 'sum',
  language: 'python',
  source: RUNNING_SUM_SOURCE,
  slots: { xs: (st) => JSON.stringify((st as { xs: number[] }).xs).replaceAll(',', ', ') },
  annotations: [],
};

function renderSum(xs = [3, 1, 4]) {
  return render(
    <SlotStateContext.Provider value={{ xs }}>
      <StepThrough example={example} trace={buildRunningSumTrace(xs)} />
    </SlotStateContext.Provider>,
  );
}

const vars = () => screen.getByRole('table', { name: 'Variables after this step' });
const row = (name: string) => within(vars()).getByRole('row', { name: new RegExp(`^${name}\\b`) });

describe('StepThrough', () => {
  it('moves forward and back with buttons and the arrow keys, updating the note, line and variables', async () => {
    const user = userEvent.setup();
    const { container } = renderSum();
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument();
    expect(screen.getByText('Computed in your browser')).toBeInTheDocument();
    expect(container.querySelector('[data-active-line]')).toHaveTextContent('xs = [3, 1, 4]');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Add x to the total: 0 + 3 = 3.')).toBeInTheDocument();
    expect(row('total')).toHaveTextContent('3');
    expect(row('total')).toHaveTextContent('changed');
    expect(row('x')).not.toHaveTextContent('changed');
    expect(container.querySelector('mark')).toHaveTextContent('total + x');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('Step 3 of 9')).toBeInTheDocument();
    expect(row('x')).toHaveTextContent('new');
    await user.keyboard('{End}');
    expect(screen.getByText('Step 9 of 9')).toBeInTheDocument();
    expect(row('output')).toHaveTextContent('8');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'First step' }));
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument();
  });

  it('shows array shapes and marks highlighted cells in text', async () => {
    const user = userEvent.setup();
    renderSum();
    expect(row('xs')).toHaveTextContent('(3,)');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(row('xs')).getByRole('img')).toHaveAccessibleName('[3, 1, 4], highlighted [0]');
  });

  it('plays through the steps and stops at the end', () => {
    vi.useFakeTimers();
    renderSum([5]);
    act(() => screen.getByRole('button', { name: 'Play' }).click());
    for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(PLAY_INTERVAL_MS));
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'false');
    vi.useRealTimers();
  });

  it('labels a simulated trace with the badge and a caption', () => {
    render(
      <StepThrough
        example={{ id: 'torch', language: 'python', source: 'y = model(x)', annotations: [] }}
        trace={{
          source: 'simulated',
          steps: [{ range: { line: 1 }, vars: { y: scalar(1) }, note: 'Forward pass.' }],
        }}
      />,
    );
    expect(screen.getByText('Simulated trace')).toBeInTheDocument();
    expect(screen.getByText(/not produced by running the code/)).toBeInTheDocument();
  });

  it("shows a lesson's own caption for a simulated trace recorded from a real run elsewhere", () => {
    render(
      <StepThrough
        example={{ id: 'torch', language: 'python', source: 'y = model(x)', annotations: [] }}
        trace={{ source: 'simulated', steps: [{ range: { line: 1 }, vars: {}, note: 'Forward pass.' }] }}
        simulatedNote="Values recorded from a run of PyTorch on CPU; nothing runs in your browser."
      />,
    );
    expect(screen.getByText('Simulated trace')).toBeInTheDocument();
    expect(screen.getByText(/Values recorded from a run of PyTorch/)).toBeInTheDocument();
    expect(screen.queryByText(/written out by hand/)).toBeNull();
  });

  it('records a trace in Pyodide when asked', async () => {
    const user = userEvent.setup();
    const runner: PythonRunner = {
      run: vi.fn(async (): Promise<RunResult> => ({
        status: 'ok',
        stdout: '',
        stderr: '',
        images: [],
        steps: [
          { line: 1, vars: { a: scalar(2) }, scope: '<module>' },
          { line: 2, vars: { a: scalar(2), b: scalar(4) }, scope: '<module>' },
        ],
      })),
    };
    render(
      <PythonRunnerContext.Provider value={runner}>
        <StepThrough
          example={{ id: 'ab', language: 'python', source: 'a = 2\nb = a * 2', annotations: [] }}
        />
      </PythonRunnerContext.Provider>,
    );
    await user.click(screen.getByRole('button', { name: 'Record trace' }));
    expect(runner.run).toHaveBeenCalledWith({ code: 'a = 2\nb = a * 2', trace: true }, expect.anything());
    expect(screen.getByText('Recorded in Python (Pyodide)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Line 2 ran. B is now 4.')).toBeInTheDocument();
  });
});
