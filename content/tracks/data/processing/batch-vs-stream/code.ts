// Code for the batch vs stream lesson. stream.py and batch.py are pure Python; their printed output was
// produced with CPython 3.13 (stream.test.ts checks the browser's simulation against it for every
// setting). The PySpark example follows the PySpark 4.2.0 API documentation and is not run here.
import { STREAM_SOURCE } from '@/lib/data/stream';
import { streamExperiment, streamSlots, type StreamState } from '@/lib/data/streamExperiment';
import type { CodeExample } from '@/lib/types';

export const stream = streamExperiment('stream');

const st = (s: unknown) => s as StreamState;

export const streamPython: CodeExample = {
  id: 'stream-python',
  language: 'python',
  source: STREAM_SOURCE,
  slots: {
    window: (s) => streamSlots(st(s)).window,
    lateness: (s) => streamSlots(st(s)).lateness,
  },
  annotations: [
    {
      id: 'events',
      range: { line: 2 },
      kind: 'variable',
      title: 'EVENTS',
      what: 'Each pair is (event time, arrival time), in minutes after 12:00, in the order the pipeline receives them.',
      why: 'The event (2, 11) happened at 12:02 but arrived at 12:11, after events from 12:08. Real streams arrive out of order.',
    },
    {
      id: 'window',
      range: { line: 4, startCol: 9, endCol: 19 },
      match: '{{window}}',
      kind: 'parameter',
      title: 'WINDOW',
      what: 'The width of each tumbling window, in minutes of event time.',
      why: 'Filled from the "Window size" control.',
    },
    {
      id: 'lateness',
      range: { line: 5, startCol: 11, endCol: 23 },
      match: '{{lateness}}',
      kind: 'parameter',
      title: 'LATENESS',
      what: 'How far behind the newest event time the watermark trails.',
      why: 'Filled from the "Allowed lateness" slider. More lateness waits longer and drops fewer events.',
    },
    {
      id: 'start',
      range: { line: 13 },
      kind: 'math',
      title: 'start = event_time // WINDOW * WINDOW',
      what: 'The start of the window the event belongs to: event time 8 with 5-minute windows gives 8 // 5 * 5 = 5, the window [5, 10).',
      why: 'The window is chosen by when the event happened, not by when it arrived.',
    },
    {
      id: 'late',
      range: { line: 14 },
      kind: 'syntax',
      title: 'if start in emitted',
      what: 'The event’s window has already been emitted as final.',
      why: 'A result already sent downstream is not reopened in this simple model, so the event is dropped and counted as late.',
    },
    {
      id: 'watermark',
      range: { line: 19 },
      kind: 'math',
      title: 'watermark = max_seen - LATENESS',
      what: 'The pipeline’s estimate of "all events up to this event time have arrived".',
      why: 'It only ever moves forward, and it is what decides when a window is complete.',
    },
    {
      id: 'emit',
      range: { line: 21 },
      kind: 'syntax',
      title: 's + WINDOW <= watermark',
      what: 'The window ends at or before the watermark, so it is considered complete.',
      why: 'Its count is emitted now, at this event’s arrival time. That moment minus the window end is the stream’s latency.',
    },
  ],
};

/** The batch job, with fixed settings, run in the browser. */
export const batchRunner: CodeExample = {
  id: 'batch-runner',
  language: 'python',
  run: 'pyodide',
  source: `EVENTS = [(1, 2), (3, 3), (4, 6), (6, 7), (8, 9), (2, 11), (11, 12), (9, 13),
          (13, 14), (14, 16), (17, 18), (19, 20), (7, 21), (22, 23), (24, 25), (26, 27)]
WINDOW = 5
BATCH_AT = 30  # the batch job runs once, at minute 30

counts = {}
for event_time, arrival in EVENTS:
    if arrival <= BATCH_AT:  # everything that has arrived by then
        start = event_time // WINDOW * WINDOW
        counts[start] = counts.get(start, 0) + 1

for s in sorted(counts):
    print(f"[{s:2}, {s + WINDOW:2}) count={counts[s]} ready at {BATCH_AT} (latency {BATCH_AT - s - WINDOW})")`,
  annotations: [],
  expectedOutput: `[ 0,  5) count=4 ready at 30 (latency 25)
[ 5, 10) count=4 ready at 30 (latency 20)
[10, 15) count=3 ready at 30 (latency 15)
[15, 20) count=2 ready at 30 (latency 10)
[20, 25) count=2 ready at 30 (latency 5)
[25, 30) count=1 ready at 30 (latency 0)`,
};

export const sparkStream: CodeExample = {
  id: 'spark-stream',
  language: 'python',
  source: `from pyspark.sql import SparkSession
from pyspark.sql.functions import window

spark = SparkSession.builder.getOrCreate()
events = spark.readStream.schema("event_time TIMESTAMP, page STRING").json("events/")

counts = (
    events
    .withWatermark("event_time", "3 minutes")
    .groupBy(window("event_time", "5 minutes"))
    .count()
)
query = counts.writeStream.outputMode("append").format("console").start()`,
  annotations: [
    {
      id: 'read-stream',
      range: { line: 5 },
      kind: 'framework',
      title: 'spark.readStream ... .json("events/")',
      what: 'Treats a folder of JSON files as an unbounded table: new files become new rows.',
      why: 'Streaming sources need a schema up front, because Spark cannot scan data that has not arrived yet.',
    },
    {
      id: 'with-watermark',
      range: { line: 9 },
      kind: 'framework',
      title: '.withWatermark("event_time", "3 minutes")',
      what: 'Spark tracks MAX(event_time) seen and subtracts the delay threshold to get the watermark.',
      why: 'The same rule as LATENESS = 3 above. It lets Spark finalize windows and discard their state.',
    },
    {
      id: 'window-fn',
      range: { line: 10 },
      kind: 'framework',
      title: 'window("event_time", "5 minutes")',
      what: 'Assigns each row to a 5-minute tumbling window. Starts are inclusive and ends exclusive: 12:05 falls in [12:05, 12:10).',
      why: 'The same windows as WINDOW = 5 above.',
    },
    {
      id: 'append',
      range: { line: 13 },
      kind: 'framework',
      title: 'outputMode("append")',
      what: 'Writes each window’s count once, when the watermark says the window is final.',
      why: 'The behavior simulated above. "update" mode would instead write a window again whenever its count changes.',
    },
  ],
};
