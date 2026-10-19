import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RunCallbacks, RunResult } from '@/lib/python/runner';
import type { RunRequest } from '@/lib/python/protocol';
import { PythonRunner } from './PythonRunner';
import { PythonRunnerContext } from './pythonRuntime';

const ok = (patch: Partial<RunResult> = {}): RunResult => ({
  status: 'ok',
  stdout: '',
  stderr: '',
  images: [],
  version: { python: '3.14.2', pyodide: '314.0.7' },
  ...patch,
});

function setup(result: RunResult) {
  const run = vi.fn(async (_req: RunRequest, cb?: RunCallbacks) => {
    cb?.onPhase?.('running');
    return result;
  });
  const user = userEvent.setup();
  render(
    <PythonRunnerContext.Provider value={{ run }}>
      <PythonRunner
        example={{
          id: 'sum',
          language: 'python',
          source: 'print(sum(range(5)))',
          annotations: [],
          expectedOutput: '10',
        }}
      />
    </PythonRunnerContext.Provider>,
  );
  return {
    run,
    user,
    editor: screen.getByRole('textbox', { name: 'Python code editor' }) as HTMLTextAreaElement,
  };
}

describe('PythonRunner', () => {
  it('shows the expected output until a real run replaces it, with the runtime version', async () => {
    const { run, user } = setup(ok({ stdout: '10\n' }));
    expect(screen.getByText('Expected output · not run yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(run).toHaveBeenCalledWith({ code: 'print(sum(range(5)))', tests: undefined }, expect.anything());
    expect(screen.getByRole('group', { name: 'Printed output' })).toHaveTextContent(/^10$/);
    expect(screen.getByText(/Python 3.14.2 · Pyodide 314.0.7/)).toBeInTheDocument();
    expect(screen.queryByText('Expected output · not run yet')).not.toBeInTheDocument();
  });

  it('runs edited code, indents with Tab, and resets to the original', async () => {
    const { run, user, editor } = setup(ok());
    await user.clear(editor);
    await user.type(editor, 'if True:{Enter}');
    await user.keyboard('{Tab}x = 1');
    expect(editor.value).toBe('if True:\n    x = 1');
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(run.mock.calls[0]?.[0].code).toBe('if True:\n    x = 1');
    expect(screen.getByText('The code ran and printed nothing.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(editor.value).toBe('print(sum(range(5)))');
  });

  it('lets keyboard users leave the editor with Escape then Tab', async () => {
    const { user, editor } = setup(ok());
    editor.focus();
    await user.keyboard('{Escape}{Tab}');
    expect(editor).not.toHaveFocus();
    expect(editor.value).toBe('print(sum(range(5)))');
  });

  it('explains a timeout', async () => {
    const { user } = setup({ ...ok(), status: 'timeout', message: 'Stopped after 10 seconds.' });
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Stopped after 10 seconds.');
  });

  it('keeps the code and the labeled expected output when Python can’t load', async () => {
    const { user } = setup({
      ...ok(),
      version: undefined,
      status: 'load-failed',
      message: 'Python runtime couldn’t load (offline).',
    });
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByText('Python runtime couldn’t load')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your connection/);
    expect(screen.getByText('Expected output · from the lesson, not run')).toBeInTheDocument();
  });
});
