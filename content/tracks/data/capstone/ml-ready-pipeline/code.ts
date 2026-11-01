// Code for data/capstone/ml-ready-pipeline. pipeline.py uses only the Python standard library (sqlite3, json,
// random); the output shown is from running it with CPython 3.13.18 and SQLite 3.53.1, twice, with identical
// results.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'capstone-pipeline-setup',
  language: 'bash',
  source: `mkdir ml-ready-pipeline && cd ml-ready-pipeline
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install pytest==9.2.0            # the reference pipeline itself needs only the standard library
python pipeline.py                   # creates raw/ and warehouse.db
sqlite3 warehouse.db "SELECT * FROM quarantine"`,
  annotations: [],
};

export const pipelineCode: CodeExample = {
  id: 'capstone-pipeline-code',
  language: 'python',
  source: `"""A small ML-ready pipeline: land raw orders, validate, load idempotently, check, build point-in-time features."""
import json
import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

RAW = Path("raw")
DB = "warehouse.db"
START = date(2026, 10, 1)


def extract(day):  # stands in for an API: the same day always returns the same orders
    rng = random.Random(day.toordinal())
    orders = [{"order_id": f"{day:%m%d}-{i}", "customer": f"C{rng.randint(1, 20)}",
               "amount": round(rng.uniform(5, 120), 2), "day": day.isoformat()} for i in range(rng.randint(6, 10))]
    if rng.random() < 0.3:
        orders.append(dict(orders[0]))  # the source sometimes sends a duplicate
    if rng.random() < 0.3:
        orders.append({"order_id": f"{day:%m%d}-x", "customer": None, "amount": 12.5, "day": day.isoformat()})
    if rng.random() < 0.2:
        orders.append({"order_id": f"{day:%m%d}-r", "customer": "C3", "amount": -40.0, "day": day.isoformat()})
    path = RAW / f"day={day}" / "orders.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(orders))  # overwrite: landing a day twice gives the same file
    return path


def validate(rows):
    good, bad, seen = [], [], set()
    for r in rows:
        problem = ("missing customer" if not r["customer"] else "negative amount" if r["amount"] < 0
                   else "duplicate order_id" if r["order_id"] in seen else None)
        (bad if problem else good).append((r, problem))
        seen.add(r["order_id"])
    return [r for r, _ in good], [(r, p) for r, p in bad]


def load(con, day, good, bad):  # idempotent: replace the day's rows in one transaction
    with con:
        con.execute("DELETE FROM orders WHERE day = ?", (day.isoformat(),))
        con.execute("DELETE FROM quarantine WHERE day = ?", (day.isoformat(),))
        con.executemany("INSERT INTO orders VALUES (:order_id, :customer, :amount, :day)", good)
        con.executemany("INSERT INTO quarantine VALUES (?, ?, ?)",
                        [(r["order_id"], day.isoformat(), p) for r, p in bad])


def check(con, day):
    rows = con.execute("SELECT COUNT(*), COUNT(DISTINCT order_id), MIN(amount) FROM orders WHERE day = ?",
                       (day.isoformat(),)).fetchone()
    assert rows[0] > 0, f"{day}: no orders loaded"
    assert rows[0] == rows[1], f"{day}: duplicate order_id"
    assert rows[2] >= 0, f"{day}: negative amount"
    return rows[0]


def build_features(con, day):  # snapshot written at the end of \`day\`: orders in the 7 days up to it
    with con:
        con.execute("DELETE FROM features WHERE snapshot_day = ?", (day.isoformat(),))
        con.execute("""INSERT INTO features
            SELECT customer, ?, COUNT(*), ROUND(SUM(amount), 2) FROM orders
            WHERE day > date(?, '-7 days') AND day <= ? GROUP BY customer""", (day.isoformat(),) * 3)


def run(con, day):
    path = extract(day)
    good, bad = validate(json.loads(path.read_text()))
    load(con, day, good, bad)
    n = check(con, day)
    build_features(con, day)
    print(f"{day}  loaded {n:2}  quarantined {len(bad)}")


con = sqlite3.connect(DB)
con.executescript("""
CREATE TABLE IF NOT EXISTS orders (order_id TEXT PRIMARY KEY, customer TEXT, amount REAL, day TEXT);
CREATE TABLE IF NOT EXISTS quarantine (order_id TEXT, day TEXT, problem TEXT);
CREATE TABLE IF NOT EXISTS features (customer TEXT, snapshot_day TEXT, orders_7d INT, spend_7d REAL);
""")
for i in range(14):
    run(con, START + timedelta(days=i))
run(con, START + timedelta(days=9))  # a rerun (or backfill) of one day changes nothing
print("orders:", con.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
      "quarantine:", con.execute("SELECT problem, COUNT(*) FROM quarantine GROUP BY problem").fetchall())

# training set: predict on 2026-10-12 whether each customer orders in the next 3 days, with features as of the
# end of 2026-10-11 (point-in-time correct)
train = con.execute("""
    SELECT f.customer, f.orders_7d, f.spend_7d,
           EXISTS (SELECT 1 FROM orders o WHERE o.customer = f.customer
                   AND o.day BETWEEN '2026-10-12' AND '2026-10-14') AS label
    FROM features f WHERE f.snapshot_day = '2026-10-11' ORDER BY f.customer""").fetchall()
print(f"training rows: {len(train)}, positive: {sum(r[3] for r in train)}")
for row in train[:4]:
    print(row)`,
  annotations: [
    {
      id: 'extract',
      range: { line: 13 },
      kind: 'function',
      title: 'extract(day)',
      what: 'Writes one day of raw orders to raw/day=YYYY-MM-DD/orders.json. Here a seeded generator stands in for an API.',
      why: 'Landing raw data unchanged means you can always rebuild everything downstream. Overwriting the day’s file keeps landing idempotent.',
    },
    {
      id: 'validate',
      range: { line: 29 },
      kind: 'function',
      title: 'validate(rows)',
      what: 'Splits rows into good rows and quarantined rows, each with the rule it broke.',
      why: 'Bad rows are kept and explained instead of dropped silently or failing the whole load.',
    },
    {
      id: 'load',
      range: { line: 39 },
      kind: 'function',
      title: 'load(con, day, good, bad)',
      what: 'Deletes the day’s rows and inserts them again, in one transaction.',
      why: 'Delete-then-insert per day makes retries, reruns and backfills safe: running a day twice equals running it once.',
    },
    {
      id: 'check',
      range: { line: 48 },
      kind: 'function',
      title: 'check(con, day)',
      what: 'Data tests on what was loaded: rows exist, order_id is unique, no negative amounts.',
      why: 'A failed assert stops the run before features are built from wrong data.',
    },
    {
      id: 'features',
      range: { line: 57 },
      kind: 'function',
      title: 'build_features(con, day)',
      what: 'Writes one snapshot per customer for the day: orders and spend in the 7 days up to it.',
      why: 'Keeping a snapshot per day is what makes point-in-time correct training sets possible.',
    },
    {
      id: 'rerun',
      range: { line: 82 },
      kind: 'variable',
      title: 'A rerun',
      what: 'Runs 10 October a second time.',
      why: 'The totals that follow are unchanged, which shows the pipeline is idempotent.',
    },
    {
      id: 'train',
      range: { line: 89 },
      kind: 'framework',
      title: 'The training set',
      what: 'Labels from 12 to 14 October, features from the snapshot written at the end of 11 October.',
      why: 'The features use only data from before the prediction moment, so the training set matches what serving would see.',
    },
  ],
};

