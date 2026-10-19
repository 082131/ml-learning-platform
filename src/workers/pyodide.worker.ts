/// <reference lib="webworker" />
// Runs learner Python in Pyodide, off the main thread. Loaded on the first Run only.
import harness from './harness.py?raw';
import {
  PYODIDE_INDEX_URL,
  PYODIDE_VERSION,
  type HarnessResult,
  type WorkerMessage,
  type WorkerRequest,
} from '@/lib/python/protocol';

interface PyProxyFn {
  (...args: unknown[]): unknown;
}
interface Pyodide {
  version: string;
  runPython(code: string): unknown;
  loadPackagesFromImports(code: string): Promise<unknown>;
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  globals: { get(name: string): PyProxyFn };
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (message: WorkerMessage) => scope.postMessage(message);
let current = 0;
let runtime: Promise<Pyodide> | undefined;

async function load(): Promise<Pyodide> {
  const mod = (await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)) as {
    loadPyodide(options: { indexURL: string }): Promise<Pyodide>;
  };
  const py = await mod.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  // Matplotlib draws to an in-memory canvas; the harness turns figures into PNGs.
  py.runPython(`import os\nos.environ["MPLBACKEND"] = "AGG"`);
  py.runPython(harness);
  py.setStdout({ batched: (text) => post({ type: 'output', id: current, stream: 'stdout', text }) });
  py.setStderr({ batched: (text) => post({ type: 'output', id: current, stream: 'stderr', text }) });
  return py;
}

const IMPORTS = /^\s*(import|from)\s+\w/m;

scope.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  current = data.id;
  let py: Pyodide;
  try {
    if (!runtime) post({ type: 'phase', id: data.id, phase: 'loading-runtime' });
    runtime ??= load();
    py = await runtime;
  } catch (e) {
    runtime = undefined;
    post({
      type: 'load-failed',
      id: data.id,
      error: `Python runtime couldn’t load (${(e as Error).message}).`,
    });
    return;
  }
  const source = `${data.code}\n${data.tests ?? ''}`;
  try {
    if (IMPORTS.test(source)) {
      post({ type: 'phase', id: data.id, phase: 'loading-packages' });
      await py.loadPackagesFromImports(source);
    }
  } catch (e) {
    post({
      type: 'load-failed',
      id: data.id,
      error: `A Python package couldn’t load (${(e as Error).message}).`,
    });
    return;
  }
  post({ type: 'phase', id: data.id, phase: 'running' });
  const json = py.globals.get('mlp_run')(data.code, data.tests ?? null, data.trace ?? false) as string;
  const python = py.runPython('import sys\n".".join(map(str, sys.version_info[:3]))') as string;
  post({
    type: 'done',
    id: data.id,
    result: JSON.parse(json) as HarnessResult,
    version: { python, pyodide: py.version || PYODIDE_VERSION },
  });
};
