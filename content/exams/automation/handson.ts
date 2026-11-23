import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Automation exam: 5 tasks, 100 points. Standard-library Python only, so every task runs in
// the browser. Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).
// The webhook signature check uses the test vector from GitHub's webhook documentation.

export const tasks: HandsOnTask[] = [
  {
    id: 'automation-h1',
    title: "Match cron expressions and list the next runs",
    domain: 'schedule',
    brief: `Write a five-field cron matcher with the standard library only.

\`matches(expr, dt)\` returns True when the datetime \`dt\` (minute precision) matches \`expr\`. Fields are minute (0-59), hour (0-23), day of month (1-31), month (1-12) and day of week (0-7, where 0 and 7 are both Sunday). Each field is a comma list of \`*\`, a number, a range \`a-b\`, or any of these with a step \`/n\` (a bare number with a step, like \`5/15\`, runs from that number to the end of the range).

Follow Vixie cron (cronie): when both day fields are restricted, a day matches if either matches; if either day field starts with \`*\`, both must match.

Raise \`ValueError\` for anything other than five fields, a value outside its range, or a range whose start is after its end.

\`next_runs(expr, after, count)\` returns the next \`count\` matching datetimes strictly after \`after\`, searching at most five years ahead.`,
    starter: `from datetime import datetime, timedelta

def matches(expr, dt):
    raise NotImplementedError

def next_runs(expr, after, count):
    raise NotImplementedError
`,
    solution: `from datetime import datetime, timedelta

RANGES = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 7)]

def parse_field(text, lo, hi):
    values = set()
    for part in text.split(","):
        rng, _, step = part.partition("/")
        step = int(step) if step else 1
        if rng == "*":
            start, end = lo, hi
        elif "-" in rng:
            a, b = rng.split("-")
            start, end = int(a), int(b)
        else:
            start = int(rng)
            end = hi if step > 1 else start
        if not (lo <= start <= end <= hi) or step < 1:
            raise ValueError(f"bad field {text!r}")
        values.update(range(start, end + 1, step))
    return values

def matches(expr, dt):
    fields = expr.split()
    if len(fields) != 5:
        raise ValueError("cron needs 5 fields")
    minute, hour, dom, month, dow = (parse_field(f, lo, hi) for f, (lo, hi) in zip(fields, RANGES))
    if 7 in dow:
        dow.add(0)
    if dt.minute not in minute or dt.hour not in hour or dt.month not in month:
        return False
    dom_ok = dt.day in dom
    dow_ok = (dt.isoweekday() % 7) in dow
    if fields[2].startswith("*") or fields[4].startswith("*"):
        return dom_ok and dow_ok
    return dom_ok or dow_ok

def next_runs(expr, after, count):
    t = after.replace(second=0, microsecond=0) + timedelta(minutes=1)
    out = []
    limit = t + timedelta(days=366 * 5)
    while len(out) < count and t < limit:
        if matches(expr, t):
            out.append(t)
        t += timedelta(minutes=1)
    return out
`,
    checks: [
      { name: "Fields, ranges, steps and Sunday as 0 or 7", points: 5, tests: `from datetime import datetime as _d
assert matches("*/15 9-17 * * 1-5", _d(2026, 11, 23, 17, 45))
assert not matches("*/15 9-17 * * 1-5", _d(2026, 11, 23, 18, 0))
assert not matches("*/15 9-17 * * 1-5", _d(2026, 11, 22, 9, 0)), "22 Nov 2026 is a Sunday"
assert matches("0 0 * * 0", _d(2026, 11, 22, 0, 0)) and matches("0 0 * * 7", _d(2026, 11, 22, 0, 0))
` },
      { name: "The day-of-month OR day-of-week rule", points: 5, tests: `from datetime import datetime as _d
assert matches("0 0 1,15 * 5", _d(2026, 11, 20, 0, 0)), "Friday matches through the OR rule"
assert matches("0 0 1,15 * 5", _d(2026, 11, 15, 0, 0)), "the 15th matches through the OR rule"
assert not matches("0 0 1,15 * 5", _d(2026, 11, 19, 0, 0))
assert not matches("0 0 */10 * 5", _d(2026, 11, 20, 0, 0)), "a day field starting with * means AND"
` },
      { name: "Next runs, strictly after the start, across leap years", points: 5, tests: `from datetime import datetime as _d
_r = next_runs("30 2 * * *", _d(2026, 11, 23, 14, 0), 3)
assert _r == [_d(2026, 11, 24, 2, 30), _d(2026, 11, 25, 2, 30), _d(2026, 11, 26, 2, 30)], _r
assert next_runs("0 9 * * 1", _d(2026, 11, 23, 9, 0), 1) == [_d(2026, 11, 30, 9, 0)], "strictly after"
assert next_runs("0 0 29 2 *", _d(2026, 3, 1), 1) == [_d(2028, 2, 29, 0, 0)]
` },
      { name: "Invalid expressions raise ValueError", points: 5, tests: `from datetime import datetime as _d
for _bad in ["* * *", "60 * * * *", "* 24 * * *", "5-1 * * * *"]:
    try:
        matches(_bad, _d(2026, 1, 1))
    except ValueError:
        pass
    else:
        raise AssertionError(f"{_bad!r} should raise ValueError")
` },
    ],
  },
  {
    id: 'automation-h2',
    title: "Retry with backoff and Retry-After",
    domain: 'reliable',
    brief: `Implement the retry policy of urllib3 2.x without the library.

\`backoff(factor, attempt, cap=120)\` returns the wait in seconds before retry number \`attempt\` (1-based): 0 for the first retry, then \`factor * 2 ** (attempt - 1)\`, never more than \`cap\`.

\`call_with_retry(send, retries, factor, sleep, cap=120)\` calls \`send()\`, which returns \`(status, retry_after)\` where \`retry_after\` is seconds or None. A status below 400 is success: return \`(status, waits)\`, where \`waits\` lists every wait used. Retry only the statuses 408, 429, 500, 502, 503 and 504, at most \`retries\` times; otherwise raise \`RuntimeError\`. For 413, 429 and 503 with a Retry-After value, wait the longer of the backoff and Retry-After. Call \`sleep(wait)\` before each retry (tests pass a fake sleep).`,
    starter: `RETRYABLE = {408, 429, 500, 502, 503, 504}

def backoff(factor, attempt, cap=120):
    raise NotImplementedError

def call_with_retry(send, retries, factor, sleep, cap=120):
    raise NotImplementedError
`,
    solution: `RETRYABLE = {408, 429, 500, 502, 503, 504}

def backoff(factor, attempt, cap=120):
    if attempt <= 1:
        return 0
    return min(cap, factor * 2 ** (attempt - 1))

def call_with_retry(send, retries, factor, sleep, cap=120):
    waits = []
    attempt = 0
    while True:
        status, retry_after = send()
        if status < 400:
            return status, waits
        if status not in RETRYABLE or attempt == retries:
            raise RuntimeError(f"gave up with {status}")
        attempt += 1
        wait = backoff(factor, attempt, cap)
        if retry_after is not None and status in (413, 429, 503):
            wait = max(wait, retry_after)
        waits.append(wait)
        sleep(wait)
`,
    checks: [
      { name: "Backoff waits match urllib3, with a cap", points: 5, tests: `def _replies(seq):
    it = iter(seq)
    return lambda: next(it)
assert [backoff(0.5, n) for n in range(1, 6)] == [0, 1, 2, 4, 8]
assert backoff(1, 9) == 120 and backoff(1, 9, cap=60) == 60
` },
      { name: "Transient errors are retried and the waits recorded", points: 5, tests: `def _replies(seq):
    it = iter(seq)
    return lambda: next(it)
_slept = []
assert call_with_retry(_replies([(503, None), (503, None), (200, None)]), 5, 0.5, _slept.append) == (200, [0, 1])
assert _slept == [0, 1], "sleep is called with each wait"
` },
      { name: "Retry-After is honoured as a minimum", points: 5, tests: `def _replies(seq):
    it = iter(seq)
    return lambda: next(it)
_st, _w = call_with_retry(_replies([(429, 30), (200, None)]), 3, 0.5, lambda s: None)
assert _w == [30], "Retry-After wins when it is longer"
_st, _w = call_with_retry(_replies([(500, None), (429, 1), (429, 1), (200, None)]), 3, 1, lambda s: None)
assert _w == [0, 2, 4], "backoff wins when it is longer than Retry-After"
` },
      { name: "Permanent errors fail fast and retries are bounded", points: 5, tests: `def _replies(seq):
    it = iter(seq)
    return lambda: next(it)
for _seq, _n in [([(400, None)], 1), ([(503, None)] * 4, 4)]:
    _calls = []
    def _send(seq=iter(_seq)):
        _calls.append(1)
        return next(seq)
    try:
        call_with_retry(_send, 3, 0.5, lambda s: None)
    except RuntimeError:
        pass
    else:
        raise AssertionError("must raise RuntimeError")
    assert len(_calls) == _n, (len(_calls), _n)
` },
    ],
  },
  {
    id: 'automation-h3',
    title: "Make a batch job safe to rerun",
    domain: 'reliable',
    brief: `Build the three pieces of a rerun-safe load job.

\`upsert(table, rows, key)\` writes each row (a dict) into \`table\` (a dict keyed by \`row[key]\`), storing a copy. It returns \`(inserted, updated)\`, where a row identical to the stored one counts as neither.

\`atomic_write_json(path, obj)\` writes \`obj\` as JSON so that readers see either the old file or the complete new one: write a temp file in the same folder and \`os.replace\` it over \`path\`. If serialisation fails, the old file must stay intact and no temp file may be left.

\`run_job(items, table, checkpoint_path, batch_size, key, crash_after=None)\` upserts \`items\` in batches. It resumes from the count stored in the checkpoint file (\`{"done": n}\`) if one exists, and saves the checkpoint atomically after each batch. For testing, when \`crash_after\` is set, raise \`RuntimeError\` right after upserting the batch that goes past that many items, before its checkpoint is saved. It returns the number of items done.`,
    starter: `import json
import os
import tempfile

def upsert(table, rows, key):
    raise NotImplementedError

def atomic_write_json(path, obj):
    raise NotImplementedError

def run_job(items, table, checkpoint_path, batch_size, key, crash_after=None):
    raise NotImplementedError
`,
    solution: `import json
import os
import tempfile

def upsert(table, rows, key):
    inserted = updated = 0
    for row in rows:
        k = row[key]
        if k in table:
            if table[k] != row:
                updated += 1
        else:
            inserted += 1
        table[k] = dict(row)
    return inserted, updated

def atomic_write_json(path, obj):
    folder = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=folder, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f, sort_keys=True)
        os.replace(tmp, path)
    except BaseException:
        os.unlink(tmp)
        raise

def run_job(items, table, checkpoint_path, batch_size, key, crash_after=None):
    done = 0
    if os.path.exists(checkpoint_path):
        with open(checkpoint_path) as f:
            done = json.load(f)["done"]
    while done < len(items):
        batch = items[done:done + batch_size]
        upsert(table, batch, key)
        if crash_after is not None and done + len(batch) > crash_after:
            raise RuntimeError("crash")
        done += len(batch)
        atomic_write_json(checkpoint_path, {"done": done})
    return done
`,
    checks: [
      { name: "Upsert counts inserts and real updates", points: 6, tests: `import json as _json, os as _os, tempfile as _tf
_t = {}
assert upsert(_t, [{"id": 1, "v": "a"}, {"id": 2, "v": "b"}], "id") == (2, 0)
assert upsert(_t, [{"id": 2, "v": "b"}, {"id": 1, "v": "z"}, {"id": 3, "v": "c"}], "id") == (1, 1), "unchanged rows are not counted"
assert _t == {1: {"id": 1, "v": "z"}, 2: {"id": 2, "v": "b"}, 3: {"id": 3, "v": "c"}}
` },
      { name: "Atomic JSON writes leave no partial or temp files", points: 7, tests: `import json as _json, os as _os, tempfile as _tf
_dir = _tf.mkdtemp()
_p = _os.path.join(_dir, "state.json")
atomic_write_json(_p, {"done": 4})
atomic_write_json(_p, {"done": 8})
assert _json.load(open(_p)) == {"done": 8}
assert sorted(_os.listdir(_dir)) == ["state.json"], "no temp files may be left behind"
class _Bad:
    pass
try:
    atomic_write_json(_p, {"x": _Bad()})
except TypeError:
    pass
assert _json.load(open(_p)) == {"done": 8}, "a failed write must leave the old file intact"
assert sorted(_os.listdir(_dir)) == ["state.json"], "a failed write must clean up its temp file"
` },
      { name: "A crashed job resumes from its checkpoint without duplicates", points: 7, tests: `import json as _json, os as _os, tempfile as _tf
_items = [{"id": i, "v": i * 10} for i in range(1, 13)]
_dir = _tf.mkdtemp()
_cp = _os.path.join(_dir, "cp.json")
_table = {}
try:
    run_job(_items, _table, _cp, 4, "id", crash_after=6)
except RuntimeError:
    pass
assert _json.load(open(_cp)) == {"done": 4}, "only the first full batch is checkpointed"
assert run_job(_items, _table, _cp, 4, "id") == 12
assert len(_table) == 12 and _table[12] == {"id": 12, "v": 120}
assert run_job(_items, _table, _cp, 4, "id") == 12, "a finished job reruns as a no-op"
` },
    ],
  },
  {
    id: 'automation-h4',
    title: "Order, time and fail a DAG like an orchestrator",
    domain: 'orchestrate',
    brief: `Model the core of a DAG scheduler. A DAG is a dict mapping each task to the list of its upstream tasks.

\`topo_order(upstream)\` returns every task (including ones that only appear as upstream) in an order where each task follows all its upstream tasks. Among ready tasks, take the alphabetically smallest first. Raise \`ValueError\` if there is a cycle.

\`makespan(upstream, minutes)\` returns the finish time of the whole DAG with unlimited workers: each task starts when its last upstream task finishes.

\`run_states(upstream, failed, rules=None)\` returns a dict of final states for one run where the tasks in \`failed\` fail. A task whose rule is \`"all_success"\` (the default) becomes \`"upstream_failed"\` if any upstream task is not \`"success"\`. A task with rule \`"all_done"\` always runs. A task that runs is \`"failed"\` if it is in \`failed\`, otherwise \`"success"\`.

\`dag_state(upstream, states)\` returns the run state the way Airflow does: \`"failed"\` if any leaf task (one with no downstream tasks) is failed or upstream_failed, otherwise \`"success"\`.`,
    starter: `import heapq

def topo_order(upstream):
    raise NotImplementedError

def makespan(upstream, minutes):
    raise NotImplementedError

def run_states(upstream, failed, rules=None):
    raise NotImplementedError

def dag_state(upstream, states):
    raise NotImplementedError
`,
    solution: `import heapq

def topo_order(upstream):
    tasks = set(upstream) | {u for ups in upstream.values() for u in ups}
    indegree = {t: len(set(upstream.get(t, []))) for t in tasks}
    children = {t: [] for t in tasks}
    for t, ups in upstream.items():
        for u in set(ups):
            children[u].append(t)
    ready = [t for t in tasks if indegree[t] == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        t = heapq.heappop(ready)
        order.append(t)
        for c in children[t]:
            indegree[c] -= 1
            if indegree[c] == 0:
                heapq.heappush(ready, c)
    if len(order) != len(tasks):
        raise ValueError("cycle")
    return order

def makespan(upstream, minutes):
    finish = {}
    for t in topo_order(upstream):
        start = max((finish[u] for u in upstream.get(t, [])), default=0)
        finish[t] = start + minutes[t]
    return max(finish.values(), default=0)

def run_states(upstream, failed, rules=None):
    rules = rules or {}
    states = {}
    for t in topo_order(upstream):
        ups = [states[u] for u in upstream.get(t, [])]
        if rules.get(t, "all_success") == "all_success" and any(s != "success" for s in ups):
            states[t] = "upstream_failed"
        else:
            states[t] = "failed" if t in failed else "success"
    return states

def dag_state(upstream, states):
    tasks = set(states)
    has_child = {u for ups in upstream.values() for u in ups}
    leaves = [t for t in tasks if t not in has_child]
    if any(states[t] in ("failed", "upstream_failed") for t in leaves):
        return "failed"
    return "success"
`,
    checks: [
      { name: "Deterministic topological order", points: 5, tests: `_up = {"extract": [], "validate": ["extract"], "features": ["validate"], "labels": ["extract"],
       "train": ["features", "labels"], "evaluate": ["train"], "report": ["evaluate"], "notify": ["evaluate"]}
assert topo_order(_up) == ["extract", "labels", "validate", "features", "train", "evaluate", "notify", "report"], topo_order(_up)
assert topo_order({"b": ["a"]}) == ["a", "b"], "tasks that only appear upstream are included"
` },
      { name: "Cycles raise ValueError", points: 4, tests: `_up = {"extract": [], "validate": ["extract"], "features": ["validate"], "labels": ["extract"],
       "train": ["features", "labels"], "evaluate": ["train"], "report": ["evaluate"], "notify": ["evaluate"]}
try:
    topo_order({"a": ["c"], "b": ["a"], "c": ["b"]})
except ValueError:
    pass
else:
    raise AssertionError("a cycle must raise ValueError")
` },
      { name: "Makespan follows the critical path", points: 5, tests: `_up = {"extract": [], "validate": ["extract"], "features": ["validate"], "labels": ["extract"],
       "train": ["features", "labels"], "evaluate": ["train"], "report": ["evaluate"], "notify": ["evaluate"]}
_min = {"extract": 4, "validate": 2, "features": 5, "labels": 3, "train": 8, "evaluate": 3, "report": 2, "notify": 1}
assert makespan(_up, _min) == 24, makespan(_up, _min)
assert makespan({"a": [], "b": []}, {"a": 3, "b": 5}) == 5
` },
      { name: "Trigger rules and leaf-based run state", points: 6, tests: `_up = {"extract": [], "validate": ["extract"], "features": ["validate"], "labels": ["extract"],
       "train": ["features", "labels"], "evaluate": ["train"], "report": ["evaluate"], "notify": ["evaluate"]}
_s = run_states(_up, {"features"})
assert _s["features"] == "failed" and _s["train"] == "upstream_failed" and _s["notify"] == "upstream_failed"
assert _s["labels"] == "success"
assert dag_state(_up, _s) == "failed"
_s2 = run_states(_up, {"features"}, {"notify": "all_done"})
assert _s2["notify"] == "success" and _s2["report"] == "upstream_failed"
assert dag_state(_up, _s2) == "failed", "report is still a failed leaf"
_up3 = {k: v for k, v in _up.items() if k != "report"}
assert dag_state(_up3, run_states(_up3, {"features"}, {"notify": "all_done"})) == "success", "run state follows the leaves"
` },
    ],
  },
  {
    id: 'automation-h5',
    title: "Receive GitHub webhooks safely",
    domain: 'events',
    brief: `Write the verification and deduplication core of a webhook receiver.

\`sign(secret, body)\` returns the \`X-Hub-Signature-256\` value GitHub would send: \`"sha256="\` followed by the hex HMAC-SHA256 of the raw \`body\` bytes, keyed with \`secret\`.

\`verify(secret, body, header)\` returns True only when \`header\` is a \`sha256=\` signature matching the body. Compare in constant time.

\`Receiver(secret).handle(headers, body)\` returns 401 when the signature is missing or wrong. Otherwise it acknowledges at once: a new \`X-GitHub-Delivery\` id is appended to \`self.queue\` (the body) and gets 202; a delivery id it has already seen gets 200 and is not queued again.`,
    starter: `import hashlib
import hmac

def sign(secret, body):
    raise NotImplementedError

def verify(secret, body, header):
    raise NotImplementedError

class Receiver:
    def __init__(self, secret):
        self.secret = secret
        self.seen = set()
        self.queue = []

    def handle(self, headers, body):
        raise NotImplementedError
`,
    solution: `import hashlib
import hmac

def sign(secret, body):
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

def verify(secret, body, header):
    if not header or not header.startswith("sha256="):
        return False
    return hmac.compare_digest(sign(secret, body), header)

class Receiver:
    def __init__(self, secret):
        self.secret = secret
        self.seen = set()
        self.queue = []

    def handle(self, headers, body):
        if not verify(self.secret, body, headers.get("X-Hub-Signature-256")):
            return 401
        delivery = headers.get("X-GitHub-Delivery")
        if delivery in self.seen:
            return 200
        self.seen.add(delivery)
        self.queue.append(body)
        return 202
`,
    checks: [
      { name: "Signatures match GitHub’s test vector", points: 6, tests: `_sig = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17"
assert sign("It's a Secret to Everybody", b"Hello, World!") == _sig, "GitHub's documented test vector"
` },
      { name: "Verification rejects tampering, wrong secrets and bad headers", points: 6, tests: `_sig = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17"
assert verify("It's a Secret to Everybody", b"Hello, World!", _sig)
assert not verify("It's a Secret to Everybody", b"Hello, World! ", _sig), "one extra byte breaks it"
assert not verify("wrong", b"Hello, World!", _sig)
assert not verify("It's a Secret to Everybody", b"Hello, World!", None)
assert not verify("It's a Secret to Everybody", b"Hello, World!", _sig.replace("sha256=", "sha1="))
` },
      { name: "Deliveries are verified, queued once and deduplicated", points: 8, tests: `_sig = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17"
_r = Receiver("s3cret")
_b = b'{"action":"published"}'
_h = {"X-Hub-Signature-256": sign("s3cret", _b), "X-GitHub-Delivery": "d-1"}
assert _r.handle(_h, _b) == 202
assert _r.handle(_h, _b) == 200, "a redelivery is acknowledged"
assert _r.queue == [_b], "but queued only once"
assert _r.handle({**_h, "X-GitHub-Delivery": "d-2"}, b'{"action":"deleted"}') == 401
assert _r.handle({"X-GitHub-Delivery": "d-3"}, _b) == 401
assert len(_r.queue) == 1
` },
    ],
  },
];
