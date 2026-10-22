// The code the ETL lesson shows, copied from fixtures/etl.py, which is the code that produced the
// lesson's results (etl.test.ts checks that the two stay identical).

/** validate() and transform() for the ETL pipeline. */
export const ETL_PYTHON = `import re
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
    )`;

/** The ELT transform with validation: a view that labels each raw row, then two INSERTs. */
export const ELT_SQL = `CREATE VIEW checked_orders AS
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
SELECT * FROM checked_orders WHERE reason IS NOT NULL;`;

/** The ELT transform without validation. */
export const ELT_UNVALIDATED_SQL = `INSERT INTO orders
SELECT CAST(order_id AS INTEGER), email, CAST(amount AS REAL), country, ordered_at
FROM raw_orders;`;
