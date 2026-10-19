import { createContext, useContext } from 'react';
import { createPythonRunner, type PythonRunner, type WorkerLike } from '@/lib/python/runner';

/** One shared runner for the app. The worker, and Pyodide with it, is created on the first Run only. */
const appRunner = createPythonRunner(
  () =>
    new Worker(new URL('../../workers/pyodide.worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as WorkerLike,
);

/** Tests provide a fake runner. */
export const PythonRunnerContext = createContext<PythonRunner>(appRunner);

export function usePythonRunner(): PythonRunner {
  return useContext(PythonRunnerContext);
}
