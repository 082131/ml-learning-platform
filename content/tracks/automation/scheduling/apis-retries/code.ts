// Code for "Calling APIs reliably". The timeline uses src/lib/automation/retry.ts (seeded, unit-tested); the server
// replies are a simulation. retry_demo.py runs under CPython 3.13 and Pyodide with a fixed seed; its output is
// checked by python-outputs.test.ts. The urllib3 backoff values were printed from urllib3 2.8.0's
// Retry.get_backoff_time(); tenacity's parameters were checked against tenacity 9.2.1. Neither runs in the browser.
import { retryExperiment, type RetryState } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const retry = retryExperiment('auto-retry');

export const policyCode: CodeExample = {
  id: 'retry-policy',
  language: 'python',
  source: `# The policy in the explorer, as a tenacity decorator (pip install tenacity)
from tenacity import (retry, retry_if_exception, stop_after_attempt, wait_exponential,
                      wait_fixed, wait_none, wait_random_exponential)

@retry(
    stop=stop_after_attempt({{attempts}}),
    wait={{wait}},
    retry=retry_if_exception(is_transient),   # only 408, 429, 5xx and network errors
    reraise=True,
)
def fetch_page(session, url, cursor):
    resp = session.get(url, params={"cursor": cursor}, timeout=10)
    resp.raise_for_status()
    return resp.json()`,
  slots: {
    attempts: (s) => String((s as RetryState).maxAttempts),
    wait: (s) => { const x = s as RetryState; return x.strategy === 'none' ? 'wait_none()' : x.strategy === 'fixed' ? `wait_fixed(${x.base})` : x.strategy === 'exponential' ? `wait_exponential(multiplier=${x.base}, max=${x.cap})` : `wait_random_exponential(multiplier=${x.base}, max=${x.cap})`; },
  },
  annotations: [
    {
      id: 'stop-after-attempt',
      range: { line: 2 },
      kind: 'parameter',
      title: "stop_after_attempt",
      what: "Gives up after this many attempts in total, the first one included.",
      why: "Retries must end. A job that retries forever hides an outage instead of reporting it.",
    },
    {
      id: 'wait',
      range: { line: 7 },
      kind: 'parameter',
      title: "wait",
      what: "The strategy from the explorer: wait_exponential(multiplier, max) doubles from the base; wait_random_exponential draws a random wait up to that value (full jitter).",
      why: "tenacity does not read Retry-After for you; honour it with a custom wait function if the API sends one.",
    },
    {
      id: 'retry-only-transient-errors',
      range: { line: 8 },
      kind: 'function',
      title: "Retry only transient errors",
      what: "is_transient is your own predicate: True for timeouts, connection errors and 408/429/5xx responses.",
      why: "Retrying a 400 or 404 wastes time and quota: the request is wrong and will fail identically.",
    },
    {
      id: 'reraise',
      range: { line: 9 },
      kind: 'parameter',
      title: "reraise",
      what: "After the last attempt, raise the original exception, not tenacity’s RetryError wrapper.",
      why: "Callers and logs see the real cause.",
    },
    {
      id: 'timeout-10',
      range: { line: 12 },
      kind: 'parameter',
      title: "timeout=10",
      what: "Abandon a request after 10 seconds without a response.",
      why: "requests has no default timeout: without one, a hung connection hangs your job forever and no retry ever happens.",
    },
  ],
};

export const urllib3Code: CodeExample = {
  id: 'urllib3-retry',
  language: 'python',
  source: `import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

retries = Retry(
    total=5,
    backoff_factor=0.5,                       # waits 0, 1, 2, 4, 8 s (urllib3 2.x, capped at 120 s)
    status_forcelist=[429, 500, 502, 503, 504],
    respect_retry_after_header=True,          # the default: honour Retry-After on 413, 429 and 503
)
session = requests.Session()
session.mount("https://", HTTPAdapter(max_retries=retries))
resp = session.get("https://api.example.com/v1/sales", params={"day": "2026-11-22"}, timeout=10)`,
  annotations: [
    {
      id: 'backoff-factor',
      range: { line: 7 },
      kind: 'parameter',
      title: "backoff_factor",
      what: "urllib3 2.x waits backoff_factor × 2^(n−1) after the n-th consecutive error, except that the first retry is immediate: 0, 1, 2, 4, 8 s here.",
      why: "No jitter by default (backoff_jitter=0). Add backoff_jitter if many clients share the schedule.",
    },
    {
      id: 'status-forcelist',
      range: { line: 8 },
      kind: 'parameter',
      title: "status_forcelist",
      what: "Responses with these codes are retried. Without it, urllib3 retries only connection-level failures.",
      why: "Listing 400 or 404 here would retry requests that can never succeed.",
    },
    {
      id: 'retry-after',
      range: { line: 9 },
      kind: 'parameter',
      title: "Retry-After",
      what: "When a 413, 429 or 503 response carries Retry-After, urllib3 sleeps that long instead of the backoff.",
      why: "The server knows its own limits. Ignoring Retry-After is how clients get banned.",
    },
    {
      id: 'mount-the-adapter',
      range: { line: 12 },
      kind: 'framework',
      title: "Mount the adapter",
      what: "Every https:// request made through this session uses the retry policy.",
      why: "POST is not in urllib3’s default allowed_methods, because retrying a non-idempotent request can do the work twice.",
    },
  ],
};

