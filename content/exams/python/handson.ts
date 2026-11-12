import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Python for Data & ML exam: 5 tasks, 100 points. Tasks 2–4 use NumPy and pandas (both load
// in the browser). Task 5 rebuilds autograd in plain Python, since PyTorch cannot run in the browser.
// Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'python-h1',
    title: 'An LRU memoize decorator and a lazy batcher',
    domain: 'lang',
    brief: `Write two utilities with the standard library only.

\`memoize(maxsize)\` is a decorator factory. The wrapped function caches results keyed by its positional arguments plus its keyword arguments (order of keywords must not matter). When the cache holds more than \`maxsize\` entries, evict the least recently used one; a cache hit counts as a use. The wrapper must keep the wrapped function's \`__name__\` and \`__doc__\`, and expose \`cache_info()\` returning \`(hits, misses, current_size)\`.

\`batched(iterable, n)\` is a generator yielding tuples of \`n\` items, with a shorter final tuple if items run out. It must be lazy, so it works on an endless iterator such as \`itertools.count()\`. Raise \`ValueError\` when \`n < 1\`.`,
    starter: `import functools
from collections import OrderedDict

def memoize(maxsize):
    ${NOT_DONE}

def batched(iterable, n):
    ${NOT_DONE}
`,
    solution: `import functools
from collections import OrderedDict

def memoize(maxsize):
    def deco(fn):
        cache = OrderedDict()
        stats = {'hits': 0, 'misses': 0}
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            if key in cache:
                stats['hits'] += 1
                cache.move_to_end(key)
                return cache[key]
            stats['misses'] += 1
            value = fn(*args, **kwargs)
            cache[key] = value
            if len(cache) > maxsize:
                cache.popitem(last=False)
            return value
        wrapper.cache_info = lambda: (stats['hits'], stats['misses'], len(cache))
        return wrapper
    return deco

def batched(iterable, n):
    if n < 1:
        raise ValueError('n must be at least 1')
    it = iter(iterable)
    while True:
        chunk = []
        for _ in range(n):
            try:
                chunk.append(next(it))
            except StopIteration:
                break
        if not chunk:
            return
        yield tuple(chunk)
`,
    checks: [
      {
        name: 'Evicts the least recently used entry',
        points: 8,
        tests: `_calls = []
@memoize(2)
def sq(x):
    _calls.append(x)
    return x * x
assert [sq(1), sq(2), sq(1), sq(3), sq(2)] == [1, 4, 1, 9, 4]
assert _calls == [1, 2, 3, 2], f"recomputed {_calls}; a hit on 1 should make 2 the one to evict"
`,
      },
      {
        name: 'Keyword arguments, stats and metadata',
        points: 5,
        tests: `@memoize(10)
def add(a, b=0):
    "adds"
    return a + b
add(1, b=2); add(1, b=2); add(2)
assert add.cache_info() == (1, 2, 2), add.cache_info()
assert add.__name__ == 'add' and add.__doc__ == 'adds', "use functools.wraps"
@memoize(10)
def kw(**k):
    return sorted(k)
kw(x=1, y=2); kw(y=2, x=1)
assert kw.cache_info() == (1, 1, 1), "keyword order must not matter"
`,
      },
      {
        name: 'batched is lazy and keeps the remainder',
        points: 7,
        tests: `import itertools
_g = batched(itertools.count(), 3)
assert next(_g) == (0, 1, 2) and next(_g) == (3, 4, 5), "batched must work on an endless iterator"
assert list(batched('abcdefg', 3)) == [('a', 'b', 'c'), ('d', 'e', 'f'), ('g',)]
assert list(batched([], 2)) == []
try:
    list(batched([1], 0))
    assert False, "n < 1 must raise ValueError"
except ValueError:
    pass
`,
      },
    ],
  },
  {
    id: 'python-h2',
    title: 'NumPy without loops: scaling, windows and distances',
    domain: 'numpy',
    brief: `Use NumPy. Python loops over rows or elements will be slow, but they are not graded.

\`standardize(X)\` takes a 2-D float array that may contain NaN and returns a new array where each column has its NaN-ignoring mean subtracted and is divided by its NaN-ignoring population standard deviation (\`ddof=0\`). NaN stays NaN. A column whose standard deviation is 0 becomes 0 (NaN entries stay NaN). Do not modify \`X\`.

\`sliding_windows(x, w, step=1)\` returns a 2-D array whose rows are \`x[i:i+w]\` for \`i = 0, step, 2·step, …\` while the window fits. When \`w > len(x)\` return an empty array of shape \`(0, w)\`.

\`pairwise_sq_dists(A, B)\` returns the \`(len(A), len(B))\` matrix of squared Euclidean distances using broadcasting or the identity \`|a|² + |b|² − 2a·b\`. Clip tiny negative values from rounding to 0.`,
    starter: `import numpy as np

def standardize(X):
    ${NOT_DONE}

def sliding_windows(x, w, step=1):
    ${NOT_DONE}

def pairwise_sq_dists(A, B):
    ${NOT_DONE}
`,
    solution: `import numpy as np

def standardize(X):
    X = np.asarray(X, dtype=float)
    mu = np.nanmean(X, axis=0)
    sd = np.nanstd(X, axis=0)
    safe = np.where(sd == 0, 1.0, sd)
    Z = (X - mu) / safe
    Z[:, sd == 0] = np.where(np.isnan(X[:, sd == 0]), np.nan, 0.0)
    return Z

def sliding_windows(x, w, step=1):
    x = np.asarray(x)
    if w > len(x):
        return np.empty((0, w), dtype=x.dtype)
    starts = np.arange(0, len(x) - w + 1, step)
    return x[starts[:, None] + np.arange(w)]

def pairwise_sq_dists(A, B):
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    d = (A * A).sum(1)[:, None] + (B * B).sum(1)[None, :] - 2 * A @ B.T
    return np.maximum(d, 0.0)
`,
    checks: [
      {
        name: 'Column standardization ignores NaN',
        points: 7,
        tests: `_X = np.array([[1.0, 5.0, 2.0], [3.0, 5.0, np.nan], [5.0, 5.0, 4.0]])
_X0 = _X.copy()
_Z = standardize(_X)
_s = np.sqrt(8 / 3)
assert np.allclose(_Z[:, 0], [-2 / _s, 0, 2 / _s]), _Z
assert np.array_equal(_Z[:, 1], [0.0, 0.0, 0.0]), "a constant column becomes zeros"
assert np.isnan(_Z[1, 2]) and np.allclose(_Z[[0, 2], 2], [-1, 1]), _Z
assert np.array_equal(_X, _X0, equal_nan=True), "standardize must not modify its input"
`,
      },
      {
        name: 'Sliding windows with a step',
        points: 6,
        tests: `_W = sliding_windows(np.arange(7), 3, 2)
assert _W.tolist() == [[0, 1, 2], [2, 3, 4], [4, 5, 6]], _W
assert sliding_windows(np.arange(4), 4).tolist() == [[0, 1, 2, 3]]
assert sliding_windows(np.arange(3), 5).shape == (0, 5)
`,
      },
      {
        name: 'Pairwise squared distances',
        points: 7,
        tests: `_A = np.array([[0.0, 0.0], [1.0, 1.0]])
_B = np.array([[1.0, 0.0], [3.0, 4.0], [1.0, 1.0]])
_D = pairwise_sq_dists(_A, _B)
assert _D.shape == (2, 3) and np.allclose(_D, [[1, 25, 2], [1, 13, 0]]), _D
_R = np.random.default_rng(0).normal(size=(50, 8)) * 1e4
assert (pairwise_sq_dists(_R, _R) >= 0).all(), "clip rounding error so no distance is negative"
`,
      },
    ],
  },
  {
    id: 'python-h3',
    title: 'pandas: cohort retention and top-n per group',
    domain: 'pandas',
    brief: `\`retention_table(events)\` takes a DataFrame with columns \`user\` and \`date\` (datetimes). A user's cohort is the calendar month of their first event. For each cohort and each month offset \`k = 0, 1, 2, …\` (months since the cohort month), compute the share of the cohort's users with at least one event in that month.

Return a DataFrame indexed by cohort as \`'YYYY-MM'\` strings (sorted), with integer columns \`0..K\` where \`K\` is the largest offset seen in any cohort. Offsets with no activity are \`0.0\`, not NaN.

\`top_n_per_group(df, group, value, n)\` returns the \`n\` rows with the largest \`value\` within each group, groups in ascending order, rows by \`value\` descending; ties keep their original row order. Reset the index.`,
    starter: `import pandas as pd

def retention_table(events):
    ${NOT_DONE}

def top_n_per_group(df, group, value, n):
    ${NOT_DONE}
`,
    solution: `import pandas as pd

def retention_table(events):
    df = events[['user', 'date']].copy()
    df['month'] = pd.to_datetime(df['date']).dt.to_period('M')
    first = df.groupby('user')['month'].min().rename('cohort')
    df = df.join(first, on='user')
    df['age'] = (df['month'] - df['cohort']).apply(lambda o: o.n)
    active = df.drop_duplicates(['user', 'age']).groupby(['cohort', 'age'])['user'].count()
    sizes = first.value_counts()
    table = active.unstack(fill_value=0)
    table = table.reindex(columns=range(int(table.columns.max()) + 1), fill_value=0)
    table = table.div(sizes.reindex(table.index), axis=0).astype(float)
    table.index = table.index.astype(str)
    table.index.name = 'cohort'
    table.columns.name = None
    return table.sort_index()

def top_n_per_group(df, group, value, n):
    ranked = df.sort_values([group, value], ascending=[True, False], kind='stable')
    return ranked.groupby(group, sort=False).head(n).reset_index(drop=True)
`,
    checks: [
      {
        name: 'Retention shares per cohort and month',
        points: 8,
        tests: `_e = pd.DataFrame({
    'user': ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'a', 'd'],
    'date': pd.to_datetime(['2024-01-05', '2024-02-10', '2024-01-20', '2024-01-25', '2024-02-01',
                            '2024-04-03', '2024-02-14', '2024-03-30', '2024-03-01']),
})
_t = retention_table(_e)
assert list(_t.index) == ['2024-01', '2024-02'], list(_t.index)
assert [int(c) for c in _t.columns] == [0, 1, 2], list(_t.columns)
assert abs(_t.loc['2024-01', 0] - 1.0) < 1e-9 and abs(_t.loc['2024-01', 1] - 0.5) < 1e-9, _t
assert abs(_t.loc['2024-02', 1] - 0.5) < 1e-9 and abs(_t.loc['2024-02', 2] - 0.5) < 1e-9, _t
`,
      },
      {
        name: 'Empty months are zero, not missing',
        points: 5,
        tests: `_e = pd.DataFrame({
    'user': ['a', 'a', 'b', 'e', 'e', 'c', 'c'],
    'date': pd.to_datetime(['2024-01-05', '2024-02-10', '2024-01-20', '2024-01-31', '2024-05-02',
                            '2024-02-01', '2024-04-03']),
})
_t = retention_table(_e)
assert [int(c) for c in _t.columns] == [0, 1, 2, 3, 4], list(_t.columns)
_row = [round(float(v), 4) for v in _t.loc['2024-01']]
assert _row == [1.0, 0.3333, 0.0, 0.0, 0.3333], _row
assert not _t.isna().any().any(), "inactive months must be 0.0"
`,
      },
      {
        name: 'Top n per group, stable on ties',
        points: 7,
        tests: `_d = pd.DataFrame({'g': ['x', 'y', 'x', 'x', 'y', 'x'], 'v': [3, 5, 9, 3, 1, 3], 'id': [1, 2, 3, 4, 5, 6]})
_r = top_n_per_group(_d, 'g', 'v', 2)
assert _r['id'].tolist() == [3, 1, 2, 5], _r
assert list(_r.index) == [0, 1, 2, 3], "reset the index"
`,
      },
    ],
  },
  {
    id: 'python-h4',
    title: 'Clean a messy orders extract',
    domain: 'clean',
    brief: `\`clean_orders(df)\` takes string columns \`order_id\` (integers), \`email\`, \`amount\`, \`date\` and \`country\`, and returns \`(clean, report)\`.

- \`email\`: strip whitespace and casefold. \`country\`: strip and upper-case.
- \`amount\`: remove \`$\` and \`,\` and parse as float; anything unparseable (empty, \`"n/a"\`) becomes NaN.
- \`date\`: accept ISO \`YYYY-MM-DD\` and European \`DD/MM/YYYY\`; invalid dates become NaT. Store as datetimes.
- Keep the last row for each duplicated \`order_id\`, sort by \`order_id\`, and reset the index.
- \`report\` is a dict with \`rows_in\`, \`rows_out\`, \`bad_amounts\` and \`bad_dates\`, where the bad counts are taken before deduplication.

Do not modify the input frame.`,
    starter: `import pandas as pd

def clean_orders(df):
    ${NOT_DONE}
`,
    solution: `import re
import pandas as pd

def _amount(v):
    if not isinstance(v, str):
        return float('nan')
    s = v.strip().replace('$', '').replace(',', '')
    try:
        return float(s)
    except ValueError:
        return float('nan')

def clean_orders(df):
    out = df.copy()
    out['email'] = out['email'].astype(str).str.strip().str.casefold()
    out['country'] = out['country'].astype(str).str.strip().str.upper()
    amounts = out['amount'].map(_amount)
    bad_amounts = int(amounts.isna().sum())
    out['amount'] = amounts.astype(float)
    iso = pd.to_datetime(out['date'], format='%Y-%m-%d', errors='coerce')
    eu = pd.to_datetime(out['date'], format='%d/%m/%Y', errors='coerce')
    dates = iso.fillna(eu)
    bad_dates = int(dates.isna().sum())
    out['date'] = dates
    rows_in = len(out)
    out = out.drop_duplicates('order_id', keep='last').sort_values('order_id').reset_index(drop=True)
    report = {'rows_in': rows_in, 'rows_out': len(out), 'bad_amounts': bad_amounts, 'bad_dates': bad_dates}
    return out, report
`,
    checks: [
      {
        name: 'Text, amounts and dates are normalized',
        points: 7,
        tests: `_raw = pd.DataFrame({
    'order_id': [3, 1, 2, 1, 4],
    'email': [' Ann@Ex.COM', 'bo@x.io ', 'CY@X.IO', 'bo@x.io', 'di@x.io'],
    'amount': ['$1,234.50', '12', 'n/a', '15.5', ''],
    'date': ['2024-03-05', '05/03/2024', '2024-13-01', '31/01/2024', '2024-02-29'],
    'country': [' us', 'De ', 'de', 'DE', 'fr'],
})
_c, _ = clean_orders(_raw)
_r3 = _c[_c.order_id == 3].iloc[0]
assert _r3.email == 'ann@ex.com' and _r3.country == 'US', _r3
assert abs(_r3.amount - 1234.5) < 1e-9, _r3.amount
assert _r3.date == pd.Timestamp('2024-03-05'), _r3.date
assert _c[_c.order_id == 4].iloc[0].date == pd.Timestamp('2024-02-29'), "2024 is a leap year"
assert pd.isna(_c[_c.order_id == 2].iloc[0].amount) and pd.isna(_c[_c.order_id == 2].iloc[0].date)
`,
      },
      {
        name: 'Duplicates keep the last row, sorted by order',
        points: 7,
        tests: `_raw = pd.DataFrame({
    'order_id': [3, 1, 2, 1, 4],
    'email': [' Ann@Ex.COM', 'bo@x.io ', 'CY@X.IO', 'bo@x.io', 'di@x.io'],
    'amount': ['$1,234.50', '12', 'n/a', '15.5', ''],
    'date': ['2024-03-05', '05/03/2024', '2024-13-01', '31/01/2024', '2024-02-29'],
    'country': [' us', 'De ', 'de', 'DE', 'fr'],
})
_c, _ = clean_orders(_raw)
assert _c.order_id.tolist() == [1, 2, 3, 4] and list(_c.index) == [0, 1, 2, 3], _c
_r1 = _c.iloc[0]
assert abs(_r1.amount - 15.5) < 1e-9 and _r1.date == pd.Timestamp('2024-01-31'), _r1
assert _raw.email.iloc[0] == ' Ann@Ex.COM', "do not modify the input"
`,
      },
      {
        name: 'The report accounts for every row',
        points: 6,
        tests: `_raw = pd.DataFrame({
    'order_id': [3, 1, 2, 1, 4],
    'email': [' Ann@Ex.COM', 'bo@x.io ', 'CY@X.IO', 'bo@x.io', 'di@x.io'],
    'amount': ['$1,234.50', '12', 'n/a', '15.5', ''],
    'date': ['2024-03-05', '05/03/2024', '2024-13-01', '31/01/2024', '2024-02-29'],
    'country': [' us', 'De ', 'de', 'DE', 'fr'],
})
_, _rep = clean_orders(_raw)
assert _rep == {'rows_in': 5, 'rows_out': 4, 'bad_amounts': 2, 'bad_dates': 1}, _rep
`,
      },
    ],
  },
  {
    id: 'python-h5',
    title: 'Build reverse-mode autograd, then train with it',
    domain: 'torch',
    brief: `PyTorch cannot run in the browser, so this task rebuilds the part of it the exam tests: reverse-mode automatic differentiation. Standard library only.

\`Value(data)\` wraps a float with a \`.data\` and a \`.grad\` (starting at 0.0). Support \`+\`, \`-\`, \`*\` with other Values and plain numbers on either side, unary \`-\`, \`v ** k\` for a number \`k\`, and the methods \`relu()\` and \`tanh()\`, each returning a new Value that remembers its inputs.

\`backward()\` sets this value's grad to 1.0 and propagates gradients to every Value it depends on, in reverse topological order. A Value used more than once must receive the sum of its gradient contributions.

\`train_linear(xs, ys, lr, epochs)\` fits \`y ≈ w·x + b\` with full-batch gradient descent on the mean squared error, starting from \`w = b = 0\`, using your Value class. Reset the grads each epoch. Return \`(w, b)\` as floats.`,
    starter: `import math

class Value:
    def __init__(self, data):
        ${NOT_DONE}

def train_linear(xs, ys, lr, epochs):
    ${NOT_DONE}
`,
    solution: `import math

class Value:
    def __init__(self, data, parents=(), grad_fns=()):
        self.data = float(data)
        self.grad = 0.0
        self._parents = parents
        self._grad_fns = grad_fns

    @staticmethod
    def _wrap(x):
        return x if isinstance(x, Value) else Value(x)

    def __add__(self, other):
        other = Value._wrap(other)
        return Value(self.data + other.data, (self, other), (lambda g: g, lambda g: g))

    __radd__ = __add__

    def __mul__(self, other):
        other = Value._wrap(other)
        a, b = self.data, other.data
        return Value(a * b, (self, other), (lambda g: g * b, lambda g: g * a))

    __rmul__ = __mul__

    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + (-Value._wrap(other))

    def __rsub__(self, other):
        return Value._wrap(other) + (-self)

    def __pow__(self, k):
        a = self.data
        return Value(a ** k, (self,), (lambda g: g * k * a ** (k - 1),))

    def relu(self):
        a = self.data
        return Value(max(a, 0.0), (self,), (lambda g: g * (1.0 if a > 0 else 0.0),))

    def tanh(self):
        t = math.tanh(self.data)
        return Value(t, (self,), (lambda g: g * (1 - t * t),))

    def backward(self):
        order, seen = [], set()
        def visit(v):
            if id(v) in seen:
                return
            seen.add(id(v))
            for p in v._parents:
                visit(p)
            order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):
            for p, fn in zip(v._parents, v._grad_fns):
                p.grad += fn(v.grad)

def train_linear(xs, ys, lr, epochs):
    w, b = Value(0.0), Value(0.0)
    n = len(xs)
    for _ in range(epochs):
        w.grad = b.grad = 0.0
        loss = Value(0.0)
        for x, y in zip(xs, ys):
            loss = loss + (w * x + b - y) ** 2
        loss = loss * (1.0 / n)
        loss.backward()
        w.data -= lr * w.grad
        b.data -= lr * b.grad
    return w.data, b.data
`,
    checks: [
      {
        name: 'Forward values and gradients',
        points: 8,
        tests: `_x = Value(3.0)
_y = _x ** 2 + 2 * _x
_y.backward()
assert _y.data == 15.0 and _x.grad == 8.0, (_y.data, _x.grad)
_a, _b = Value(2.0), Value(-4.0)
_c = (_a * _b + 10).relu() + (_a - _b).tanh()
_c.backward()
assert abs(_c.data - 2.9999877117) < 1e-8, _c.data
assert abs(_a.grad + 3.9999754235) < 1e-8 and abs(_b.grad - 1.9999754235) < 1e-8, (_a.grad, _b.grad)
_n = Value(-1.0); _m = _n.relu(); _m.backward()
assert _n.grad == 0.0, "relu passes no gradient below zero"
`,
      },
      {
        name: 'Reused values accumulate gradients',
        points: 6,
        tests: `_u = Value(2.0)
_v = _u * _u * _u
_v.backward()
assert _v.data == 8.0 and _u.grad == 12.0, _u.grad
_p = Value(1.5)
_q = _p * 2
_r = _q + _q * _p
_r.backward()
assert abs(_p.grad - 8.0) < 1e-12, _p.grad
_s = 1 - Value(4.0)
assert _s.data == -3.0, "numbers on the left of - must work"
`,
      },
      {
        name: 'Gradient descent fits a line',
        points: 6,
        tests: `_w1, _b1 = train_linear([1.0, 2.0], [2.0, 4.0], 0.1, 1)
assert abs(_w1 - 1.0) < 1e-9 and abs(_b1 - 0.6) < 1e-9, "one step from zero: w = 1.0, b = 0.6"
_w, _b = train_linear([0.0, 1.0, 2.0, 3.0], [1.0, 3.0, 5.0, 7.0], 0.05, 2000)
assert abs(_w - 2.0) < 1e-4 and abs(_b - 1.0) < 1e-4, (_w, _b)
`,
      },
    ],
  },
];
