# Generates etl-python.json: what the ETL lesson's pipeline really does for every mode, injected
# record and validation setting. ETL validates and transforms in Python, then loads into SQLite;
# ELT loads the raw text into SQLite and validates and transforms there in SQL. The code between the
# "lesson" markers is shown in the lesson verbatim (etl.test.ts checks that).
# Run: python3 src/lib/data/fixtures/etl.py   (CPython 3.13, SQLite 3.45.1)
import json
import pathlib
import sqlite3

GOOD = [
    {"order_id": "1001", "email": "ada@example.com", "amount": "30.00", "country": "GB", "ordered_at": "2026-10-01T09:15:00Z"},
    {"order_id": "1002", "email": "grace@example.com", "amount": "45.50", "country": "US", "ordered_at": "2026-10-01T10:02:00Z"},
    {"order_id": "1003", "email": "linus@example.com", "amount": "12.00", "country": "NO", "ordered_at": "2026-10-01T11:40:00Z"},
    {"order_id": "1004", "email": "margaret@example.com", "amount": "8.25", "country": "US", "ordered_at": "2026-10-01T12:05:00Z"},
    {"order_id": "1005", "email": "alan@example.com", "amount": "20.00", "country": "GB", "ordered_at": "2026-10-01T13:30:00Z"},
]
BASE = {"order_id": "1006", "email": "edsger@example.com", "amount": "15.00", "country": "NO", "ordered_at": "2026-10-01T14:10:00Z"}
BAD = {
    "none": {},
    "missing-email": {"email": ""},
    "negative": {"amount": "-20.00"},
    "comma": {"amount": "12,50"},
    "cents": {"amount": "4550"},
    "country": {"country": "UK"},
    "date": {"ordered_at": "2026-13-01T14:10:00Z"},
    "duplicate": {"order_id": "1002"},
}

# --- lesson: validate ---
import re
from collections import Counter
from datetime import datetime

COUNTRIES = {"GB", "US", "NO", "DE", "FR"}
MAX_AMOUNT = 1000
FIELDS = ["order_id", "email", "amount", "country", "ordered_at"]


def problem(row, id_counts):
    """The first rule this row breaks, or None if it passes them all."""
    if any(row[f] == "" for f in FIELDS):
        return "missing field"
    if not re.fullmatch(r"[0-9]+(\.[0-9]+)?", row["amount"]):
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
# --- end lesson ---

SCHEMA = """
CREATE TABLE raw_orders (order_id TEXT, email TEXT, amount TEXT, country TEXT, ordered_at TEXT);
CREATE TABLE orders (
    order_id   INTEGER PRIMARY KEY,
    email      TEXT NOT NULL,
    amount     REAL NOT NULL,
    country    TEXT NOT NULL,
    ordered_at TEXT NOT NULL
);
CREATE TABLE orders_quarantine (order_id TEXT, email TEXT, amount TEXT, country TEXT, ordered_at TEXT, reason TEXT);
"""

# --- lesson: elt-sql ---
ELT_VALIDATED = """
CREATE VIEW checked_orders AS
SELECT *, CASE
  WHEN '' IN (order_id, email, amount, country, ordered_at) THEN 'missing field'
  WHEN NOT (amount GLOB '[0-9]*' AND amount NOT GLOB '*[^0-9.]*'
            AND amount NOT GLOB '*.*.*' AND amount NOT GLOB '*.') THEN 'amount is not a decimal number'
  WHEN CAST(amount AS REAL) > 1000 THEN 'amount above 1000'
  WHEN country NOT IN ('GB', 'US', 'NO', 'DE', 'FR') THEN 'unknown country code'
  WHEN email NOT LIKE '_%@_%' THEN 'email is not an address'
  WHEN datetime(ordered_at) IS NULL THEN 'ordered_at is not a valid timestamp'
  WHEN COUNT(*) OVER (PARTITION BY order_id) > 1 THEN 'duplicate order_id'
END AS reason
FROM raw_orders;

INSERT INTO orders
SELECT CAST(order_id AS INTEGER), email, CAST(amount AS REAL), country, ordered_at
FROM checked_orders WHERE reason IS NULL;

INSERT INTO orders_quarantine
SELECT * FROM checked_orders WHERE reason IS NOT NULL;
"""
# --- end lesson ---

# --- lesson: elt-unvalidated ---
ELT_UNVALIDATED = """
INSERT INTO orders
SELECT CAST(order_id AS INTEGER), email, CAST(amount AS REAL), country, ordered_at
FROM raw_orders;
"""
# --- end lesson ---

REVENUE = "SELECT country, ROUND(SUM(amount), 2) FROM orders GROUP BY country ORDER BY country"
COLS = ["order_id", "email", "amount", "country", "ordered_at"]


def run(mode, bad, validation):
    rows = [dict(r) for r in GOOD]
    if BAD[bad] is not None:
        rows.append({**BASE, **BAD[bad]})
    con = sqlite3.connect(":memory:", isolation_level=None)
    con.executescript(SCHEMA)
    quarantine = []
    error = None
    try:
        if mode == "etl":
            if validation:
                rows, quarantine = validate(rows)
                quarantine = [[q["order_id"], q["reason"]] for q in quarantine]
            try:
                loaded = [transform(r) for r in rows]
            except ValueError as e:
                raise RuntimeError(["transform", f"ValueError: {e}"])
            con.execute("BEGIN")
            try:
                con.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?)", loaded)
                con.execute("COMMIT")
            except sqlite3.IntegrityError as e:
                con.execute("ROLLBACK")
                raise RuntimeError(["load", f"IntegrityError: {e}"])
        else:
            con.executemany("INSERT INTO raw_orders VALUES (?, ?, ?, ?, ?)", [[r[c] for c in COLS] for r in rows])
            con.execute("BEGIN")
            try:
                if validation:
                    for statement in ELT_VALIDATED.split(";\n"):
                        if statement.strip():
                            con.execute(statement)
                    quarantine = [list(r) for r in con.execute("SELECT order_id, reason FROM orders_quarantine")]
                else:
                    con.execute(ELT_UNVALIDATED)
                con.execute("COMMIT")
            except sqlite3.IntegrityError as e:
                con.execute("ROLLBACK")
                raise RuntimeError(["transform", f"IntegrityError: {e}"])
    except RuntimeError as e:
        error = e.args[0]
    raw = con.execute("SELECT COUNT(*) FROM raw_orders").fetchone()[0]
    loaded = con.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    stored = con.execute("SELECT order_id, amount FROM orders ORDER BY order_id").fetchall()
    revenue = con.execute(REVENUE).fetchall()
    return {"raw": raw, "loaded": loaded, "stored": stored, "quarantine": sorted(quarantine), "error": error, "revenue": revenue}


out = {}
for mode in ["etl", "elt"]:
    for bad in BAD:
        for validation in [True, False]:
            out[f"{mode},{bad},{'on' if validation else 'off'}"] = run(mode, bad, validation)
pathlib.Path(__file__).with_name("etl-python.json").write_text(json.dumps(out, indent=1) + "\n")
