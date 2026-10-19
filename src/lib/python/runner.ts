import {
  RUN_TIMEOUT_MS,
  type HarnessResult,
  type RunPhase,
  type RunRequest,
  type RuntimeVersion,
  type WorkerMessage,
  type WorkerRequest,
} from './protocol';

export type RunStatus = 'ok' | 'error' | 'test-failed' | 'timeout' | 'load-failed';

export interface RunResult {
  status: RunStatus;
  stdout: string;
  stderr: string;
  /** Python traceback, load error, or why the run was stopped. */
  message?: string;
  images: string[];
  steps?: HarnessResult['steps'];
  truncated?: boolean;
  version?: RuntimeVersion;
}

export interface RunCallbacks {
  onPhase?: (phase: RunPhase) => void;
  onOutput?: (stream: 'stdout' | 'stderr', text: string) => void;
}

/** The part of the Worker API the runner uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<WorkerMessage>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

export interface PythonRunner {
  run(request: RunRequest, callbacks?: RunCallbacks): Promise<RunResult>;
}

/**
 * Runs Python jobs one at a time in a worker. The watchdog starts when the code starts running
 * (not while the runtime downloads); on timeout the worker is terminated and the next job gets a new one.
 */
export function createPythonRunner(createWorker: () => WorkerLike, timeoutMs = RUN_TIMEOUT_MS): PythonRunner {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  let queue: Promise<unknown> = Promise.resolve();

  const execute = (request: RunRequest, cb: RunCallbacks) =>
    new Promise<RunResult>((resolve) => {
      const id = nextId++;
      const w = (worker ??= createWorker());
      let stdout = '';
      let stderr = '';
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: Omit<RunResult, 'stdout' | 'stderr'>, kill = false) => {
        clearTimeout(timer);
        w.onmessage = null;
        w.onerror = null;
        if (kill) {
          w.terminate();
          if (worker === w) worker = null;
        }
        resolve({ stdout, stderr, ...result });
      };

      w.onmessage = ({ data }) => {
        if (data.id !== id) return;
        if (data.type === 'phase') {
          cb.onPhase?.(data.phase);
          if (data.phase === 'running')
            timer = setTimeout(
              () =>
                finish(
                  {
                    status: 'timeout',
                    images: [],
                    message: `Stopped after ${timeoutMs / 1000} seconds. The code may be stuck in a loop that never ends, so Python was restarted.`,
                  },
                  true,
                ),
              timeoutMs,
            );
        } else if (data.type === 'output') {
          if (data.stream === 'stdout') stdout += `${data.text}\n`;
          else stderr += `${data.text}\n`;
          cb.onOutput?.(data.stream, data.text);
        } else if (data.type === 'load-failed') {
          finish({ status: 'load-failed', images: [], message: data.error }, true);
        } else {
          const r = data.result;
          const status: RunStatus = r.error ? 'error' : r.test_failure ? 'test-failed' : 'ok';
          finish({
            status,
            message: r.error ?? r.test_failure ?? undefined,
            images: r.images,
            steps: r.steps,
            truncated: r.truncated,
            version: data.version,
          });
        }
      };
      w.onerror = (e) =>
        finish(
          { status: 'load-failed', images: [], message: e.message || 'The Python worker failed to start.' },
          true,
        );
      w.postMessage({ id, ...request });
    });

  return {
    run(request, callbacks = {}) {
      const job = queue.then(() => execute(request, callbacks));
      queue = job;
      return job;
    },
  };
}
