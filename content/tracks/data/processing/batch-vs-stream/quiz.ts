import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'event-vs-processing',
    type: 'choice',
    prompt:
      'A phone records a tap at 12:02 but is offline until 12:11, when the event reaches the pipeline. Which statement is right?',
    options: [
      {
        text: 'Its event time is 12:02 and its processing time is 12:11; a per-minute count by event time puts it in 12:02',
        correct: true,
        explain:
          'Event time is when it happened, processing time is when the pipeline saw it. Windows by event time count it where it belongs.',
      },
      {
        text: 'Its event time is 12:11, because that is when it was recorded by the pipeline',
        correct: false,
        explain:
          'That is the processing time. Event time is carried in the event itself, set when the tap happened.',
      },
      {
        text: 'Late events cannot be assigned to a window',
        correct: false,
        explain:
          'They can always be assigned by event time. The question is whether that window’s result was already emitted.',
      },
    ],
  },
  {
    id: 'watermark-value',
    type: 'numeric',
    prompt:
      'The largest event time seen so far is 19 and the allowed lateness is 3 minutes. What is the watermark?',
    answer: 16,
    tolerance: 0,
    hint: 'Watermark = largest event time seen − allowed lateness.',
    explain: '19 − 3 = 16. Windows ending at or before 16, such as [10, 15), can be emitted.',
  },
  {
    id: 'more-lateness',
    type: 'choice',
    prompt: 'You raise the allowed lateness from 3 to 6 minutes. What happens?',
    options: [
      {
        text: 'Fewer events are dropped, and every window’s result arrives later',
        correct: true,
        explain:
          'The watermark trails further behind, so windows stay open longer: more complete, less fresh. In the lesson, 2 dropped events become 1 and the slowest result goes from 5 to 8 minutes.',
      },
      {
        text: 'Results arrive sooner and more events are dropped',
        correct: false,
        explain: 'That is what lowering the lateness does.',
      },
      {
        text: 'Nothing changes for in-order events',
        correct: false,
        explain: 'Their windows also wait for the watermark, so their results arrive later too.',
      },
    ],
  },
  {
    id: 'batch-when',
    type: 'choice',
    prompt: 'Which job is the better fit for a nightly batch rather than a stream?',
    options: [
      {
        text: 'Monthly revenue per country for the finance report',
        correct: true,
        explain:
          'Nobody needs it within seconds, and it must be complete. A batch run after the data has settled gives both, simply.',
      },
      {
        text: 'Blocking a stolen credit card while the thief is still shopping',
        correct: false,
        explain:
          'A result that arrives tomorrow is useless here. Low latency is the whole point, so this is a stream.',
      },
      {
        text: 'Showing live counts of people in a venue',
        correct: false,
        explain: '"Live" means seconds of latency, which a nightly batch cannot give.',
      },
    ],
  },
  {
    id: 'emit-order',
    type: 'order',
    prompt: 'Put what the stream does for each arriving event in order.',
    items: [
      'Find the event’s window from its event time',
      'Count it, unless that window was already emitted (then drop it as late)',
      'Move the watermark to the largest event time seen minus the allowed lateness',
      'Emit every open window that ends at or before the watermark',
    ],
    explain: 'Assign by event time, count or drop, advance the watermark, then finalize what it covers.',
  },
];

export const lateExercise: Exercise = {
  id: 'late-events',
  prompt:
    'Write `late_events(events, window, lateness)`, which returns the events a watermark-based stream drops.',
  starter: `def late_events(events, window, lateness):
    # events: (event_time, arrival_time) pairs in arrival order.
    # Return the events that arrive after their window was emitted, in arrival order.
    return []`,
  hints: [
    'Keep a set of emitted window starts, a set of open ones, and the largest event time seen so far.',
    'For each event: its window starts at `event_time // window * window`. If that start is emitted, the event is late; otherwise mark the window open.',
    'Then set `watermark = max_seen - lateness` and move every open window with `start + window <= watermark` to emitted.',
  ],
  solution: `def late_events(events, window, lateness):
    emitted = set()
    open_windows = set()
    late = []
    max_seen = float("-inf")
    for event_time, arrival in events:
        start = event_time // window * window
        if start in emitted:
            late.append((event_time, arrival))
        else:
            open_windows.add(start)
        max_seen = max(max_seen, event_time)
        watermark = max_seen - lateness
        for s in list(open_windows):
            if s + window <= watermark:
                emitted.add(s)
                open_windows.discard(s)
    return late`,
  explanation:
    'The order matters: an event is checked against the windows emitted before it arrived, and only then can it move the watermark and close windows. That is why (2, 11) is late at 3 minutes of lateness: event (8, 9) had already pushed the watermark to 5 and closed [0, 5).',
  tests: `EVENTS = [(1, 2), (3, 3), (4, 6), (6, 7), (8, 9), (2, 11), (11, 12), (9, 13),
          (13, 14), (14, 16), (17, 18), (19, 20), (7, 21), (22, 23), (24, 25), (26, 27)]
assert late_events(EVENTS, 5, 3) == [(2, 11), (7, 21)], 'with 5-minute windows and 3 minutes of lateness, (2, 11) and (7, 21) are late'
assert late_events(EVENTS, 5, 0) == [(2, 11), (9, 13), (7, 21)], 'with no allowed lateness, (9, 13) is late too'
assert late_events(EVENTS, 5, 10) == [], 'with 10 minutes of lateness nothing is late'
assert late_events([(1, 1), (6, 6), (12, 12)], 5, 0) == [], 'events that arrive in order are never late'
assert late_events([(1, 1), (12, 12), (3, 13)], 5, 2) == [(3, 13)], 'the watermark reached 10 at minute 12, so [0, 5) was already emitted when 3 arrived'`,
};
