import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// Data engineering Python rounds: plain data structures, careful about ties, ordering and reruns.
export const dataScreen: ScreenDef = {
  id: 'data',
  role: 'data',
  title: 'Data engineering coding screen',
  summary:
    'Three pipeline problems in plain Python, as in data engineering phone screens: deduplication with a tiebreaker, sessionization, and applying a change log idempotently.',
  minutes: 50,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-data-dedupe',
      title: 'Latest record per key',
      domain: 'data',
      brief: `Each event is a dict with \`user_id\`, \`device_id\`, \`updated_at\` (an integer timestamp) and \`seq\` (an integer that increases with ingestion order), plus other fields.

Write \`latest_per_key(events)\` returning one event per \`(user_id, device_id)\`: the one with the greatest \`updated_at\`, and among equal timestamps the greatest \`seq\`. Do it in one pass over the input, without sorting it. Return the surviving events ordered by \`(user_id, device_id)\`. Do not modify the input.`,
      starter: `def latest_per_key(events):
    ${NOT_DONE}
`,
      solution: `def latest_per_key(events):
    best = {}
    for e in events:
        key = (e["user_id"], e["device_id"])
        cur = best.get(key)
        if cur is None or (e["updated_at"], e["seq"]) > (cur["updated_at"], cur["seq"]):
            best[key] = e
    return [best[k] for k in sorted(best)]
`,
      checks: [
        {
          name: 'Keeps the newest event per composite key',
          points: 12,
          tests: `_ev = [
    {"user_id": 2, "device_id": "a", "updated_at": 10, "seq": 1, "v": "old"},
    {"user_id": 1, "device_id": "b", "updated_at": 5, "seq": 2, "v": "only"},
    {"user_id": 2, "device_id": "a", "updated_at": 12, "seq": 3, "v": "new"},
    {"user_id": 2, "device_id": "c", "updated_at": 1, "seq": 4, "v": "other device"},
]
_out = latest_per_key(_ev)
assert [e["v"] for e in _out] == ["only", "new", "other device"], f"got {[e['v'] for e in _out]}"
assert len(_ev) == 4 and _ev[0]["v"] == "old", "the input must not be modified"
`,
        },
        {
          name: 'Breaks timestamp ties by seq, whatever the arrival order',
          points: 12,
          tests: `_a = {"user_id": 1, "device_id": "x", "updated_at": 7, "seq": 9, "v": "late seq"}
_b = {"user_id": 1, "device_id": "x", "updated_at": 7, "seq": 3, "v": "early seq"}
assert latest_per_key([_a, _b])[0]["v"] == "late seq"
assert latest_per_key([_b, _a])[0]["v"] == "late seq", "the result must not depend on input order"
_c = {"user_id": 1, "device_id": "x", "updated_at": 6, "seq": 99, "v": "older timestamp"}
assert latest_per_key([_c, _b])[0]["v"] == "early seq", "updated_at comes before seq"
assert latest_per_key([]) == []
`,
        },
        {
          name: 'Handles 300,000 events',
          points: 8,
          tests: `import random, time
_r = random.Random(4)
_ev = [{"user_id": _r.randrange(5000), "device_id": _r.choice("abc"), "updated_at": _r.randrange(1000), "seq": i} for i in range(300_000)]
_t = time.perf_counter()
_out = latest_per_key(_ev)
assert time.perf_counter() - _t < 20, "too slow"
_ref = {}
for _e in _ev:
    _k = (_e["user_id"], _e["device_id"])
    if _k not in _ref or (_e["updated_at"], _e["seq"]) > (_ref[_k]["updated_at"], _ref[_k]["seq"]):
        _ref[_k] = _e
assert len(_out) == len(_ref) and all(o is _ref[(o["user_id"], o["device_id"])] for o in _out)
assert [(o["user_id"], o["device_id"]) for o in _out] == sorted(_ref), "order the output by key"
`,
        },
      ],
    },
    {
      id: 'scr-data-sessions',
      title: 'Sessionize a clickstream',
      domain: 'data',
      brief: `\`events\` is a list of \`(user_id, timestamp)\` tuples in no particular order; timestamps are integer seconds.

Write \`sessionize(events, gap=1800)\`. A user's session is a run of their events in which each event is at most \`gap\` seconds after the previous one; a larger gap starts a new session.

Return a list of \`(user_id, start, end, count)\` tuples, ordered by \`user_id\` then \`start\`. Duplicate events count each time.`,
      starter: `def sessionize(events, gap=1800):
    ${NOT_DONE}
`,
      solution: `def sessionize(events, gap=1800):
    out = []
    current = None
    for user, ts in sorted(events):
        if current and current[0] == user and ts - current[2] <= gap:
            current[2] = ts
            current[3] += 1
        else:
            if current:
                out.append(tuple(current))
            current = [user, ts, ts, 1]
    if current:
        out.append(tuple(current))
    return out
`,
      checks: [
        {
          name: 'Splits on gaps larger than the limit',
          points: 14,
          tests: `_ev = [("u1", 4000), ("u1", 0), ("u1", 100), ("u1", 1900), ("u1", 3701), ("u1", 5800)]
_out = sessionize(_ev)
assert _out == [("u1", 0, 1900, 3), ("u1", 3701, 5800, 3)], f"got {_out}"
assert sessionize([("u1", 0), ("u1", 1800)]) == [("u1", 0, 1800, 2)], "a gap equal to the limit stays in the session"
assert sessionize([("u1", 0), ("u1", 1801)]) == [("u1", 0, 0, 1), ("u1", 1801, 1801, 1)]
`,
        },
        {
          name: 'Keeps users apart and honours a custom gap',
          points: 12,
          tests: `_ev = [("b", 10), ("a", 10), ("a", 15), ("b", 12), ("a", 100)]
assert sessionize(_ev, gap=10) == [("a", 10, 15, 2), ("a", 100, 100, 1), ("b", 10, 12, 2)], f"got {sessionize(_ev, gap=10)}"
assert sessionize([("a", 5), ("b", 6)], gap=1000) == [("a", 5, 5, 1), ("b", 6, 6, 1)], "different users never share a session"
`,
        },
        {
          name: 'Empty input and duplicates',
          points: 7,
          tests: `assert sessionize([]) == []
assert sessionize([("a", 3), ("a", 3), ("a", 3)]) == [("a", 3, 3, 3)], "duplicate events count each time"
`,
        },
      ],
    },
    {
      id: 'scr-data-cdc',
      title: 'Apply a change log idempotently',
      domain: 'data',
      brief: `A replica table is a dict mapping primary key to \`{"lsn": int, "row": dict}\`. A change is a dict with \`op\` (\`"upsert"\` or \`"delete"\`), \`pk\`, \`lsn\` (log sequence number, larger is newer) and, for upserts, \`row\`.

Write \`apply_changes(table, changes)\`, which updates \`table\` in place and returns it. Changes may arrive out of order and may be delivered more than once, so applying the same batch twice, or in any order, must give the same table.

Rules: a change is ignored unless its \`lsn\` is greater than the \`lsn\` already recorded for that key. A delete must be remembered, or an older upsert arriving later would bring the row back: keep it as \`{"lsn": lsn, "row": None}\`.

Also write \`live_rows(table)\` returning \`{pk: row}\` for keys that are not deleted.`,
      starter: `def apply_changes(table, changes):
    ${NOT_DONE}

def live_rows(table):
    ${NOT_DONE}
`,
      solution: `def apply_changes(table, changes):
    for c in changes:
        cur = table.get(c["pk"])
        if cur is not None and c["lsn"] <= cur["lsn"]:
            continue
        table[c["pk"]] = {"lsn": c["lsn"], "row": c["row"] if c["op"] == "upsert" else None}
    return table

def live_rows(table):
    return {pk: v["row"] for pk, v in table.items() if v["row"] is not None}
`,
      checks: [
        {
          name: 'Applies upserts and deletes in log order',
          points: 12,
          tests: `_ch = [
    {"op": "upsert", "pk": 1, "lsn": 10, "row": {"name": "a"}},
    {"op": "upsert", "pk": 2, "lsn": 11, "row": {"name": "b"}},
    {"op": "upsert", "pk": 1, "lsn": 12, "row": {"name": "a2"}},
    {"op": "delete", "pk": 2, "lsn": 13},
]
_t = {}
assert apply_changes(_t, _ch) is _t, "return the same table object"
assert live_rows(_t) == {1: {"name": "a2"}}, f"got {live_rows(_t)}"
assert _t[2] == {"lsn": 13, "row": None}, "a delete is kept as a tombstone"
`,
        },
        {
          name: 'Same result for any order and for replays',
          points: 14,
          tests: `import copy, itertools
_ch = [
    {"op": "upsert", "pk": 1, "lsn": 10, "row": {"v": 1}},
    {"op": "delete", "pk": 1, "lsn": 12},
    {"op": "upsert", "pk": 1, "lsn": 11, "row": {"v": 2}},
    {"op": "upsert", "pk": 2, "lsn": 5, "row": {"v": 3}},
]
_want = apply_changes({}, sorted(_ch, key=lambda c: c["lsn"]))
assert live_rows(_want) == {2: {"v": 3}}, "the delete at lsn 12 is newer than both upserts of key 1"
for _perm in itertools.permutations(_ch):
    _t = apply_changes({}, copy.deepcopy(list(_perm)))
    assert _t == _want, f"order {[c['lsn'] for c in _perm]} gave {_t}"
_t = apply_changes(apply_changes({}, copy.deepcopy(_ch)), copy.deepcopy(_ch))
assert _t == _want, "replaying the batch must change nothing"
`,
        },
        {
          name: 'A newer upsert after a delete restores the row',
          points: 9,
          tests: `_t = {7: {"lsn": 20, "row": None}}
apply_changes(_t, [{"op": "upsert", "pk": 7, "lsn": 19, "row": {"v": "stale"}}])
assert live_rows(_t) == {}, "an older upsert must not undo a delete"
apply_changes(_t, [{"op": "upsert", "pk": 7, "lsn": 21, "row": {"v": "back"}}])
assert live_rows(_t) == {7: {"v": "back"}}
apply_changes(_t, [{"op": "upsert", "pk": 7, "lsn": 21, "row": {"v": "same lsn"}}])
assert live_rows(_t) == {7: {"v": "back"}}, "an equal lsn is a replay and is ignored"
`,
        },
      ],
    },
  ],
};
