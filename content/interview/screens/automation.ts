import type { ScreenDef } from '@/lib/interview/types';

// Automation rounds ask for the small pieces that make unattended jobs safe: a client-side rate limiter, a heartbeat
// monitor and a backfill planner.
export const automationScreen: ScreenDef = {
  id: 'automation',
  role: 'automation',
  title: 'Automation coding screen',
  summary:
    'Three building blocks of reliable automation, implemented exactly: a token-bucket rate limiter, a heartbeat monitor with late and recovered alerts, and a backfill planner with reprocess behaviours and waves.',
  minutes: 45,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-auto-bucket',
      title: "Rate-limit API calls with a token bucket",
      domain: 'automation',
      brief: `Write \`TokenBucket(rate, capacity)\`, the limiter most API clients use to stay under a quota. The bucket starts full. Tokens refill continuously at \`rate\` per second and never exceed \`capacity\`. Times are seconds as floats and never go backwards.

\`allow(now, cost=1)\` refills for the time since the previous call, then spends \`cost\` tokens and returns True if there are enough, otherwise returns False and spends nothing.

\`wait_time(now, cost=1)\` returns how many seconds from \`now\` until \`allow(now + wait, cost)\` would succeed (0 if it would succeed now). It must not change the bucket.`,
      starter: `class TokenBucket:
    def __init__(self, rate, capacity):
        raise NotImplementedError

    def allow(self, now, cost=1):
        raise NotImplementedError

    def wait_time(self, now, cost=1):
        raise NotImplementedError
`,
      solution: `class TokenBucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last = None

    def allow(self, now, cost=1):
        if self.last is not None:
            self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

    def wait_time(self, now, cost=1):
        tokens = self.tokens
        if self.last is not None:
            tokens = min(self.capacity, tokens + (now - self.last) * self.rate)
        return max(0.0, (cost - tokens) / self.rate)
`,
      checks: [
        { name: "Bursts up to capacity, then refill at the rate", points: 12, tests: `_b = TokenBucket(rate=2, capacity=5)
assert [_b.allow(0) for _ in range(6)] == [True] * 5 + [False], "a full bucket allows a burst of 5"
assert _b.allow(0.5) and not _b.allow(0.5), "2 tokens per second refill 1 token in 0.5 s"
` },
        { name: "Refill is capped and costs can be more than 1", points: 10, tests: `_b = TokenBucket(rate=1, capacity=3)
for _ in range(3):
    _b.allow(0)
assert _b.allow(100) and _b.allow(100) and _b.allow(100) and not _b.allow(100), "refill is capped at capacity"
_b = TokenBucket(rate=1, capacity=10)
assert _b.allow(0, cost=10) and not _b.allow(1, cost=2) and _b.allow(2, cost=2)
` },
        { name: "wait_time predicts the wait without spending tokens", points: 10, tests: `_b = TokenBucket(rate=4, capacity=4)
assert _b.wait_time(0) == 0
for _ in range(4):
    _b.allow(0)
assert abs(_b.wait_time(0) - 0.25) < 1e-9 and abs(_b.wait_time(0, cost=2) - 0.5) < 1e-9
assert abs(_b.wait_time(0.125) - 0.125) < 1e-9, "wait_time accounts for refill"
assert not _b.allow(0.125) and _b.allow(0.25), "wait_time does not consume tokens"
` },
      ],
    },
    {
      id: 'scr-auto-heartbeat',
      title: "Alert on jobs that stopped checking in",
      domain: 'automation',
      brief: `Scheduled jobs ping a monitor when they finish. Write the monitor. Times are minutes as integers.

\`jobs\` maps a job name to \`(every, grace, created)\`. \`pings\` maps a job name to a list of ping times (possibly missing or empty).

\`overdue(jobs, pings, now)\` returns \`(name, minutes_late)\` for every job whose last ping (or \`created\`, if it never pinged) plus \`every\` plus \`grace\` is strictly before \`now\`. Sort by minutes late, largest first, then by name.

\`alerts(jobs, pings, times)\` evaluates the monitor at each time in \`times\` (ascending), using only pings at or before that time, and returns a list of \`(time, name, "late")\` when a job becomes late and \`(time, name, "recovered")\` when a late job is no longer late. Do not repeat an alert while a job stays late. Within one time, list events by name.`,
      starter: `def overdue(jobs, pings, now):
    raise NotImplementedError

def alerts(jobs, pings, times):
    raise NotImplementedError
`,
      solution: `def overdue(jobs, pings, now):
    late = []
    for name, (every, grace, created) in jobs.items():
        last = max(pings.get(name, []), default=created)
        due = last + every + grace
        if now > due:
            late.append((name, now - due))
    return sorted(late, key=lambda x: (-x[1], x[0]))

def alerts(jobs, pings, times):
    sent, out = set(), []
    for now in times:
        late = {name for name, _ in overdue(jobs, pings_upto(pings, now), now)}
        for name in sorted(late - sent):
            out.append((now, name, "late"))
        for name in sorted(sent - late):
            out.append((now, name, "recovered"))
        sent = late
    return out

def pings_upto(pings, now):
    return {k: [t for t in v if t <= now] for k, v in pings.items()}
`,
      checks: [
        { name: "A job is late only after its period plus grace", points: 10, tests: `_jobs = {"nightly-train": (1440, 60, 0), "hourly-sync": (60, 10, 0), "weekly-report": (10080, 120, 0)}
assert overdue(_jobs, {"nightly-train": [1400], "hourly-sync": [1430]}, 1500) == []
assert overdue(_jobs, {"nightly-train": [1400], "hourly-sync": [1430]}, 1501) == [("hourly-sync", 1)]
` },
        { name: "Late jobs sorted by lateness, counted from creation if never pinged", points: 12, tests: `_jobs = {"nightly-train": (1440, 60, 0), "hourly-sync": (60, 10, 0), "weekly-report": (10080, 120, 0)}
_late = overdue(_jobs, {"hourly-sync": [100]}, 3000)
assert _late == [("hourly-sync", 2830), ("nightly-train", 1500)], _late
assert overdue({"new": (60, 5, 1000)}, {}, 1060) == [], "a job with no pings counts from when it was created"
assert overdue({"new": (60, 5, 1000)}, {}, 1066) == [("new", 1)]
` },
        { name: "Alerts fire once when late and once on recovery", points: 12, tests: `_jobs = {"nightly-train": (1440, 60, 0), "hourly-sync": (60, 10, 0), "weekly-report": (10080, 120, 0)}
_a = alerts({"sync": (60, 10, 0)}, {"sync": [50, 200]}, [100, 130, 160, 190, 210, 270, 280])
assert _a == [(130, "sync", "late"), (210, "sync", "recovered"), (280, "sync", "late")], _a
` },
      ],
    },
    {
      id: 'scr-auto-backfill',
      title: "Plan a backfill like airflow backfill create",
      domain: 'automation',
      brief: `Plan which daily runs a backfill should create.

\`plan_backfill(start, end, existing, reprocess="none")\` takes two \`datetime.date\` values (both inclusive) and \`existing\`, a dict mapping dates that already have a run to its state: \`"success"\`, \`"failed"\` or \`"running"\`. Return the dates to run, in order. With \`"none"\`, only dates with no run. With \`"failed"\`, also failed dates. With \`"completed"\`, also failed and successful dates. A running date is never included.

\`waves(days, max_active, backwards=False)\` sorts the dates (newest first when \`backwards\`) and splits them into consecutive lists of at most \`max_active\`, the runs that may be active together.`,
      starter: `from datetime import date, timedelta

def plan_backfill(start, end, existing, reprocess="none"):
    raise NotImplementedError

def waves(days, max_active, backwards=False):
    raise NotImplementedError
`,
      solution: `from datetime import date, timedelta

def plan_backfill(start, end, existing, reprocess="none"):
    days = []
    d = start
    while d <= end:
        state = existing.get(d)
        if state is None:
            days.append(d)
        elif reprocess == "failed" and state == "failed":
            days.append(d)
        elif reprocess == "completed" and state in ("failed", "success"):
            days.append(d)
        d += timedelta(days=1)
    return days

def waves(days, max_active, backwards=False):
    order = sorted(days, reverse=backwards)
    return [order[i:i + max_active] for i in range(0, len(order), max_active)]
`,
      checks: [
        { name: "Default plan fills only missing dates, inclusive", points: 12, tests: `from datetime import date as _date
_ex = {_date(2026, 11, 2): "success", _date(2026, 11, 3): "failed", _date(2026, 11, 5): "running"}
_p = plan_backfill(_date(2026, 11, 1), _date(2026, 11, 5), _ex)
assert _p == [_date(2026, 11, 1), _date(2026, 11, 4)], "default none: only dates with no run"
assert plan_backfill(_date(2026, 11, 7), _date(2026, 11, 7), {}) == [_date(2026, 11, 7)], "both ends inclusive"
` },
        { name: "Reprocess behaviours failed and completed", points: 12, tests: `from datetime import date as _date
_ex = {_date(2026, 11, 2): "success", _date(2026, 11, 3): "failed", _date(2026, 11, 5): "running"}
assert plan_backfill(_date(2026, 11, 1), _date(2026, 11, 5), _ex, "failed") == [_date(2026, 11, 1), _date(2026, 11, 3), _date(2026, 11, 4)]
_c = plan_backfill(_date(2026, 11, 1), _date(2026, 11, 5), _ex, "completed")
assert _c == [_date(2026, 11, d) for d in (1, 2, 3, 4)], "a running run is never reprocessed"
` },
        { name: "Runs are grouped into waves of max_active", points: 10, tests: `from datetime import date as _date
_ex = {_date(2026, 11, 2): "success", _date(2026, 11, 3): "failed", _date(2026, 11, 5): "running"}
_d = [_date(2026, 11, d) for d in (4, 1, 3, 2, 5)]
assert waves(_d, 2) == [[_date(2026, 11, 1), _date(2026, 11, 2)], [_date(2026, 11, 3), _date(2026, 11, 4)], [_date(2026, 11, 5)]]
assert waves(_d, 3, backwards=True)[0] == [_date(2026, 11, 5), _date(2026, 11, 4), _date(2026, 11, 3)]
assert waves([], 2) == []
` },
      ],
    },
  ],
};
