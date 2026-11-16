import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// The general Python screen most data and ML roles start with: clean code, edge cases, sensible complexity.
export const pythonScreen: ScreenDef = {
  id: 'python',
  role: 'python',
  title: 'Python coding screen',
  summary:
    'Three problems at phone-screen level in the standard library only: counting, intervals and a decorator. Graded on edge cases as much as on the happy path.',
  minutes: 45,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-py-topk',
      title: 'Top-k frequent words',
      domain: 'python',
      brief: `Write \`top_words(lines, k)\`. \`lines\` is any iterable of strings, possibly a generator over a huge file, so read it once and do not turn it into a list.

Words are runs of letters, digits and apostrophes; compare them case-insensitively and return them in lower case. Return the \`k\` most frequent as a list of \`(word, count)\`, highest count first, ties in alphabetical order.`,
      starter: `def top_words(lines, k):
    ${NOT_DONE}
`,
      solution: `import re
from collections import Counter

_WORD = re.compile(r"[a-z0-9']+")

def top_words(lines, k):
    counts = Counter()
    for line in lines:
        counts.update(_WORD.findall(line.lower()))
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
`,
      checks: [
        {
          name: 'Counts case-insensitively and strips punctuation',
          points: 12,
          tests: `_out = top_words(["The cat. The DOG!", "the cat's toy, the end"], 3)
assert _out == [("the", 4), ("cat", 1), ("cat's", 1)], f"got {_out}"
assert top_words(["a-b a_b"], 5) == [("a", 2), ("b", 2)], "hyphens and underscores separate words"
`,
        },
        {
          name: 'Ties are alphabetical; k may exceed the vocabulary',
          points: 10,
          tests: `assert top_words(["b a c", "c b a"], 2) == [("a", 2), ("b", 2)]
assert top_words(["x y x"], 10) == [("x", 2), ("y", 1)]
assert top_words([], 3) == [] and top_words(["...", ""], 3) == [] and top_words(["a"], 0) == []
`,
        },
        {
          name: 'Reads a generator once',
          points: 10,
          tests: `_seen = []
def _gen():
    for _i in range(20_000):
        _seen.append(_i)
        yield f"w{_i % 7} w{_i % 3} filler"
_out = top_words(_gen(), 2)
assert _out == [("filler", 20_000), ("w0", 9525)], f"got {_out}"
assert len(_seen) == 20_000, "consume the iterable exactly once"
`,
        },
      ],
    },
    {
      id: 'scr-py-intervals',
      title: 'Merge intervals',
      domain: 'python',
      brief: `Maintenance windows are given as \`(start, end)\` pairs with \`start <= end\`, in any order.

Write \`merge_intervals(intervals)\` returning the merged windows as a sorted list of tuples. Windows that overlap or touch (one ends where the next starts) are merged. Do not modify the input.

Write \`total_covered(intervals)\` returning the total length covered, counting overlapping parts once.`,
      starter: `def merge_intervals(intervals):
    ${NOT_DONE}

def total_covered(intervals):
    ${NOT_DONE}
`,
      solution: `def merge_intervals(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged

def total_covered(intervals):
    return sum(end - start for start, end in merge_intervals(intervals))
`,
      checks: [
        {
          name: 'Merges overlapping and touching windows',
          points: 13,
          tests: `_in = [(8, 10), (1, 3), (2, 6), (15, 18), (10, 11)]
assert merge_intervals(_in) == [(1, 6), (8, 11), (15, 18)], f"got {merge_intervals(_in)}"
assert _in == [(8, 10), (1, 3), (2, 6), (15, 18), (10, 11)], "the input must not be modified"
assert merge_intervals([(1, 10), (2, 3), (4, 5)]) == [(1, 10)], "a window inside another must not shorten it"
`,
        },
        {
          name: 'Edge cases',
          points: 10,
          tests: `assert merge_intervals([]) == []
assert merge_intervals([(5, 5)]) == [(5, 5)]
assert merge_intervals([(1, 2), (1, 2), (1, 2)]) == [(1, 2)]
assert merge_intervals([[3, 4], [1, 2]]) == [(1, 2), (3, 4)], "return tuples, sorted, even when given lists"
assert merge_intervals([(-5, -1), (-2, 4)]) == [(-5, 4)]
`,
        },
        {
          name: 'total_covered counts overlaps once',
          points: 10,
          tests: `assert total_covered([(1, 3), (2, 6), (8, 10)]) == 7
assert total_covered([]) == 0 and total_covered([(4, 4)]) == 0
import random
_r = random.Random(9)
_iv = [(a, a + _r.randrange(0, 50)) for a in (_r.randrange(0, 2000) for _ in range(3000))]
_cells = set()
for _a, _b in _iv:
    _cells.update(range(_a, _b))
assert total_covered(_iv) == len(_cells), "does not match a brute-force count"
`,
        },
      ],
    },
    {
      id: 'scr-py-retry',
      title: 'Retry decorator with backoff',
      domain: 'python',
      brief: `Write a decorator factory \`retry(times, base_delay=1.0, exceptions=(Exception,), sleep=time.sleep)\`.

The decorated function is called up to \`times\` times in total. If it raises one of \`exceptions\`, wait and try again; the wait before attempt 2 is \`base_delay\`, then it doubles each time. Wait by calling \`sleep(seconds)\`, which the tests replace with a recorder. After the last attempt fails, re-raise that exception without sleeping. Any other exception propagates at once.

Arguments and the return value pass through unchanged, and the wrapper keeps the function's \`__name__\`.`,
      starter: `import time

def retry(times, base_delay=1.0, exceptions=(Exception,), sleep=time.sleep):
    ${NOT_DONE}
`,
      solution: `import functools
import time

def retry(times, base_delay=1.0, exceptions=(Exception,), sleep=time.sleep):
    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise
                    sleep(delay)
                    delay *= 2
        return wrapper
    return decorate
`,
      checks: [
        {
          name: 'Retries with doubling waits, then succeeds',
          points: 14,
          tests: `_waits = []; _calls = []
@retry(4, base_delay=0.5, sleep=_waits.append)
def flaky(x, scale=1):
    _calls.append(x)
    if len(_calls) < 3:
        raise ConnectionError("try again")
    return x * scale
assert flaky(7, scale=3) == 21, "arguments and the return value pass through"
assert len(_calls) == 3 and _waits == [0.5, 1.0], f"calls={len(_calls)}, waits={_waits}"
assert flaky.__name__ == "flaky", "keep the wrapped function's name"
`,
        },
        {
          name: 'Gives up after the last attempt and re-raises',
          points: 11,
          tests: `_waits = []; _n = [0]
@retry(3, base_delay=2, sleep=_waits.append)
def always():
    _n[0] += 1
    raise TimeoutError(f"attempt {_n[0]}")
try:
    always()
except TimeoutError as _e:
    assert str(_e) == "attempt 3", "re-raise the exception from the last attempt"
else:
    raise AssertionError("expected TimeoutError")
assert _n[0] == 3 and _waits == [2, 4], f"three calls and two waits expected, got {_n[0]} calls, waits {_waits}"
`,
        },
        {
          name: 'Only the listed exceptions are retried',
          points: 10,
          tests: `_waits = []; _n = [0]
@retry(5, exceptions=(KeyError,), sleep=_waits.append)
def wrong_kind():
    _n[0] += 1
    raise ValueError("not retryable")
try:
    wrong_kind()
except ValueError:
    pass
else:
    raise AssertionError("expected ValueError")
assert _n[0] == 1 and _waits == [], "an unlisted exception propagates at once"
@retry(1, sleep=_waits.append)
def once():
    return "ok"
assert once() == "ok" and _waits == []
`,
        },
      ],
    },
  ],
};
