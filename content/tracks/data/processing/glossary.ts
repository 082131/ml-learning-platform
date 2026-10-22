import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/processing chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'batch-processing',
    term: 'Batch processing',
    short:
      'Processing a bounded set of data in one run, on a schedule or on demand, for example every night.',
    long: 'A batch job sees everything that has arrived by the time it runs, so its results are complete for that data, but they are only as fresh as the last run.',
    introducedIn: 'data/processing/batch-vs-stream',
    aliases: ['batch job'],
  },
  {
    id: 'stream-processing',
    term: 'Stream processing',
    short:
      'Processing events continuously as they arrive, keeping running results and emitting them within seconds or minutes.',
    long: 'A stream never sees "all" the data, so it must decide when a result is complete enough to emit. Event-time windows and watermarks are how it decides.',
    introducedIn: 'data/processing/batch-vs-stream',
    aliases: ['streaming'],
  },
  {
    id: 'event-time',
    term: 'Event time',
    short: 'When something actually happened, recorded in the event itself.',
    long: 'Counts per minute of user activity should use event time, so that an event delayed in the network is still counted in the minute it happened.',
    introducedIn: 'data/processing/batch-vs-stream',
  },
  {
    id: 'processing-time',
    term: 'Processing time',
    short: 'When the pipeline received or processed an event, which can be much later than its event time.',
    long: 'The gap between processing time and event time varies from event to event, which is why streams receive events out of order.',
    introducedIn: 'data/processing/batch-vs-stream',
    aliases: ['arrival time', 'ingestion time'],
  },
  {
    id: 'tumbling-window',
    term: 'Tumbling window',
    short:
      'Fixed-size, non-overlapping time intervals such as [12:00, 12:05), [12:05, 12:10): every event falls in exactly one.',
    long: 'Starts are inclusive and ends exclusive. Sliding windows, by contrast, overlap, so one event can count in several.',
    introducedIn: 'data/processing/batch-vs-stream',
    aliases: ['fixed window'],
  },
  {
    id: 'watermark',
    term: 'Watermark (streaming)',
    short:
      'A stream’s running estimate that all events up to a given event time have arrived, often the largest event time seen minus an allowed lateness.',
    long: 'When the watermark passes a window’s end, the window is treated as complete: its result is emitted and its state can be freed. Events that arrive for it afterwards are late.',
    introducedIn: 'data/processing/batch-vs-stream',
    aliases: ['event-time watermark'],
  },
  {
    id: 'late-event',
    term: 'Late event',
    short: 'An event that arrives after the watermark has passed the end of its window.',
    long: 'A stream can drop it, as the lesson’s model does, or emit an updated result for the window, at the cost of keeping state longer and sending corrections downstream.',
    introducedIn: 'data/processing/batch-vs-stream',
    aliases: ['late data'],
  },
] satisfies GlossaryTerm[];
