import type { TraceValue } from '../types';

/** Pinned once here. Pyodide loads from jsDelivr at runtime and is never bundled (plan.md). */
export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
/** Learner code that runs longer than this is stopped (spec US4, scenario 4). */
export const RUN_TIMEOUT_MS = 10_000;

export interface RunRequest {
  code: string;
  /** Python assert statements run against the learner's code, in the same namespace. */
  tests?: string;
  /** Record one trace step per executed line. */
  trace?: boolean;
}

export type RunPhase = 'loading-runtime' | 'loading-packages' | 'running';

/** What the harness returns (src/workers/harness.py). */
export interface HarnessResult {
  error: string | null;
  test_failure: string | null;
  steps: { line: number; vars: Record<string, TraceValue>; scope: string }[] | null;
  truncated: boolean;
  images: string[];
}

export type WorkerRequest = RunRequest & { id: number };

export type WorkerMessage =
  | { type: 'phase'; id: number; phase: RunPhase }
  | { type: 'output'; id: number; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; id: number; result: HarnessResult; version: RuntimeVersion }
  | { type: 'load-failed'; id: number; error: string };

export interface RuntimeVersion {
  python: string;
  pyodide: string;
}
