import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pruning',
    type: 'choice',
    prompt:
      "The events are partitioned by day. A query filters on country = 'NO' over the whole month. How many day partitions can it skip?",
    options: [
      {
        text: 'None: the files are split by day, and every day contains Norwegian events',
        correct: true,
        explain:
          'Pruning works only for filters on the partition column. Filtering on country still opens all 30 files (though it reads only the needed columns).',
      },
      {
        text: '29 of 30',
        correct: false,
        explain:
          'That would need a partition by country. A filter on another column cannot rule out a day folder.',
      },
    ],
  },
  {
    id: 'columns',
    type: 'choice',
    prompt:
      'Why does the single Parquet file read far less than the CSV for SELECT country, SUM(amount), even with no partitions?',
    options: [
      {
        text: 'Parquet stores each column separately, so the reader fetches only the country, amount and day chunks',
        correct: true,
        explain:
          'That is about 228 kB of a 3.3 MB file here. The CSV has to be read and parsed in full, 4.7 MB, because each line mixes all columns.',
      },
      {
        text: 'Parquet files are always 10 times smaller',
        correct: false,
        explain:
          'Here the whole Parquet file is about 71% of the CSV, because the random payload column barely compresses. The big saving comes from skipping columns.',
      },
    ],
  },
  {
    id: 'choose',
    type: 'choice',
    prompt:
      'A 20-person company has 50 GB of sales data, analysts who write SQL, and no data platform team. What is a sensible start?',
    options: [
      {
        text: 'A managed cloud warehouse: SQL, schemas and access control out of the box, priced by use',
        correct: true,
        explain:
          'At this size the warehouse costs little and needs no infrastructure work. A lakehouse pays off with large or varied data and several engines.',
      },
      {
        text: 'A self-managed lakehouse on Spark',
        correct: false,
        explain:
          'It works, but someone has to run clusters, compaction and the table format. That is a team’s job, not a side task.',
      },
      {
        text: 'Raw CSV files in a bucket',
        correct: false,
        explain:
          'No schema, no transactions, slow queries: analysts would spend their time cleaning instead of analyzing.',
      },
    ],
  },
  {
    id: 'table-format',
    type: 'choice',
    prompt: 'What does Delta Lake or Iceberg add on top of a folder of Parquet files?',
    options: [
      {
        text: 'A log of commits that lists the files in each version: atomic writes, updates and deletes, schema checks and time travel',
        correct: true,
        explain:
          'The Parquet files stay the same; the metadata layer decides which of them form the current table.',
      },
      {
        text: 'A faster compression codec',
        correct: false,
        explain:
          'The data files are ordinary Parquet. The table format is about which files belong to the table, and when.',
      },
      {
        text: 'A server that must hold the data in memory',
        correct: false,
        explain:
          'Table formats are files in the same storage. Any engine that understands the format can read them.',
      },
    ],
  },
  {
    id: 'bytes',
    type: 'numeric',
    prompt:
      'One day partition stores country in 845 bytes, amount in 12,043 bytes, and has a 3,686-byte footer. How many bytes does a one-day SELECT country, SUM(amount) read from it?',
    answer: 16574,
    tolerance: 0,
    hint: 'Add the two column chunks the query needs and the footer the reader uses to find them.',
    explain: '845 + 12,043 + 3,686 = 16,574 bytes, out of a 125,779-byte file.',
  },
];

export const pruneExercise: Exercise = {
  id: 'prune-files',
  prompt: 'Write `files_to_read(paths, column, low, high)` for partition pruning.',
  starter: `def files_to_read(paths, column, low, high):
    # paths look like "events/day=2026-10-03/country=NO/part-0.parquet"
    # Return the paths whose value for column is between low and high (inclusive), in order.
    return paths`,
  hints: [
    'Split each path on "/" and find the part that starts with `column + "="`.',
    'The value is the text after the "=". Compare it as a string: ISO dates sort correctly as text.',
    'Keep the path when `low <= value <= high`.',
  ],
  solution: `def files_to_read(paths, column, low, high):
    keep = []
    for path in paths:
        for part in path.split("/"):
            if part.startswith(column + "="):
                value = part.split("=", 1)[1]
                if low <= value <= high:
                    keep.append(path)
    return keep`,
  explanation:
    'This is what an engine does before opening any file: the partition values are in the paths, so skipped folders cost nothing. It only works for filters on partition columns, which is why the partition column should be the one most queries filter on.',
  tests: `paths = [
    "events/day=2026-10-01/country=NO/part-0.parquet",
    "events/day=2026-10-02/country=GB/part-0.parquet",
    "events/day=2026-10-02/country=NO/part-0.parquet",
    "events/day=2026-10-03/country=NO/part-0.parquet",
]
assert files_to_read(paths, "day", "2026-10-02", "2026-10-03") == paths[1:], 'days 2 and 3 are kept, day 1 is skipped'
assert files_to_read(paths, "country", "NO", "NO") == [paths[0], paths[2], paths[3]], 'any partition column can be used'
assert files_to_read(paths, "day", "2026-11-01", "2026-11-30") == [], 'a range with no partitions reads nothing'`,
};
