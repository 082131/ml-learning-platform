import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-shuffle',
    type: 'choice',
    prompt: 'Which of these operations needs a shuffle?',
    options: [
      {
        text: 'groupBy("customer").sum("amount")',
        correct: true,
        explain:
          'All rows of one customer must meet in one task, wherever they started. That means moving them by key.',
      },
      {
        text: 'filter(col("amount") >= 20)',
        correct: false,
        explain:
          'A filter looks at one row at a time. Each task filters its own partition: a narrow transformation.',
      },
      {
        text: 'withColumn("amount_eur", col("amount") * 0.92)',
        correct: false,
        explain: 'Computing a column from the same row needs no other rows, so nothing moves.',
      },
    ],
  },
  {
    id: 'skew-time',
    type: 'numeric',
    prompt:
      'After a shuffle, four tasks receive 4, 2, 2 and 16 records. Each record takes one time unit and tasks run in parallel. How long does the stage take?',
    answer: 16,
    tolerance: 0,
    hint: 'A stage is done when its last task is done.',
    explain:
      'The stage waits for the 16-record task. The total work is 24, so with even keys 4 tasks could finish in 6.',
  },
  {
    id: 'more-partitions',
    type: 'choice',
    prompt:
      'A join is slow because one customer has 70% of the orders. Will raising spark.sql.shuffle.partitions from 200 to 2,000 fix it?',
    options: [
      {
        text: 'No: every record of that customer still hashes to the same single partition',
        correct: true,
        explain:
          'More partitions split the other keys finer, but one key always goes to one partition. Broadcast the small side, salt the key, or let adaptive skew-join handling split it.',
      },
      {
        text: 'Yes: the hot key is spread over ten times as many tasks',
        correct: false,
        explain:
          'Hash partitioning sends equal keys to equal partitions; that is the whole point of a shuffle.',
      },
    ],
  },
  {
    id: 'read-plan',
    type: 'choice',
    prompt: 'In a physical plan, what does "Exchange hashpartitioning(customer, 4)" tell you?',
    options: [
      {
        text: 'A shuffle: rows are redistributed into 4 partitions by a hash of customer',
        correct: true,
        explain: 'Each Exchange is a shuffle boundary, and a new stage starts above it.',
      },
      {
        text: 'The data is read from 4 files',
        correct: false,
        explain: 'Reading appears as a Scan or FileScan at the bottom of the plan.',
      },
      {
        text: 'The query uses 4 executors',
        correct: false,
        explain:
          'The 4 is the number of shuffle partitions, set by spark.sql.shuffle.partitions in the lesson.',
      },
    ],
  },
  {
    id: 'broadcast',
    type: 'choice',
    prompt: 'When is a broadcast join the right choice?',
    options: [
      {
        text: 'When one side is small enough to copy to every executor, such as a table of a few thousand customers',
        correct: true,
        explain:
          'The large side stays in place and no shuffle is needed. Spark does this automatically under 10 MB by default.',
      },
      {
        text: 'When both tables are huge',
        correct: false,
        explain:
          'Copying a huge table to every executor would run them out of memory. Large-large joins need a shuffle.',
      },
    ],
  },
];

export const partitionExercise: Exercise = {
  id: 'partition-sizes',
  prompt:
    'Write `partition_sizes(keys, n, hash_fn)`: how many records each of `n` shuffle partitions receives.',
  starter: `def partition_sizes(keys, n, hash_fn):
    # keys: one key per record. hash_fn(key) returns a non-negative int.
    # Return a list of n counts: records sent to partitions 0 .. n - 1.
    return []`,
  hints: ['Start with `sizes = [0] * n`.', 'Each record goes to partition `hash_fn(key) % n`; add 1 there.'],
  solution: `def partition_sizes(keys, n, hash_fn):
    sizes = [0] * n
    for key in keys:
        sizes[hash_fn(key) % n] += 1
    return sizes`,
  explanation:
    'max(sizes) is the stage time in the lesson’s model and sum(sizes) the total work. A hot key always adds all its records to one partition, which is why skew cannot be fixed by raising n.',
  tests: `import zlib
h = lambda k: zlib.crc32(k.encode())
keys = ["C1"] * 14 + ["C2", "C3", "C4", "C5", "C6"] * 2
assert sum(partition_sizes(keys, 4, h)) == 24, 'every record lands in exactly one partition'
assert partition_sizes(keys, 4, h) == [4, 2, 2, 16], 'C1 (14 orders) and C2 (2) share partition 3'
assert max(partition_sizes(keys, 6, h)) >= 14, 'more partitions cannot split one key'
assert partition_sizes([], 3, h) == [0, 0, 0], 'no records gives n empty partitions'`,
};
