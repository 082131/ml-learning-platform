// Code for the warehouses, lakes and lakehouses lesson. The byte counts come from real files written by
// src/lib/data/fixtures/lake_sizes.py (pandas 3.0.5, pyarrow 26.0.0). query.py ran with DuckDB 2.0.0 and
// delta_demo.py with deltalake 1.6.6, both on CPython 3.13.18; the outputs shown are from those runs.
import { lakeExperiment, lakeSlots, type LakeState } from '@/lib/data/lakeScan';
import type { CodeExample } from '@/lib/types';

export const lake = lakeExperiment('lake');

const st = (s: unknown) => s as LakeState;

export const lakeSql: CodeExample = {
  id: 'lake-sql',
  language: 'sql',
  source: `SELECT {{select}}
FROM read_parquet('events/*/*.parquet', hive_partitioning = true)
WHERE day >= DATE '{{start}}'
{{groupBy}}`,
  slots: {
    select: (s) => lakeSlots(st(s)).select,
    start: (s) => lakeSlots(st(s)).start,
    groupBy: (s) => lakeSlots(st(s)).groupBy,
  },
  annotations: [
    {
      id: 'select',
      range: { line: 1, startCol: 7, endCol: 17 },
      match: '{{select}}',
      kind: 'parameter',
      title: 'Which columns',
      what: 'The columns the query needs. Filled from the "Columns" control.',
      why: 'Parquet stores each column separately, so naming 2 columns reads 2 column chunks per file. SELECT * reads them all.',
    },
    {
      id: 'glob',
      range: { line: 2 },
      kind: 'framework',
      title: "read_parquet('events/*/*.parquet', hive_partitioning = true)",
      what: 'Reads every Parquet file under events/, and turns folder names like day=2026-10-24 into a day column.',
      why: 'The partition value lives in the path, so the engine knows each file’s day before opening it.',
    },
    {
      id: 'where',
      range: { line: 3 },
      kind: 'syntax',
      title: 'WHERE day >= ...',
      what: 'Keeps the last N days of October. Filled from the slider.',
      why: 'Because day is a partition column, files for other days are skipped entirely: partition pruning.',
    },
  ],
};

export const duckdbRun: CodeExample = {
  id: 'duckdb-run',
  language: 'python',
  source: `import duckdb

rows = duckdb.sql("""
    SELECT country, round(SUM(amount), 2) AS revenue
    FROM read_parquet('events/*/*.parquet', hive_partitioning = true)
    WHERE day >= DATE '2026-10-24'
    GROUP BY country
    ORDER BY country
""").fetchall()
for row in rows:
    print(row)`,
  annotations: [
    {
      id: 'duckdb',
      range: { line: 3 },
      kind: 'framework',
      title: 'duckdb.sql(...)',
      what: 'Runs SQL in-process over files on disk, with no server and no loading step.',
      why: 'An engine over open files is the core idea of a lake: storage and compute are separate, and any engine can read the same files.',
    },
  ],
  expectedOutput: `('DE', 284944.3)
('FR', 276695.13)
('GB', 289860.1)
('NO', 283766.63)
('US', 277033.89)`,
};

export const deltaDemo: CodeExample = {
  id: 'delta-demo',
  language: 'python',
  source: `import os

import pandas as pd
from deltalake import DeltaTable, write_deltalake

v0 = pd.DataFrame({"order_id": [1, 2, 3], "amount": [30.0, 45.5, 12.0]})
write_deltalake("orders_delta", v0)                      # version 0: one Parquet file
write_deltalake("orders_delta", pd.DataFrame({"order_id": [4], "amount": [8.25]}), mode="append")  # version 1

dt = DeltaTable("orders_delta")
print("version:", dt.version())
print("files:", len(dt.file_uris()))
print(sorted(os.listdir("orders_delta/_delta_log")))
print(dt.to_pandas().sort_values("order_id")["amount"].tolist())

dt.delete("amount < 10")                                 # version 2: rewrites files, logs the change
print("after delete:", DeltaTable("orders_delta").to_pandas()["amount"].sort_values().tolist())
print("time travel to version 1:", DeltaTable("orders_delta", version=1).to_pandas()["amount"].sort_values().tolist())
print([h["operation"] for h in DeltaTable("orders_delta").history()])`,
  annotations: [
    {
      id: 'write',
      range: { line: 7 },
      kind: 'framework',
      title: 'write_deltalake',
      what: 'Writes Parquet files and a JSON commit in _delta_log saying which files make up version 0.',
      why: 'The table is the log plus the files it lists. A reader never sees a half-written version.',
    },
    {
      id: 'log',
      range: { line: 13 },
      kind: 'function',
      title: '_delta_log',
      what: 'One numbered JSON file per commit: which data files were added and removed.',
      why: 'This log is what turns a folder of Parquet files into a table with transactions and history.',
    },
    {
      id: 'delete',
      range: { line: 16 },
      kind: 'framework',
      title: 'dt.delete("amount < 10")',
      what: 'Rewrites the affected file without the matching rows and commits version 2.',
      why: 'Plain Parquet files are immutable: deleting a row means rewriting files. The log makes that swap atomic.',
    },
    {
      id: 'travel',
      range: { line: 18 },
      kind: 'function',
      title: 'DeltaTable(..., version=1)',
      what: 'Reads the table as it was at version 1, before the delete.',
      why: 'Old files stay until cleaned up (VACUUM), so you can reproduce a past training set or undo a bad write.',
    },
  ],
  expectedOutput: `version: 1
files: 2
['00000000000000000000.json', '00000000000000000001.json']
[30.0, 45.5, 12.0, 8.25]
after delete: [12.0, 30.0, 45.5]
time travel to version 1: [8.25, 12.0, 30.0, 45.5]
['DELETE', 'WRITE', 'WRITE']`,
};

/** Partition pruning in plain Python: which files a filter on the folder name lets you skip. */
export const pruneRunner: CodeExample = {
  id: 'prune-runner',
  language: 'python',
  run: 'pyodide',
  source: `files = [f"events/day=2026-10-{d:02d}/part-0.parquet" for d in range(1, 31)]


def partition_value(path, column):
    for part in path.split("/"):
        if part.startswith(column + "="):
            return part.split("=", 1)[1]


wanted = [f for f in files if partition_value(f, "day") >= "2026-10-24"]
print(len(files), "files,", len(wanted), "to read")
print(wanted[0])
print(wanted[-1])`,
  annotations: [],
  expectedOutput: `30 files, 7 to read
events/day=2026-10-24/part-0.parquet
events/day=2026-10-30/part-0.parquet`,
};
