// Code for the SQL and data formats intro. sql.py's output for every query the builder can make was
// produced with CPython 3.13.18 and SQLite 3.53.1 (sqlQuery.test.ts checks the browser's results against
// that run). The pandas and formats programs were run with pandas 3.0.5 and pyarrow 26.0.0; the output
// shown is from that run.
import { SQL_SOURCE, sqlExperiment, sqlSlots, type SqlState } from '@/lib/data/sqlQuery';
import type { CodeExample } from '@/lib/types';

export const sql = sqlExperiment('sql');

export const sqlPython: CodeExample = {
  id: 'sql-python',
  language: 'python',
  source: SQL_SOURCE,
  slots: { query: (s) => sqlSlots(s as SqlState).query },
  annotations: [
    {
      id: 'connect',
      range: { line: 3 },
      kind: 'framework',
      title: 'sqlite3.connect(":memory:")',
      what: 'Opens a SQLite database that lives only in memory, for as long as the program runs.',
      why: 'SQLite ships with Python, so there is nothing to install. A file name instead of ":memory:" would keep the data on disk.',
    },
    {
      id: 'create',
      range: { line: 4 },
      kind: 'syntax',
      title: 'CREATE TABLE sales (...)',
      what: 'Declares the table: four columns, each with a type. id is the primary key, so no two rows share it.',
      why: 'The schema says what every row looks like. Queries can rely on it: amount is always a whole number here.',
    },
    {
      id: 'insert',
      range: { line: 5 },
      kind: 'function',
      title: 'conn.executemany("INSERT ... VALUES (?, ?, ?, ?)", rows)',
      what: 'Inserts every tuple in the list as one row. Each ? is replaced by one value from the tuple.',
      why: "Placeholders let the database handle quoting. Building SQL by gluing strings together breaks on a name like O'Brien and invites SQL injection.",
    },
    {
      id: 'query',
      range: { line: 11, startCol: 9, endCol: 18 },
      match: '{{query}}',
      kind: 'parameter',
      title: 'The query',
      what: 'The SELECT statement built by the controls above.',
      why: 'Change the filter, grouping or order and this line, the tables and the printed rows change together.',
    },
    {
      id: 'loop',
      range: { line: 12 },
      kind: 'syntax',
      title: 'for row in conn.execute(query)',
      what: 'Runs the query and yields one Python tuple per result row.',
      why: 'Rows come back as tuples in the order of the SELECT list, which is what print shows.',
    },
  ],
};

/** The same sqlite3 setup, run in the browser with a query the learner can edit. */
export const sqlRunner: CodeExample = {
  id: 'sql-runner',
  language: 'python',
  run: 'pyodide',
  source: `import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE sales (id INTEGER PRIMARY KEY, city TEXT, product TEXT, amount INTEGER)")
conn.executemany("INSERT INTO sales VALUES (?, ?, ?, ?)", [
    (1, "Oslo", "tea", 12), (2, "Leeds", "coffee", 30), (3, "Oslo", "coffee", 25),
    (4, "Austin", "tea", 8), (5, "Leeds", "tea", 15), (6, "Oslo", "cake", 20),
    (7, "Austin", "coffee", 40), (8, "Leeds", "cake", 9),
])

# Try your own: which product sells most in Leeds?
query = """
SELECT product, SUM(amount) AS total
FROM sales
WHERE city = 'Leeds'
GROUP BY product
ORDER BY total DESC
"""
for row in conn.execute(query):
    print(row)`,
  annotations: [],
  expectedOutput: `('coffee', 30)
('tea', 15)
('cake', 9)`,
};

