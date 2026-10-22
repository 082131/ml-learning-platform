import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/stream-python.json';
import { EVENTS, pythonPrintout, simulate, STREAM_SOURCE } from './stream';
import { LATENESS_MAX, runStream, streamExperiment, streamSlots, summarize } from './streamExperiment';

describe('simulate', () => {
  it('works through a hand-checked run: 5-minute windows, 3 minutes of lateness', () => {
    const run = simulate(EVENTS, 5, 3, 30);
    // [0, 5) holds events at 1, 3, 4 and 2. The watermark reaches 5 when event 8 arrives at 9 (8 − 3 = 5),
    // so it emits 3; event 2 arrives at 11, after that, and is dropped.
    expect(run.windows[0]).toEqual({
      start: 0,
      end: 5,
      trueCount: 4,
      streamCount: 3,
      emittedAt: 9,
      streamLatency: 4,
      batchCount: 4,
      batchLatency: 25,
    });
    expect(run.dropped.map((e) => e.eventTime)).toEqual([2, 7]);
    expect(run.windows.filter((w) => w.emittedAt === null).map((w) => w.start)).toEqual([20, 25]);
    expect(run.finalWatermark).toBe(23);
  });

  it('a batch run before the last arrival misses it', () => {
    const early = simulate(EVENTS, 5, 0, 20);
    expect(early.windows.find((w) => w.start === 5)!.batchCount).toBe(3); // event 7 arrives at 21
  });

  it('prints exactly what the lesson’s Python prints, for every window and lateness', () => {
    const table = python as Record<string, string>;
    for (const window of [5, 10])
      for (let lateness = 0; lateness <= LATENESS_MAX; lateness++)
        expect(pythonPrintout(simulate(EVENTS, window, lateness, 30))).toBe(table[`${window},${lateness}`]);
  });
});

describe('streamExperiment', () => {
  const def = streamExperiment('stream');
  it('is valid, and the slots fill the Python source', () => {
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(STREAM_SOURCE, [], streamSlots(def.initial));
    expect(source).toContain('WINDOW = 5 ');
    expect(source).toContain('LATENESS = 3 ');
  });
  it('trades completeness for latency as the lateness grows', () => {
    const fast = summarize(runStream({ window: 5, lateness: 0, batchAt: 30 }));
    const slow = summarize(runStream({ window: 5, lateness: 6, batchAt: 30 }));
    expect([fast.streamCounted, fast.streamTrue, fast.maxStreamLatency]).toEqual([12, 15, 3]);
    expect([slow.streamCounted, slow.streamTrue, slow.maxStreamLatency]).toEqual([12, 13, 8]);
    expect(fast.batchCounted).toBe(16);
  });
});

describe('eventStatuses', () => {
  it('labels every event', async () => {
    const { eventStatuses } = await import('./stream');
    const run = simulate(EVENTS, 5, 3, 30);
    const st = eventStatuses(run, EVENTS, 5);
    expect(st.filter((x) => x === 'dropped')).toHaveLength(2);
    expect(st.filter((x) => x === 'open')).toHaveLength(3); // event times 22 and 24 in [20, 25), 26 in [25, 30)
    expect(st[5]).toBe('dropped'); // event time 2, arrived at 11
  });
});

describe('the fixture ran the code the lesson shows', () => {
  it('embeds STREAM_SOURCE verbatim', async () => {
    const script = (await import('./fixtures/stream.py?raw')).default;
    expect(script).toContain(`SOURCE = """${STREAM_SOURCE}"""`);
  });
});
