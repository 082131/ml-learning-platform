import type { ExperimentDef } from '../types';
import { EVENTS, pythonPrintout, simulate, type StreamRun } from './stream';

export interface StreamState {
  window: number;
  lateness: number;
  batchAt: number;
}

export const LATENESS_MAX = 10;
export const BATCH_MIN = 30;
export const BATCH_MAX = 60;
export const BATCH_STEP = 5;

export const streamSlots = (s: StreamState) => ({ window: String(s.window), lateness: String(s.lateness) });

export const runStream = (s: StreamState) => simulate(EVENTS, s.window, s.lateness, s.batchAt);

/** Totals for the readout: how complete and how fast each approach is. */
export function summarize(run: StreamRun) {
  const done = run.windows.filter((w) => w.emittedAt !== null);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return {
    emittedWindows: done.length,
    openWindows: run.windows.length - done.length,
    streamCounted: sum(done.map((w) => w.streamCount!)),
    streamTrue: sum(done.map((w) => w.trueCount)),
    maxStreamLatency: done.length ? Math.max(...done.map((w) => w.streamLatency!)) : null,
    batchCounted: sum(run.windows.map((w) => w.batchCount)),
    allEvents: sum(run.windows.map((w) => w.trueCount)),
    minBatchLatency: Math.min(...run.windows.map((w) => w.batchLatency)),
    maxBatchLatency: Math.max(...run.windows.map((w) => w.batchLatency)),
  };
}

export function streamExperiment(id: string): ExperimentDef<StreamState, StreamRun> {
  return {
    id,
    initial: { window: 5, lateness: 3, batchAt: BATCH_MIN },
    controls: [
      {
        kind: 'select',
        id: 'window',
        label: 'Window size',
        options: [
          { value: '5', label: '5 minutes' },
          { value: '10', label: '10 minutes' },
        ],
        get: (s) => String(s.window),
        set: (s, v) => ({ ...s, window: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'lateness',
        label: 'Allowed lateness (minutes)',
        min: 0,
        max: LATENESS_MAX,
        get: (s) => s.lateness,
        set: (s, v) => ({ ...s, lateness: v }),
      },
      {
        kind: 'slider',
        id: 'batchAt',
        label: 'Batch job runs at (minute)',
        min: BATCH_MIN,
        max: BATCH_MAX,
        step: BATCH_STEP,
        get: (s) => s.batchAt,
        set: (s, v) => ({ ...s, batchAt: v }),
      },
    ],
    compute: runStream,
    readout: (_s, r) => {
      const t = summarize(r);
      return [
        { label: 'Python: what stream.py prints', value: pythonPrintout(r) },
        {
          label: 'Stream: events counted in emitted windows',
          value: `${t.streamCounted} of ${t.streamTrue} (${r.dropped.length} dropped as late)`,
        },
        {
          label: 'Stream: slowest result after its window closed',
          value: t.maxStreamLatency === null ? 'nothing emitted yet' : `${t.maxStreamLatency} min`,
        },
        { label: 'Batch: events counted', value: `${t.batchCounted} of ${t.allEvents}` },
        {
          label: 'Batch: results appear after their window closed',
          value: `${t.minBatchLatency} to ${t.maxBatchLatency} min`,
        },
      ];
    },
  };
}
