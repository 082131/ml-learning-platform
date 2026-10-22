// Code for the ETL vs ELT lesson. The Python and SQL come from src/lib/data/fixtures/etl.py, which ran
// the pipeline for every injected record with CPython 3.13 and SQLite 3.45.1; etl.test.ts checks the
// browser's results against that run.
import { etlExperiment } from '@/lib/data/etlExperiment';
import { ELT_SQL, ELT_UNVALIDATED_SQL, ETL_PYTHON } from '@/lib/data/etlSources';
import type { CodeExample } from '@/lib/types';

export const pipeline = etlExperiment('etl');

export const etlPython: CodeExample = {
  id: 'etl-python',
  language: 'python',
  source: ETL_PYTHON,
  annotations: [
    {
      id: 'problem',
      range: { line: 10 },
      kind: 'function',
      title: 'def problem(row, id_counts)',
      what: 'Checks one raw row against every rule, in order, and returns the first rule it breaks.',
      why: 'One reason per row is enough to route it, and a written reason is what someone fixing the data needs.',
      inputs: 'A row of strings, straight from the CSV, and how often each order_id appears in the batch',
      output: 'A reason such as "unknown country code", or None',
    },
    {
      id: 'missing',
      range: { line: 12 },
      kind: 'syntax',
      title: 'Required fields',
      what: 'Fails a row if any field is an empty string.',
      why: 'CSV has no NULL: a missing value arrives as "". A NOT NULL column in the warehouse would accept "" happily.',
    },
    {
      id: 'decimal',
      range: { line: 14 },
      kind: 'framework',
      title: 're.fullmatch(r"[0-9]+(\\.[0-9]+)?", ...)',
      what: 'The amount must be digits, optionally a point and more digits, and nothing else.',
      why: 'It rejects "12,50" and "-20.00" before float() sees them. float("12,50") would crash the whole batch.',
    },
    {
      id: 'range',
      range: { line: 16 },
      kind: 'math',
      title: 'A range check',
      what: 'Rejects amounts above 1000, the largest order the shop allows.',
      why: 'A format check cannot tell 45.50 from 4550 (the same price in cents). A plausible-range check can.',
    },
    {
      id: 'country',
      range: { line: 18 },
      kind: 'syntax',
      title: 'An allowed-values check',
      what: 'The country must be one of the ISO 3166 codes the shop sells to.',
      why: '"UK" is a common mistake for GB. Unchecked, it creates a new group in every report by country.',
    },
    {
      id: 'dup',
      range: { line: 26 },
      kind: 'variable',
      title: 'Uniqueness',
      what: 'Fails every row whose order_id appears more than once in the batch.',
      why: 'Both copies go to quarantine, because the pipeline cannot know which one is right.',
    },
    {
      id: 'counter',
      range: { line: 32 },
      kind: 'framework',
      title: 'Counter(...)',
      what: 'Counts each order_id across the whole batch before any row is checked.',
      why: 'Uniqueness is a rule about the batch, not about one row, so it needs a first pass.',
    },
    {
      id: 'quarantine',
      range: { line: 39 },
      kind: 'syntax',
      title: 'quarantine.append({**row, "reason": reason})',
      what: 'Keeps the bad row, unchanged, with the reason added.',
      why: 'Dropping bad rows hides problems; quarantining them lets someone count, inspect, fix and replay them.',
    },
    {
      id: 'float',
      range: { line: 47 },
      kind: 'function',
      title: 'float(row["amount"])',
      what: 'Converts the text amount to a number.',
      why: 'Without validation in front of it, this is where "12,50" raises ValueError and stops the batch.',
    },
  ],
};