export const pipelineOutput: CodeExample = {
  id: 'capstone-pipeline-output',
  language: 'bash',
  source: `python pipeline.py
# 2026-10-01  loaded  6  quarantined 1
# 2026-10-02  loaded  7  quarantined 1
# 2026-10-03  loaded  9  quarantined 0
# 2026-10-04  loaded 10  quarantined 0
# 2026-10-05  loaded  6  quarantined 1
# 2026-10-06  loaded  7  quarantined 0
# 2026-10-07  loaded  6  quarantined 1
# 2026-10-08  loaded  6  quarantined 0
# 2026-10-09  loaded  8  quarantined 1
# 2026-10-10  loaded 10  quarantined 1
# 2026-10-11  loaded  7  quarantined 1
# 2026-10-12  loaded 10  quarantined 0
# 2026-10-13  loaded  6  quarantined 1
# 2026-10-14  loaded  6  quarantined 0
# 2026-10-10  loaded 10  quarantined 1
# orders: 104 quarantine: [('duplicate order_id', 2), ('missing customer', 4), ('negative amount', 2)]
# training rows: 19, positive: 12
# ('C1', 3, 211.28, 0)
# ('C10', 1, 82.14, 0)
# ('C11', 3, 89.2, 0)
# ('C12', 2, 187.82, 1)`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Build a pipeline that turns raw order data into a point-in-time correct training set for a "will this customer order again soon?" model, and keeps doing so reliably: ingestion with retries, validation with a quarantine, idempotent loads, orchestration with backfills, data tests and monitoring, and a runbook someone else could follow.',
  dataset:
    'Start with the reference pipeline’s generated orders (seeded, so everyone gets the same numbers). Then swap in a real source: a public API with pagination, or a public e-commerce dataset of order lines split into daily files. Anything with customers, timestamps and amounts works.',
  milestones: [
    'Run pipeline.py, inspect raw/, the quarantine and the features table, then run it again and confirm every count is unchanged',
    'Replace the generator with a real source: paginate, retry temporary failures with backoff, and land each day’s raw data unchanged',
    'Write validation rules for every column and quarantine failures with the rule that failed; detect a new or missing column',
    'Load into a warehouse or lakehouse table (SQLite, DuckDB, or Parquet partitioned by day) so that rerunning any day replaces it',
    'Orchestrate the steps as a DAG with retries, a logical date per run and a backfill command for a date range',
    'Add data tests that block publishing (schema, uniqueness, ranges) and warnings for freshness and volume against a 7-day median',
    'Build daily feature snapshots and a point-in-time correct training set, with a test that fails if any feature comes from after its prediction day',
    'Write a README and runbook: how to run, rerun and backfill, what each alert means and what to do, and what the pipeline costs and may access',
  ],
  rubric: [
    {
      criterion: 'Ingestion',
      detail:
        'Pagination and retries are handled; raw data is landed unchanged and partitioned by day, so any day can be replayed.',
    },
    {
      criterion: 'Validation',
      detail:
        'Every rule is explicit; bad rows are quarantined with a reason, and a schema change is detected rather than loaded.',
    },
    {
      criterion: 'Idempotency',
      detail:
        'Running any day twice, or backfilling a range, leaves the same tables as running it once; a test shows it.',
    },
    {
      criterion: 'Orchestration',
      detail:
        'Dependencies are explicit, failures block downstream tasks, retries have backoff, and each run processes its own date.',
    },
    {
      criterion: 'Quality and monitoring',
      detail:
        'Blocking checks guard correctness, warnings cover freshness and volume, and breaking the data on purpose makes them fire.',
    },
    {
      criterion: 'ML readiness',
      detail:
        'Features are snapshots with history; the training set uses as-of joins and a test proves no row uses future data.',
    },
    {
      criterion: 'Operations',
      detail:
        'The runbook lets a newcomer run, rerun, backfill and recover; configuration and credentials are kept out of the code.',
    },
    {
      criterion: 'Code quality',
      detail:
        'Steps are small functions with tests; a fresh clone and one command reproduce the tables and the training set.',
    },
  ],
  hints: [
    'Test idempotency directly: run a day, snapshot the tables (row counts and a hash of sorted rows), run it again and compare.',
    'Keep the logical date as a parameter everywhere. Nothing below the scheduler should call date.today().',
    'For the leakage test, join each training row back to the snapshot it used and assert snapshot_day < prediction_day.',
    'Break things on purpose: delete a column from one raw file, duplicate a day, stop the source for two days. Each should be caught by a specific check.',
    'If you use DuckDB or Parquet, partition by day and overwrite only the partition for the run’s date.',
  ],
};