export const idempotencyCode: CodeExample = {
  id: 'idempotency-key',
  language: 'python',
  source: `import uuid

key = str(uuid.uuid4())          # one key per logical operation, reused for every retry of it
for attempt in range(1, 4):
    try:
        resp = session.post(
            "https://api.example.com/v1/training-jobs",
            json={"dataset": "sales-2026-11-22", "config": "nightly"},
            headers={"Idempotency-Key": key},
            timeout=10,
        )
        break
    except requests.Timeout:
        continue                 # did the server start the job? the key makes it safe to ask again`,
  annotations: [
    {
      id: 'one-key-per-operation',
      range: { line: 3 },
      kind: 'variable',
      title: "One key per operation",
      what: "A random id created once, before the first attempt.",
      why: "Creating a new key per attempt would defeat the purpose: each retry would look like a new request.",
    },
    {
      id: 'idempotency-key-header',
      range: { line: 9 },
      kind: 'parameter',
      title: "Idempotency-Key header",
      what: "APIs that support it (Stripe made it popular) store the key with the result and return the stored result for a repeat.",
      why: "A timeout does not tell you whether the server did the work. With the key, retrying a POST cannot start two training jobs.",
    },
  ],
};

export const retryDemo: CodeExample = {
  id: 'retry-demo',
  language: 'python',
  run: 'pyodide',
  source: `import random

class TransientError(Exception):
    """A failure worth retrying: timeout, 429, 500, 502, 503, 504."""

def call_with_retries(fn, max_attempts=5, base=1.0, cap=30.0, sleep=None, rng=random):
    """Full-jitter exponential backoff: wait a random time in [0, min(cap, base * 2**(n-1))]."""
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except TransientError as err:
            if attempt == max_attempts:
                raise
            delay = rng.uniform(0, min(cap, base * 2 ** (attempt - 1)))
            print(f"attempt {attempt} failed ({err}); retrying in {delay:.2f} s")
            sleep(delay)

# A fake API that fails three times, then answers. The fake clock records waits instead of sleeping.
replies = iter(["503", "503", "502", "ok"])
def flaky_api():
    r = next(replies)
    if r != "ok":
        raise TransientError(f"HTTP {r}")
    return {"rows": 1250}

waited = []
result = call_with_retries(flaky_api, sleep=waited.append, rng=random.Random(42))
print(result, f"after waiting {sum(waited):.2f} s in total")`,
  expectedOutput: `attempt 1 failed (HTTP 503); retrying in 0.64 s
attempt 2 failed (HTTP 503); retrying in 0.05 s
attempt 3 failed (HTTP 502); retrying in 1.10 s
{'rows': 1250} after waiting 1.79 s in total`,
  annotations: [
    {
      id: 'which-errors-to-retry',
      range: { line: 3 },
      kind: 'syntax',
      title: "Which errors to retry",
      what: "A dedicated exception type for failures worth retrying.",
      why: "Everything else (bad input, 404, a bug) propagates at once.",
    },
    {
      id: 'full-jitter',
      range: { line: 14 },
      kind: 'math',
      title: "Full jitter",
      what: "A uniformly random wait between 0 and the exponential value, capped.",
      why: "Clients that failed together no longer retry together (the thundering herd in the explorer).",
    },
    {
      id: 'give-up-loudly',
      range: { line: 12 },
      kind: 'syntax',
      title: "Give up loudly",
      what: "Re-raise the last error after the final attempt.",
      why: "The caller, and the scheduler’s exit code, must learn that the job failed.",
    },
    {
      id: 'an-injectable-sleep',
      range: { line: 27 },
      kind: 'parameter',
      title: "An injectable sleep",
      what: "The demo passes a fake sleep that records waits.",
      why: "The same trick makes retry logic testable in milliseconds instead of minutes.",
    },
  ],
};