export const eltSql: CodeExample = {
  id: 'elt-sql',
  language: 'sql',
  source: ELT_SQL,
  annotations: [
    {
      id: 'view',
      range: { line: 1 },
      kind: 'framework',
      title: 'CREATE VIEW checked_orders',
      what: 'A saved query over raw_orders that adds a reason column to every raw row.',
      why: 'In ELT the raw data is already in the warehouse, so validation is SQL that runs where the data lives.',
    },
    {
      id: 'case',
      range: { line: 3 },
      kind: 'syntax',
      title: 'CASE WHEN ... THEN ...',
      what: 'Tries each rule in order and returns the first reason that applies, or NULL when none does.',
      why: 'The same rules, in the same order, as problem() in the ETL version.',
    },
    {
      id: 'glob',
      range: { line: 4 },
      kind: 'framework',
      title: 'GLOB patterns',
      what: 'Starts with a digit, contains only digits and points, has at most one point, and does not end with one.',
      why: 'SQLite has no built-in regular expressions. Together these four tests say what the Python regex says.',
    },
    {
      id: 'window',
      range: { line: 10 },
      kind: 'math',
      title: 'COUNT(*) OVER (PARTITION BY order_id)',
      what: 'For each row, how many rows in raw_orders share its order_id.',
      why: 'A window function counts across rows without collapsing them, so each duplicate row can be labeled.',
    },
    {
      id: 'insert-clean',
      range: { line: 15 },
      kind: 'syntax',
      title: 'The transform',
      what: 'Casts the text columns to their real types and inserts the rows that passed into orders.',
      why: 'The transform only sees validated rows, so the casts cannot quietly change a value.',
    },
    {
      id: 'insert-q',
      range: { line: 18 },
      kind: 'syntax',
      title: 'INSERT INTO orders_quarantine',
      what: 'Copies the failing raw rows, with their reasons, to a quarantine table.',
      why: 'The raw rows stay in raw_orders too, so a fixed rule can simply be rerun.',
    },
  ],
};

export const eltUnvalidated: CodeExample = {
  id: 'elt-unvalidated',
  language: 'sql',
  source: ELT_UNVALIDATED_SQL,
  annotations: [
    {
      id: 'cast',
      range: { line: 2 },
      kind: 'function',
      title: 'CAST(amount AS REAL)',
      what: 'SQLite converts the longest numeric prefix of the text and ignores the rest.',
      why: "CAST('12,50' AS REAL) is 12.0 with no error. The amount is silently wrong.",
    },
  ],
};

/** validate() and transform() on three rows, run in the browser. Uses only the standard library. */
export const validateRunner: CodeExample = {
  id: 'validate-runner',
  language: 'python',
  run: 'pyodide',
  source: `import re
from collections import Counter
from datetime import datetime

COUNTRIES = {"GB", "US", "NO", "DE", "FR"}
MAX_AMOUNT = 1000
FIELDS = ["order_id", "email", "amount", "country", "ordered_at"]


def problem(row, id_counts):
    """The first rule this row breaks, or None if it passes them all."""
    if any(row[f] == "" for f in FIELDS):
        return "missing field"
    if not re.fullmatch(r"[0-9]+(\\.[0-9]+)?", row["amount"]):
        return "amount is not a decimal number"
    if float(row["amount"]) > MAX_AMOUNT:
        return "amount above 1000"
    if row["country"] not in COUNTRIES:
        return "unknown country code"
    if not re.fullmatch(r".+@.+", row["email"]):
        return "email is not an address"
    try:
        datetime.fromisoformat(row["ordered_at"])
    except ValueError:
        return "ordered_at is not a valid timestamp"
    if id_counts[row["order_id"]] > 1:
        return "duplicate order_id"
    return None


def validate(rows):
    id_counts = Counter(row["order_id"] for row in rows)
    valid, quarantine = [], []
    for row in rows:
        reason = problem(row, id_counts)
        if reason is None:
            valid.append(row)
        else:
            quarantine.append({**row, "reason": reason})
    return valid, quarantine


def transform(row):
    return (
        int(row["order_id"]),
        row["email"],
        float(row["amount"]),
        row["country"],
        datetime.fromisoformat(row["ordered_at"]).isoformat(),
    )

rows = [
    {"order_id": "1001", "email": "ada@example.com", "amount": "30.00", "country": "GB", "ordered_at": "2026-10-01T09:15:00Z"},
    {"order_id": "1002", "email": "grace@example.com", "amount": "12,50", "country": "US", "ordered_at": "2026-10-01T10:02:00Z"},
    {"order_id": "1003", "email": "linus@example.com", "amount": "12.00", "country": "UK", "ordered_at": "2026-10-01T11:40:00Z"},
]
valid, quarantine = validate(rows)
print([transform(row) for row in valid])
for row in quarantine:
    print(row["order_id"], row["reason"])`,
  annotations: [],
  expectedOutput: `[(1001, 'ada@example.com', 30.0, 'GB', '2026-10-01T09:15:00+00:00')]
1002 amount is not a decimal number
1003 unknown country code`,
};
