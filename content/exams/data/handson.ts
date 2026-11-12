import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Data Engineering exam: 5 tasks, 100 points. Standard-library Python only.
// Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'data-h1',
    title: 'Slowly changing dimension, Type 2',
    domain: 'store',
    brief: `Write \`scd2_merge(dim, updates, as_of)\`. \`dim\` is a list of dicts with keys \`sk\` (surrogate key), \`customer_id\`, \`city\`, \`valid_from\`, \`valid_to\` and \`is_current\`. Current rows have \`valid_to=None\`. \`updates\` is a list of \`{"customer_id", "city"}\` from today's source extract. \`as_of\` is today's date as an ISO string.

Return a new list (do not mutate the input):

- Unchanged customers keep their rows exactly.
- A customer whose city changed gets the current row closed (\`valid_to=as_of\`, \`is_current=False\`) and a new current row with \`valid_from=as_of\`.
- A new customer gets a current row.
- New rows get surrogate keys counting up from the largest existing \`sk\` + 1, in the order of \`updates\`.
- Customers missing from \`updates\` are left unchanged (the extract is not a full snapshot).
- If the same customer appears twice in \`updates\`, the last one wins.

Return rows sorted by \`sk\`.`,
    starter: `def scd2_merge(dim, updates, as_of):
    ${NOT_DONE}
`,
    solution: `def scd2_merge(dim, updates, as_of):
    rows = [dict(r) for r in dim]
    current = {r['customer_id']: r for r in rows if r['is_current']}
    latest = {}
    for u in updates:
        latest.pop(u['customer_id'], None)
        latest[u['customer_id']] = u
    next_sk = max([r['sk'] for r in rows], default=0) + 1
    for cid, u in latest.items():
        cur = current.get(cid)
        if cur is not None and cur['city'] == u['city']:
            continue
        if cur is not None:
            cur['valid_to'] = as_of
            cur['is_current'] = False
        rows.append({'sk': next_sk, 'customer_id': cid, 'city': u['city'],
                     'valid_from': as_of, 'valid_to': None, 'is_current': True})
        next_sk += 1
    return sorted(rows, key=lambda r: r['sk'])
`,
    checks: [
      {
        name: 'Unchanged and new customers',
        points: 5,
        tests: `_d = [{'sk': 1, 'customer_id': 'a', 'city': 'Oslo', 'valid_from': '2026-01-01', 'valid_to': None, 'is_current': True}]
_r = scd2_merge(_d, [{'customer_id': 'a', 'city': 'Oslo'}, {'customer_id': 'b', 'city': 'Rome'}], '2026-11-12')
assert _r[0] == _d[0], "an unchanged customer must keep its row exactly"
assert _r[1] == {'sk': 2, 'customer_id': 'b', 'city': 'Rome', 'valid_from': '2026-11-12', 'valid_to': None, 'is_current': True}, _r[1]
assert _d[0]['is_current'] is True, "do not mutate the input rows"
`,
      },
      {
        name: 'A change closes the old version and opens a new one',
        points: 7,
        tests: `_d = [{'sk': 7, 'customer_id': 'a', 'city': 'Oslo', 'valid_from': '2026-01-01', 'valid_to': None, 'is_current': True},
      {'sk': 3, 'customer_id': 'a', 'city': 'Bergen', 'valid_from': '2025-01-01', 'valid_to': '2026-01-01', 'is_current': False}]
_r = scd2_merge(_d, [{'customer_id': 'a', 'city': 'Lima'}], '2026-11-12')
assert [x['sk'] for x in _r] == [3, 7, 8], "rows sorted by sk, new key = max + 1"
assert _r[1]['valid_to'] == '2026-11-12' and _r[1]['is_current'] is False, "close the current row"
assert _r[2]['city'] == 'Lima' and _r[2]['valid_from'] == '2026-11-12' and _r[2]['is_current'], "open a new version"
assert _r[0] == _d[1], "history rows stay untouched"
assert sum(x['is_current'] for x in _r) == 1, "exactly one current row per customer"
`,
      },
      {
        name: 'Missing customers and duplicate updates',
        points: 8,
        tests: `_d = [{'sk': 1, 'customer_id': 'a', 'city': 'Oslo', 'valid_from': '2026-01-01', 'valid_to': None, 'is_current': True},
      {'sk': 2, 'customer_id': 'z', 'city': 'Kyiv', 'valid_from': '2026-01-01', 'valid_to': None, 'is_current': True}]
_r = scd2_merge(_d, [{'customer_id': 'a', 'city': 'Pune'}, {'customer_id': 'a', 'city': 'Oslo'}], '2026-11-12')
assert _r == _d, "the last update for 'a' matches the current city, so nothing changes; 'z' is not deleted"
_r = scd2_merge(_d, [{'customer_id': 'n', 'city': 'X'}, {'customer_id': 'a', 'city': 'Y'}, {'customer_id': 'n', 'city': 'W'}], '2026-11-12')
assert [(x['sk'], x['customer_id'], x['city']) for x in _r if x['is_current']] == [(2, 'z', 'Kyiv'), (3, 'a', 'Y'), (4, 'n', 'W')], [(x['sk'], x['customer_id'], x['city']) for x in _r]
`,
      },
    ],
  },
  {
    id: 'data-h2',
    title: 'Event-time windows with a watermark',
    domain: 'ingest',
    brief: `Simulate a streaming tumbling-window count. Write \`window_counts(events, size, lateness)\`. \`events\` is a list of \`(key, event_time)\` pairs in arrival order, with integer times in seconds.

Each event belongs to the window \`[start, start + size)\` where \`start = event_time // size * size\`. The watermark is the largest event time seen so far minus \`lateness\` (before any event, it is minus infinity). Process events one at a time:

1. If the event's window end is less than or equal to the current watermark, drop it as too late.
2. Otherwise count it, then advance the watermark using this event's time.

Return \`(counts, dropped)\`: \`counts\` maps \`(key, window_start)\` to a count, and \`dropped\` is the list of dropped events in arrival order.`,
    starter: `def window_counts(events, size, lateness):
    ${NOT_DONE}
`,
    solution: `def window_counts(events, size, lateness):
    counts, dropped = {}, []
    max_seen = None
    for key, t in events:
        start = t // size * size
        watermark = float('-inf') if max_seen is None else max_seen - lateness
        if start + size <= watermark:
            dropped.append((key, t))
            continue
        counts[(key, start)] = counts.get((key, start), 0) + 1
        max_seen = t if max_seen is None else max(max_seen, t)
    return counts, dropped
`,
    checks: [
      {
        name: 'Counts in-order events per key and window',
        points: 6,
        tests: `_c, _d = window_counts([('a', 1), ('a', 59), ('b', 60), ('a', 61)], 60, 0)
assert _c == {('a', 0): 2, ('b', 60): 1, ('a', 60): 1}, _c
assert _d == []
`,
      },
      {
        name: 'Late events inside the allowance are kept',
        points: 7,
        tests: `_c, _d = window_counts([('a', 100), ('a', 130), ('a', 50)], 60, 80)
assert _c == {('a', 60): 1, ('a', 120): 1, ('a', 0): 1}, "watermark is 130 - 80 = 50 and window [0, 60) ends at 60 > 50, so 50 is kept"
assert _d == []
`,
      },
      {
        name: 'Too-late events are dropped',
        points: 7,
        tests: `_c, _d = window_counts([('a', 200), ('a', 30), ('b', 59), ('b', 130), ('b', 61)], 60, 70)
assert _d == [('a', 30), ('b', 59), ('b', 61)], f"windows ending at or before the watermark 130 are dropped: {_d}"
assert _c == {('a', 180): 1, ('b', 120): 1}, _c
`,
      },
    ],
  },
  {
    id: 'data-h3',
    title: 'Warehouse SQL with window functions',
    domain: 'store',
    brief: `Write two SQL queries as Python strings. They run in SQLite against this table:

\`orders(order_id INTEGER, customer_id TEXT, status TEXT, amount REAL, updated_at TEXT)\`

The table is a change log: an order appears once per status change. \`updated_at\` values are ISO timestamps and are unique per order.

\`LATEST_SQL\` returns one row per order, its latest version, with columns \`order_id, customer_id, status, amount\`, sorted by \`order_id\`.

\`TOP_SQL\` uses only the latest version of each order, ignores orders whose latest status is \`'cancelled'\`, and returns each customer's total \`amount\` and rank by total (highest first; equal totals share a rank and the next rank is skipped, like \`RANK()\`). Columns \`customer_id, total, rnk\`, sorted by \`rnk\` then \`customer_id\`.`,
    starter: `LATEST_SQL = """
SELECT 1
"""

TOP_SQL = """
SELECT 1
"""
`,
    solution: `LATEST_SQL = """
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) AS rn
  FROM orders
)
SELECT order_id, customer_id, status, amount
FROM ranked
WHERE rn = 1
ORDER BY order_id
"""

TOP_SQL = """
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) AS rn
  FROM orders
),
totals AS (
  SELECT customer_id, SUM(amount) AS total
  FROM ranked
  WHERE rn = 1 AND status <> 'cancelled'
  GROUP BY customer_id
)
SELECT customer_id, total, RANK() OVER (ORDER BY total DESC) AS rnk
FROM totals
ORDER BY rnk, customer_id
"""
`,
    checks: [
      {
        name: 'Latest version per order',
        points: 9,
        tests: `import sqlite3
_db = sqlite3.connect(':memory:')
_db.execute('CREATE TABLE orders(order_id INTEGER, customer_id TEXT, status TEXT, amount REAL, updated_at TEXT)')
_db.executemany('INSERT INTO orders VALUES (?,?,?,?,?)', [
    (1, 'c1', 'placed', 10.0, '2026-11-01T10:00'), (1, 'c1', 'shipped', 10.0, '2026-11-02T09:00'),
    (2, 'c2', 'placed', 5.0, '2026-11-01T11:00'), (3, 'c1', 'placed', 7.0, '2026-11-03T08:00'),
    (3, 'c1', 'cancelled', 7.0, '2026-11-03T09:30'), (2, 'c2', 'paid', 6.0, '2026-11-01T12:00')])
_rows = _db.execute(LATEST_SQL).fetchall()
assert _rows == [(1, 'c1', 'shipped', 10.0), (2, 'c2', 'paid', 6.0), (3, 'c1', 'cancelled', 7.0)], _rows
`,
      },
      {
        name: 'Customer totals and RANK with ties',
        points: 11,
        tests: `import sqlite3
_db = sqlite3.connect(':memory:')
_db.execute('CREATE TABLE orders(order_id INTEGER, customer_id TEXT, status TEXT, amount REAL, updated_at TEXT)')
_db.executemany('INSERT INTO orders VALUES (?,?,?,?,?)', [
    (1, 'a', 'placed', 50.0, '2026-11-01'), (1, 'a', 'paid', 40.0, '2026-11-02'),
    (2, 'b', 'paid', 40.0, '2026-11-01'), (3, 'c', 'paid', 90.0, '2026-11-01'),
    (4, 'c', 'paid', 10.0, '2026-11-01'), (5, 'd', 'paid', 80.0, '2026-11-01'),
    (5, 'd', 'cancelled', 80.0, '2026-11-05'), (6, 'e', 'paid', 15.0, '2026-11-01')])
_rows = _db.execute(TOP_SQL).fetchall()
assert _rows == [('c', 100.0, 1), ('a', 40.0, 2), ('b', 40.0, 2), ('e', 15.0, 4)], _rows
`,
      },
    ],
  },
  {
    id: 'data-h4',
    title: 'Apply change data capture idempotently',
    domain: 'ops',
    brief: `A CDC stream may deliver events more than once and slightly out of order. Write \`apply_cdc(table, events)\`.

\`table\` maps a primary key to \`{"row": dict, "lsn": int}\`, where \`lsn\` is the log sequence number of the last change applied to that key. \`events\` is a list of dicts \`{"op": "insert" | "update" | "delete", "key", "lsn", "row"}\` (\`row\` is \`None\` for deletes).

For each event, apply it only if its \`lsn\` is greater than the stored \`lsn\` for that key (or the key is unknown). Inserts and updates set the row. A delete keeps a tombstone \`{"row": None, "lsn": lsn}\`, so an older insert arriving later cannot bring the row back. Return a new dict and do not mutate the input.

Also write \`live_rows(table)\`, which returns \`{key: row}\` for keys whose row is not a tombstone.`,
    starter: `def apply_cdc(table, events):
    ${NOT_DONE}

def live_rows(table):
    ${NOT_DONE}
`,
    solution: `def apply_cdc(table, events):
    out = {k: {'row': v['row'], 'lsn': v['lsn']} for k, v in table.items()}
    for e in events:
        cur = out.get(e['key'])
        if cur is not None and e['lsn'] <= cur['lsn']:
            continue
        row = None if e['op'] == 'delete' else dict(e['row'])
        out[e['key']] = {'row': row, 'lsn': e['lsn']}
    return out

def live_rows(table):
    return {k: v['row'] for k, v in table.items() if v['row'] is not None}
`,
    checks: [
      {
        name: 'Applies inserts, updates and deletes in order',
        points: 6,
        tests: `_e = [{'op': 'insert', 'key': 1, 'lsn': 10, 'row': {'v': 'a'}},
      {'op': 'update', 'key': 1, 'lsn': 11, 'row': {'v': 'b'}},
      {'op': 'insert', 'key': 2, 'lsn': 12, 'row': {'v': 'x'}},
      {'op': 'delete', 'key': 2, 'lsn': 13, 'row': None}]
_t = apply_cdc({}, _e)
assert live_rows(_t) == {1: {'v': 'b'}}, live_rows(_t)
assert _t[2] == {'row': None, 'lsn': 13}, "deletes leave a tombstone"
`,
      },
      {
        name: 'Replaying the stream changes nothing',
        points: 7,
        tests: `_e = [{'op': 'insert', 'key': 'k', 'lsn': 5, 'row': {'n': 1}}, {'op': 'update', 'key': 'k', 'lsn': 6, 'row': {'n': 2}}]
_once = apply_cdc({}, _e)
_twice = apply_cdc(_once, _e + _e)
assert _twice == _once, "applying the same events again must be a no-op"
_base = {'k': {'row': {'n': 0}, 'lsn': 1}}
apply_cdc(_base, _e)
assert _base == {'k': {'row': {'n': 0}, 'lsn': 1}}, "do not mutate the input table"
`,
      },
      {
        name: 'Out-of-order events cannot resurrect or overwrite',
        points: 7,
        tests: `_e = [{'op': 'update', 'key': 1, 'lsn': 20, 'row': {'v': 'new'}},
      {'op': 'update', 'key': 1, 'lsn': 15, 'row': {'v': 'old'}},
      {'op': 'delete', 'key': 2, 'lsn': 30, 'row': None},
      {'op': 'insert', 'key': 2, 'lsn': 25, 'row': {'v': 'ghost'}}]
_t = apply_cdc({1: {'row': {'v': 'orig'}, 'lsn': 10}}, _e)
assert live_rows(_t) == {1: {'v': 'new'}}, live_rows(_t)
`,
      },
    ],
  },
  {
    id: 'data-h5',
    title: 'Quality gate with quarantine and tokenization',
    domain: 'security',
    brief: `Write \`quality_gate(rows, known_customers, key)\`. Each row is a dict with \`order_id\`, \`customer_id\`, \`email\` and \`amount\`. Check every row against these rules, in this order, collecting every rule it breaks:

- \`"order_id_null"\`: \`order_id\` is \`None\`.
- \`"order_id_duplicate"\`: a non-null \`order_id\` already appeared earlier in \`rows\` (the first occurrence passes).
- \`"amount_range"\`: \`amount\` is not a number between 0 and 100000 inclusive (\`None\` and booleans fail).
- \`"email_format"\`: \`email\` does not match \`^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$\` (case-insensitive).
- \`"unknown_customer"\`: \`customer_id\` is not in \`known_customers\`.

Return \`(good, bad)\`. \`bad\` is a list of \`(row, reasons)\` with the original row. In \`good\`, replace \`email\` with \`email_token\`: the hex HMAC-SHA256 of the lower-cased, stripped email under \`key\` (bytes), so equal emails join but cannot be read.`,
    starter: `import hashlib
import hmac
import re

def quality_gate(rows, known_customers, key):
    ${NOT_DONE}
`,
    solution: `import hashlib
import hmac
import re

EMAIL = re.compile(r'^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$', re.IGNORECASE)

def quality_gate(rows, known_customers, key):
    seen = set()
    good, bad = [], []
    for row in rows:
        reasons = []
        oid = row.get('order_id')
        if oid is None:
            reasons.append('order_id_null')
        elif oid in seen:
            reasons.append('order_id_duplicate')
        else:
            seen.add(oid)
        amt = row.get('amount')
        if isinstance(amt, bool) or not isinstance(amt, (int, float)) or not 0 <= amt <= 100000:
            reasons.append('amount_range')
        email = row.get('email')
        if not isinstance(email, str) or not EMAIL.match(email):
            reasons.append('email_format')
        if row.get('customer_id') not in known_customers:
            reasons.append('unknown_customer')
        if reasons:
            bad.append((row, reasons))
        else:
            clean = {k: v for k, v in row.items() if k != 'email'}
            clean['email_token'] = hmac.new(key, email.strip().lower().encode(), hashlib.sha256).hexdigest()
            good.append(clean)
    return good, bad
`,
    checks: [
      {
        name: 'Each rule fires with its reason',
        points: 8,
        tests: `_rows = [
    {'order_id': 1, 'customer_id': 'c1', 'email': 'a@x.com', 'amount': 10},
    {'order_id': None, 'customer_id': 'c1', 'email': 'a@x.com', 'amount': 10},
    {'order_id': 1, 'customer_id': 'c9', 'email': 'nope', 'amount': -1},
    {'order_id': 3, 'customer_id': 'c1', 'email': 'b@y.org', 'amount': True},
]
_g, _b = quality_gate(_rows, {'c1'}, b'k')
assert len(_g) == 1 and _g[0]['order_id'] == 1
assert [r for _, r in _b] == [['order_id_null'], ['order_id_duplicate', 'amount_range', 'email_format', 'unknown_customer'], ['amount_range']], [r for _, r in _b]
assert _b[0][0] is _rows[1], "quarantine keeps the original row"
`,
      },
      {
        name: 'Edge values of the rules',
        points: 5,
        tests: `_rows = [{'order_id': i, 'customer_id': 'c', 'email': e, 'amount': a} for i, (e, a) in enumerate([
    ('A.B@Mail.CO', 0), ('x@y.c', 100000), ('x y@z.com', 5.5), ('x@y.com', 100000.01), ('ok@ok.io', None)])]
_g, _b = quality_gate(_rows, {'c'}, b'k')
assert [r['order_id'] for r in _g] == [0], [r['order_id'] for r in _g]
assert [r for _, r in _b] == [['email_format'], ['email_format'], ['amount_range'], ['amount_range']], [r for _, r in _b]
`,
      },
      {
        name: 'Emails become joinable HMAC tokens',
        points: 7,
        tests: `import hashlib, hmac
_g, _ = quality_gate([{'order_id': 1, 'customer_id': 'c', 'email': 'Ann@Ex.COM', 'amount': 1},
                      {'order_id': 2, 'customer_id': 'c', 'email': 'ann@ex.com', 'amount': 2}], {'c'}, b'secret')
assert 'email' not in _g[0], "the raw email must not reach the clean output"
assert _g[0]['email_token'] == _g[1]['email_token'], "equal emails (after lower-casing) give equal tokens"
assert _g[0]['email_token'] == hmac.new(b'secret', b'ann@ex.com', hashlib.sha256).hexdigest()
_g2, _ = quality_gate([{'order_id': 1, 'customer_id': 'c', 'email': 'ann@ex.com', 'amount': 1}], {'c'}, b'other')
assert _g2[0]['email_token'] != _g[0]['email_token'], "a different key gives a different token"
`,
      },
    ],
  },
];
