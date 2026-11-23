import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'dups',
    type: 'numeric',
    prompt: 'A job appends rows one at a time and saves a checkpoint after every 4 rows. It crashes after writing row 10 of 20. The rerun resumes after the last checkpoint and appends the rest. How many duplicate rows does the table have?',
    answer: 2,
    tolerance: 0,
    hint: 'The last checkpoint before the crash was after row 8.',
    explain: 'Rows 1-10 are written, the checkpoint says 8. The rerun writes 9-20 again, so rows 9 and 10 appear twice: 2 duplicates.',
  },
  {
    id: 'partition',
    type: 'choice',
    prompt: 'A daily job writes scores for one day. Which design makes rerunning any past day safe?',
    options: [
      { text: 'Append the day’s rows to one big table, then deduplicate weekly', correct: false, explain: 'Between clean-ups every reader sees duplicates, and the clean-up is a second job to keep correct.' },
      { text: 'Overwrite the day’s own partition (day=2026-11-22) atomically', correct: true, explain: 'Each run owns one partition and replaces it whole. Rerunning a day gives the same result as running it once.' },
      { text: 'Delete every row older than the day, then insert the new rows', correct: false, explain: 'That destroys history, and a crash between the delete and the insert leaves nothing.' },
    ],
  },
  {
    id: 'atomic',
    type: 'choice',
    prompt: 'Why write to a temporary file and os.replace() it into place, instead of writing the target directly?',
    options: [
      { text: 'os.replace() compresses the file while it renames it', correct: false, explain: 'A rename does not touch the contents.' },
      { text: 'Writing directly is slower because of file locking', correct: false, explain: 'Speed is about the same; the difference is what readers can observe.' },
      { text: 'A reader or a crash never sees a half-written target', correct: true, explain: 'The rename is atomic on one file system: the old file or the complete new one, nothing in between.' },
    ],
  },
  {
    id: 'one-txn',
    type: 'choice',
    prompt: 'Rows and the checkpoint are committed in the same database transaction. What happens on a crash and rerun with plain INSERTs?',
    options: [
      { text: 'Duplicates for the rows after the last checkpoint', correct: false, explain: 'Those rows were never committed: the crash rolled them back with the checkpoint they belonged to.' },
      { text: 'No duplicates and nothing missing', correct: true, explain: 'Data and progress are saved together, so the checkpoint can never lag the data. That is exactly-once on rerun.' },
      { text: 'Missing rows for everything before the checkpoint', correct: false, explain: 'Everything up to the checkpoint was committed and stays.' },
    ],
  },
  {
    id: 'order-safe',
    type: 'order',
    prompt: 'Order the steps of a rerun-safe batch job.',
    items: ['Take the lock (or skip if a run is active)', 'Read the checkpoint', 'Process the next chunk', 'Commit the chunk and the new checkpoint together', 'Release the lock and report'],
    explain: 'The lock prevents overlap; reading the checkpoint first makes the run resumable; committing data and progress together keeps them consistent.',
  },
];

export const rerunExercise: Exercise = {
  id: 'resume-job',
  prompt:
    'Write `run(items, state, table, crash_after=None)` for a job that upserts items into `table` (a dict from key to value) and keeps its progress in `state["done"]` (the number of items finished, starting at 0). It processes `items` (a list of (key, value) pairs) from position `state["done"]` on. After every item it writes the item and then sets `state["done"]`. If `crash_after` is given, it raises `RuntimeError` when it is about to process that many items in this run. Calling it again after a crash must finish the job with no duplicates and no item processed twice.',
  starter: `def run(items, state, table, crash_after=None):
    for key, value in items:
        table[key] = value`,
  hints: [
    'Loop over items[state["done"]:] with a counter for this run.',
    'Check the crash condition before doing any work for the item, then write table[key] and increment state["done"].',
  ],
  solution: `def run(items, state, table, crash_after=None):
    state.setdefault("done", 0)
    for n, (key, value) in enumerate(items[state["done"]:]):
        if crash_after is not None and n == crash_after:
            raise RuntimeError(f"crashed after {n} items")
        table[key] = value
        state["done"] += 1`,
  explanation:
    'Upserting by key makes the write idempotent, and the progress marker makes the rerun cheap. In a real job, store the marker in the same transaction as the data.',
  tests: `items = [(f"c{i}", i * i) for i in range(10)]
state, table, seen = {}, {}, []
class Spy(dict):
    def __setitem__(self, k, v):
        seen.append(k)
        super().__setitem__(k, v)
table = Spy()
try:
    run(items, state, table, crash_after=6)
except RuntimeError:
    pass
else:
    raise AssertionError("expected a crash")
assert state["done"] == 6 and len(table) == 6
run(items, state, table)
assert dict(table) == dict(items)
assert seen == [k for k, _ in items], seen
run(items, state, table)
assert seen == [k for k, _ in items], "a finished job must do nothing on rerun"`,
};