export const pandasSql: CodeExample = {
  id: 'pandas-sql',
  language: 'python',
  source: `import sqlite3

import pandas as pd

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE sales (id INTEGER PRIMARY KEY, city TEXT, product TEXT, amount INTEGER)")
conn.executemany("INSERT INTO sales VALUES (?, ?, ?, ?)", [
    (1, "Oslo", "tea", 12), (2, "Leeds", "coffee", 30), (3, "Oslo", "coffee", 25),
    (4, "Austin", "tea", 8), (5, "Leeds", "tea", 15), (6, "Oslo", "cake", 20),
    (7, "Austin", "coffee", 40), (8, "Leeds", "cake", 9),
])

totals = pd.read_sql("SELECT city, SUM(amount) AS total FROM sales GROUP BY city", conn)
print(totals)
print(totals.dtypes)

totals["share"] = (totals["total"] / totals["total"].sum()).round(3)
totals.to_sql("city_totals", conn, index=False, if_exists="replace")
print(conn.execute("SELECT * FROM city_totals ORDER BY share DESC").fetchall())`,
  annotations: [
    {
      id: 'read-sql',
      range: { line: 13 },
      kind: 'framework',
      title: 'pd.read_sql(query, conn)',
      what: 'Runs the query and returns the result as a DataFrame, with column names taken from the SELECT list.',
      why: 'Let the database filter and group, then pull only the small result into pandas. Reading a whole table to filter it in pandas moves far more data.',
    },
    {
      id: 'dtypes',
      range: { line: 15 },
      kind: 'function',
      title: 'totals.dtypes',
      what: 'The type pandas chose for each column: text became str and the integer sum became int64.',
      why: 'Types come from the database driver. Check them after loading: a number stored as text arrives as text.',
    },
    {
      id: 'to-sql',
      range: { line: 18 },
      kind: 'framework',
      title: 'df.to_sql(name, conn, index=False, if_exists="replace")',
      what: 'Writes the DataFrame to a table, creating it from the column types. if_exists="replace" drops an existing table of that name first.',
      why: 'index=False leaves out pandas\' row numbers, which are not data. "replace" makes a rerun give the same table instead of appending a second copy.',
    },
  ],
  expectedOutput: `     city  total
0  Austin     48
1   Leeds     54
2    Oslo     57
city       str
total    int64
dtype: object
[('Oslo', 57, 0.358), ('Leeds', 54, 0.34), ('Austin', 48, 0.302)]`,
};

export const formatsCode: CodeExample = {
  id: 'formats-sizes',
  language: 'python',
  source: `import os
import random

import pandas as pd

random.seed(0)
n = 10_000
df = pd.DataFrame({
    "order_id": range(1, n + 1),
    "city": [random.choice(["Oslo", "Leeds", "Austin"]) for _ in range(n)],
    "amount": [round(random.uniform(5, 50), 2) for _ in range(n)],
    "ordered_at": pd.date_range("2026-10-01", periods=n, freq="min"),
})

df.to_csv("orders.csv", index=False)
df.to_json("orders.jsonl", orient="records", lines=True, date_format="iso")
df.to_parquet("orders.parquet")  # pyarrow, snappy compression by default

for name in ["orders.csv", "orders.jsonl", "orders.parquet"]:
    print(f"{name:<15} {os.path.getsize(name):>8,} bytes")

print(pd.read_csv("orders.csv").dtypes["ordered_at"])
print(pd.read_parquet("orders.parquet").dtypes["ordered_at"])`,
  annotations: [
    {
      id: 'csv',
      range: { line: 15 },
      kind: 'framework',
      title: 'to_csv',
      what: 'One line of comma-separated text per row, with a header line of column names.',
      why: 'Readable by every tool, but it stores no types: a timestamp is just text.',
    },
    {
      id: 'json',
      range: { line: 16 },
      kind: 'framework',
      title: 'to_json(orient="records", lines=True)',
      what: 'JSON Lines: one JSON object per row, with every key repeated on every line.',
      why: 'The repeated keys make it the largest of the three, but JSON can nest objects and lists, which CSV cannot.',
    },
    {
      id: 'parquet',
      range: { line: 17 },
      kind: 'framework',
      title: 'to_parquet',
      what: 'A binary, column-by-column file with the schema stored inside it, compressed with Snappy by default.',
      why: 'Values of one column sit together and compress well, and a reader can fetch only the columns it needs.',
    },
    {
      id: 'types',
      range: { line: 22 },
      kind: 'function',
      title: 'Reading the types back',
      what: 'From CSV, ordered_at comes back as text (str). From Parquet it comes back as a timestamp.',
      why: 'CSV loses types on the way out; every reader must guess them again. Parquet carries them in the file.',
    },
  ],
  expectedOutput: `orders.csv       366,671 bytes
orders.jsonl     866,639 bytes
orders.parquet   174,419 bytes
str
datetime64[us]`,
};
