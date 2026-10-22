/**
 * Batch vs stream processing over one fixed set of events, computed in the browser. The stream counts
 * events per tumbling event-time window and emits a window's count once the watermark (the largest
 * event time seen, minus the allowed lateness) passes the window's end; events for an emitted window
 * are dropped as late. The batch job runs once, at a chosen processing time, over everything that has
 * arrived. stream.test.ts checks the stream against STREAM_SOURCE run with CPython 3.13.
 */

/** One event: when it happened (event time) and when the pipeline received it (processing time). */
export interface StreamEvent {
  id: string;
  eventTime: number;
  arrival: number;
}

/** Minutes after 12:00. Listed in arrival order; some arrive after later events (out of order). */
export const EVENTS: StreamEvent[] = (
  [
    [1, 2],
    [3, 3],
    [4, 6],
    [6, 7],
    [8, 9],
    [2, 11],
    [11, 12],
    [9, 13],
    [13, 14],
    [14, 16],
    [17, 18],
    [19, 20],
    [7, 21],
    [22, 23],
    [24, 25],
    [26, 27],
  ] as const
).map(([eventTime, arrival], i) => ({ id: `e${i + 1}`, eventTime, arrival }));

/** Python's // for the non-negative minutes used here. */
export const windowStart = (t: number, size: number) => Math.floor(t / size) * size;

export interface WindowResult {
  start: number;
  end: number;
  /** Every event whose event time falls in the window, however late it arrived. */
  trueCount: number;
  /** What the stream emitted, and when (processing time); null while the window is still open. */
  streamCount: number | null;
  emittedAt: number | null;
  /** emittedAt − end: how long after the window closed (in event time) the result appeared. */
  streamLatency: number | null;
  /** The batch job's count: every event that had arrived by the batch run. */
  batchCount: number;
  batchLatency: number;
}

export interface StreamRun {
  windows: WindowResult[];
  /** Events whose window had already been emitted when they arrived. */
  dropped: StreamEvent[];
  /** Watermark after each event, in arrival order: (processing time, watermark). */
  watermark: [number, number][];
  finalWatermark: number;
}

/** Runs the stream and the batch job over `events` (in arrival order). */
export function simulate(
  events: readonly StreamEvent[],
  size: number,
  lateness: number,
  batchAt: number,
): StreamRun {
  const counts = new Map<number, number>();
  const emitted = new Map<number, { count: number; at: number }>();
  const dropped: StreamEvent[] = [];
  const watermark: [number, number][] = [];
  let maxSeen = -Infinity;
  for (const e of events) {
    const start = windowStart(e.eventTime, size);
    if (emitted.has(start)) dropped.push(e);
    else counts.set(start, (counts.get(start) ?? 0) + 1);
    maxSeen = Math.max(maxSeen, e.eventTime);
    const wm = maxSeen - lateness;
    watermark.push([e.arrival, wm]);
    for (const s of [...counts.keys()].sort((a, b) => a - b))
      if (!emitted.has(s) && s + size <= wm) emitted.set(s, { count: counts.get(s)!, at: e.arrival });
  }
  const starts = [...new Set(events.map((e) => windowStart(e.eventTime, size)))].sort((a, b) => a - b);
  const windows = starts.map((start): WindowResult => {
    const end = start + size;
    const inWindow = events.filter((e) => windowStart(e.eventTime, size) === start);
    const out = emitted.get(start);
    return {
      start,
      end,
      trueCount: inWindow.length,
      streamCount: out?.count ?? null,
      emittedAt: out?.at ?? null,
      streamLatency: out ? out.at - end : null,
      batchCount: inWindow.filter((e) => e.arrival <= batchAt).length,
      batchLatency: batchAt - end,
    };
  });
  return { windows, dropped, watermark, finalWatermark: maxSeen - lateness };
}

/** The lesson's Python version of the stream, with the settings filled in. */
export const STREAM_SOURCE = `# (event_time, arrival_time) in minutes after 12:00, listed in arrival order.
EVENTS = [(1, 2), (3, 3), (4, 6), (6, 7), (8, 9), (2, 11), (11, 12), (9, 13),
          (13, 14), (14, 16), (17, 18), (19, 20), (7, 21), (22, 23), (24, 25), (26, 27)]
WINDOW = {{window}}  # tumbling windows [0, WINDOW), [WINDOW, 2 * WINDOW), ...
LATENESS = {{lateness}}  # allowed lateness: watermark = max event time seen - LATENESS

counts = {}        # window start -> events counted so far
emitted = {}       # window start -> (count, emitted at)
dropped = []
max_seen = float("-inf")

for event_time, arrival in EVENTS:
    start = event_time // WINDOW * WINDOW
    if start in emitted:
        dropped.append((event_time, arrival))   # its window is already final
    else:
        counts[start] = counts.get(start, 0) + 1
    max_seen = max(max_seen, event_time)
    watermark = max_seen - LATENESS
    for s in sorted(counts):
        if s not in emitted and s + WINDOW <= watermark:
            emitted[s] = (counts[s], arrival)

for s, (count, at) in sorted(emitted.items()):
    print(f"[{s:2}, {s + WINDOW:2}) count={count} emitted at {at:2} (latency {at - s - WINDOW})")
print("still open:", sorted(set(counts) - set(emitted)))
print("dropped as late:", dropped)`;

const pad2 = (n: number) => String(n).padStart(2);

/** What STREAM_SOURCE prints for a run (the same format as its f-strings). */
export function pythonPrintout(run: StreamRun): string {
  const lines = run.windows
    .filter((w) => w.emittedAt !== null)
    .map(
      (w) =>
        `[${pad2(w.start)}, ${pad2(w.end)}) count=${w.streamCount} emitted at ${pad2(w.emittedAt!)} (latency ${w.streamLatency})`,
    );
  const open = run.windows.filter((w) => w.emittedAt === null).map((w) => w.start);
  lines.push(`still open: [${open.join(', ')}]`);
  lines.push(`dropped as late: [${run.dropped.map((e) => `(${e.eventTime}, ${e.arrival})`).join(', ')}]`);
  return lines.join('\n');
}

export type EventStatus = 'counted' | 'dropped' | 'open';

/** Per event: counted in an emitted window, dropped as late, or in a window the stream has not emitted. */
export function eventStatuses(run: StreamRun, events: readonly StreamEvent[], size: number): EventStatus[] {
  const dropped = new Set(run.dropped);
  const emitted = new Set(run.windows.filter((w) => w.emittedAt !== null).map((w) => w.start));
  return events.map((e) =>
    dropped.has(e) ? 'dropped' : emitted.has(windowStart(e.eventTime, size)) ? 'counted' : 'open',
  );
}
