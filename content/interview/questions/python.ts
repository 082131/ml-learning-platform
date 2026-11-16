import type { InterviewQuestion } from '@/lib/interview/types';

// Python for Data & ML: the language and library questions asked in screens for data scientist and ML roles.
export const pythonQuestions: InterviewQuestion[] = [
  {
    id: 'py-mutable-default',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'Language',
    prompt:
      'What does this print on the second call, and why? How do you fix it?\n\ndef add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nadd(1)\nprint(add(2))',
    answer: `It prints \`[1, 2]\`. Default argument values are evaluated once, when the \`def\` statement runs, not on each call. The function object holds one list, and every call that omits \`bucket\` appends to that same list, so state leaks between calls.

The fix is the sentinel idiom: default to \`None\` and create the list inside the function.

\`def add(item, bucket=None):\` then \`if bucket is None: bucket = []\`.

I compare with \`is None\` rather than truthiness, so that a caller who passes an empty list still gets their own list used. The same trap applies to any mutable default, such as a dict or a set, and to defaults like \`datetime.now()\`, which would be frozen at import time. Immutable defaults such as numbers, strings and tuples are safe.`,
    covers: [
      'Correct output',
      'Defaults are evaluated once at definition time',
      'The None sentinel fix, using "is None"',
      'Generalizes to other mutable or time-dependent defaults',
    ],
    redFlags: ['Guessing [2]', 'Fixing with "if not bucket"', 'Not knowing why'],
    followUps: [
      'Where is that default list stored?',
      'What does "a = b = []" do, and how is it different from a copy?',
    ],
  },
  {
    id: 'py-gil',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'Concurrency',
    prompt:
      'You need to speed up two jobs: downloading 1,000 files, and computing features for 1,000 large arrays in pure Python. Threads, processes or asyncio for each, and why?',
    answer: `The answer depends on whether the work waits or computes.

Downloading is I/O-bound: the program mostly waits on the network. In standard CPython the global interpreter lock lets only one thread run Python bytecode at a time, but it is released while a thread waits on I/O. So a thread pool or asyncio both work well. I would use a thread pool for simplicity with a blocking library, and asyncio when there are thousands of connections or the library is already async. Either way I cap concurrency so I do not overwhelm the server.

Feature computation in pure Python is CPU-bound. Threads would take turns holding the lock and give no speedup, so I use processes, one per core, each with its own interpreter. The costs are start-up time and pickling arguments and results between processes, so I send work in chunks and avoid shipping large arrays back and forth.

Better still, I would first try to vectorize with NumPy: its compiled loops release the lock and are often a hundred times faster than Python loops, which may remove the need for parallelism. Recent Python versions also offer a build without the lock, but I would not assume it in production.`,
    covers: [
      'Classifies each job as I/O-bound or CPU-bound',
      'What the GIL does and when it is released',
      'Threads or asyncio for I/O; processes for CPU; pickling cost',
      'Vectorize before parallelizing',
    ],
    redFlags: ['"Threads make Python faster" for CPU work', '"Python cannot do concurrency"'],
    followUps: [
      'Why can NumPy code speed up with threads?',
      'What happens if you call a blocking function inside an async function?',
    ],
  },
  {
    id: 'py-generators',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'Language',
    prompt:
      'You must process a 40 GB log file on a machine with 8 GB of memory. How do you write it in Python, and what is a generator?',
    answer: `I never load the file whole. A file object is already a lazy iterator over lines, so \`for line in f:\` holds one line at a time.

A generator is a function that uses \`yield\`. Calling it returns an iterator; each \`next()\` runs the body until the next \`yield\`, hands back one value and pauses, keeping its local state. Values are produced on demand, so memory use is constant regardless of how many items flow through.

I would build the job as a pipeline of generators: one reads lines, one parses, one filters, and the last aggregates into something small such as a counter. Nothing is materialized in between. I avoid anything that silently collects everything, such as \`list(...)\`, \`readlines()\` or \`sorted(...)\` on the full stream.

Two cautions: a generator can be consumed only once, and if the aggregate itself is large, for example distinct users, I need an on-disk or approximate structure. With pandas the equivalent is \`read_csv(..., chunksize=...)\` and combining per-chunk results.`,
    covers: [
      'Streams line by line; never reads the whole file',
      'What yield does: lazy, pauses and resumes, keeps state',
      'A pipeline of generators with a small aggregate',
      'Single-pass nature; chunked reading in pandas',
    ],
    redFlags: ['f.read() or readlines()', 'Confusing a generator with a list comprehension'],
    followUps: [
      'Difference between a list comprehension and a generator expression?',
      'How would you find the top 10 most frequent values in one pass?',
    ],
  },
  {
    id: 'py-broadcasting',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'NumPy',
    prompt:
      "State NumPy's broadcasting rules. Then: `X` has shape (1000, 3) and `mu` has shape (3,). Does `X - mu` work? What about subtracting a per-row mean of shape (1000,)?",
    answer: `Broadcasting compares shapes from the last dimension backwards. Two dimensions are compatible if they are equal or one of them is 1; a missing leading dimension counts as 1. The size-1 dimension is stretched virtually, with no copy.

\`X - mu\`: (1000, 3) against (3,) becomes (1000, 3) against (1, 3). Compatible, and each row has the column means subtracted. That is the standard way to centre features.

A per-row mean of shape (1000,) against (1000, 3): the trailing dimensions are 3 and 1000, which do not match, so it raises an error. I need shape (1000, 1), from \`X.mean(axis=1, keepdims=True)\` or by indexing with \`[:, None]\`.

The dangerous case is when shapes happen to be compatible but mean something else. With a square (3, 3) array, subtracting a row-mean vector of shape (3,) runs without error and subtracts along the wrong axis. Likewise a (n,) vector minus a (n, 1) vector silently produces an (n, n) matrix. So I use \`keepdims=True\` and assert shapes in numeric code.`,
    covers: [
      'Rules: align from the right; equal or 1; missing dimensions are 1',
      'Works through both examples correctly',
      'keepdims or [:, None] to fix the row case',
      'Silent wrong-axis results and the (n,) versus (n, 1) trap',
    ],
    redFlags: ['"Shapes must match"', 'Not knowing the second case fails'],
    followUps: [
      'Why is a vectorized expression faster than a Python loop?',
      'What does a view versus a copy mean, and when does slicing give each?',
    ],
  },
  {
    id: 'py-pandas-merge',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'pandas',
    prompt:
      'After `orders.merge(customers, on="customer_id")` the frame has more rows than `orders`. Why, and how do you guard against it?',
    answer: `The key is not unique in \`customers\`. A merge returns every matching pair, so an order whose customer id appears twice on the right produces two rows. Any sum over the result then counts those orders twice.

To check, I look at \`customers["customer_id"].duplicated().sum()\`, and I compare row counts before and after.

To guard, I state my expectation in the call: \`validate="many_to_one"\` makes pandas raise if the right-hand keys are not unique. That turns a silent data error into a loud one at the line that caused it.

The fix depends on why there are duplicates. If the table holds history, I select the current row per customer first. If they are true duplicates, I deduplicate with a rule I can defend.

Two related traps: the default \`how="inner"\` silently drops orders with no matching customer, so I often use \`how="left"\` with \`indicator=True\` to see what failed to match; and keys with different dtypes, such as an integer on one side and a string on the other, match nothing.`,
    covers: [
      'Duplicate keys on the right multiply rows',
      'Verifies with duplicated() and row counts',
      'validate="many_to_one" as a guard',
      'Inner join dropping rows; indicator; key dtype mismatch',
    ],
    redFlags: ['drop_duplicates() on the result', 'Not checking row counts after a merge'],
    followUps: [
      'How do NaN keys behave in a pandas merge compared with SQL?',
      'When would you use merge_asof?',
    ],
  },
  {
    id: 'py-groupby-leak',
    role: 'python',
    kind: 'technical',
    level: 'senior',
    topic: 'pandas',
    prompt:
      'You add a feature "customer\'s average order value" with `df.groupby("customer")["amount"].transform("mean")`, then split into train and test. What is wrong, and how do you compute it properly?',
    answer: `There are two leaks. The average was computed over all rows before the split, so each training row's feature contains information from test rows. And each row's own amount is inside its own average, which matters most for customers with few orders: with one order, the feature equals the amount.

If the target is related to the amount, the model looks excellent offline and disappoints in production, where the feature can only use the past.

The correct version uses only information available at prediction time. For time-ordered data: sort by time, then within each customer take an expanding mean shifted by one row, so each row sees only earlier orders: \`g["amount"].transform(lambda s: s.shift().expanding().mean())\`. First orders get a missing value, which I fill with a prior and flag.

For non-temporal data: split first, compute the statistic on the training fold only, and map it onto validation and test rows, inside the cross-validation loop. A pipeline object enforces that automatically. The rule is that anything fitted from data, including means, scalers and encoders, is fitted on training data alone.`,
    covers: [
      'Statistic computed before the split leaks test into train',
      "The row's own value is included",
      'Shifted expanding mean for time-ordered data',
      'Fit on train only, inside cross-validation; pipelines',
    ],
    redFlags: ['Seeing nothing wrong', 'Only saying "split first" without the point-in-time issue'],
    followUps: [
      'How is this different from target encoding leakage?',
      'What does transform return compared with agg?',
    ],
  },
  {
    id: 'py-complexity',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'Data structures',
    prompt:
      'A script that checks 1 million ids against a list of 1 million known ids takes hours. Explain why and fix it. When is a list the right choice?',
    answer: `\`x in some_list\` scans the list from the start, comparing one element at a time, so each check costs time proportional to the list's length. A million checks against a million elements is on the order of a trillion comparisons.

A set or a dict is a hash table: Python hashes the value and jumps to its slot, so a membership check takes roughly constant time on average. Converting once with \`known = set(known_ids)\` turns the job into about a million operations, which runs in well under a second. The conversion itself is one linear pass. The cost is memory, since a set uses several times more than a list, and elements must be hashable.

A list is right when order or duplicates matter, when I access by position, or when I only append and iterate. Popping from the front of a list is linear, so for a queue I use \`collections.deque\`.

For this exact task at larger scale, I would think in bulk operations: set intersection, a pandas \`isin\`, or a join in the database.`,
    covers: [
      'List membership is linear; total cost is quadratic',
      'Hash-based set or dict gives average constant-time lookup',
      'Trade-offs: memory, hashability, no order guarantee for sets',
      'When lists and deques fit; bulk alternatives',
    ],
    redFlags: ['"Use multiprocessing"', 'Not being able to state the complexity'],
    followUps: [
      'What makes an object hashable? Why can a list not be a dict key?',
      'What is the worst case for a dict lookup?',
    ],
  },
  {
    id: 'py-float',
    role: 'python',
    kind: 'technical',
    level: 'core',
    topic: 'Numerics',
    prompt:
      'Why is `0.1 + 0.2 == 0.3` False in Python? Where does this bite in ML code, and how do you write comparisons safely?',
    answer: `Floats are binary fractions with 53 bits of precision. 0.1, 0.2 and 0.3 have no exact binary representation, just as one third has no exact decimal one, so each is stored as the nearest representable value. The sum of the stored 0.1 and 0.2 lands on a different neighbour than the stored 0.3; it prints as 0.30000000000000004.

So I never compare floats with \`==\`. I use \`math.isclose\` or \`numpy.allclose\` with a relative and an absolute tolerance, and in tests \`pytest.approx\`.

In ML it bites in several ways. Summing many small numbers accumulates error, and the order of summation changes the result, which is why two runs or two libraries can differ in the last digits. Subtracting nearly equal numbers loses precision. Computing \`log(softmax(x))\` naively overflows or gives \`log(0)\`, so I use the log-sum-exp form, subtracting the maximum first. Probabilities multiplied together underflow, so I add logs instead. And float32, the usual type on GPUs, has only about seven significant digits.

For money I use integers of the smallest unit or \`Decimal\`.`,
    covers: [
      'Binary representation cannot store 0.1 exactly',
      'Tolerance-based comparison with isclose / allclose',
      'ML consequences: summation order, cancellation, log-sum-exp, underflow',
      'float32 precision; Decimal or integers for money',
    ],
    redFlags: ['"Python has a bug"', 'Rounding before comparing as the general fix'],
    followUps: [
      'Why does isclose need both a relative and an absolute tolerance?',
      'Write a numerically stable softmax.',
    ],
  },
  {
    id: 'py-sd-training-script',
    role: 'python',
    kind: 'system-design',
    level: 'senior',
    topic: 'Code design',
    prompt:
      'You inherit a 900-line training notebook that only its author can run. How would you turn it into something a team can rely on?',
    answer: `I would not rewrite it in one go. First I make it reproducible as it is: pin the environment with exact versions, find the data it reads and give that a fixed, versioned location, set random seeds, and capture the current metric as the number to preserve.

Then I move code out of the notebook into a package in small steps, each one checked against that metric. Pure functions for loading, cleaning, feature building, training and evaluation, with typed inputs and outputs and no hidden global state. Configuration such as paths and hyperparameters moves out of the code into one config object or file, so a run is described by its config.

A single command-line entry point runs the pipeline end to end. I add tests where bugs are costly: unit tests for feature functions with small hand-made frames, a schema check on input data, and a smoke test that trains on a tiny sample in seconds and runs in continuous integration.

Each run logs its config, code commit, data version and metrics to an experiment tracker, and saves the model with its preprocessing as one artifact. The notebook stays, but as a thin client that imports the package for exploration.`,
    covers: [
      'Reproduce first: pinned environment, versioned data, seeds, a baseline metric',
      'Incremental extraction into pure, typed functions',
      'Configuration separated from code; one entry point',
      'Tests: unit, data schema, fast smoke test in CI',
      'Tracked runs; model and preprocessing saved together',
    ],
    redFlags: [
      'A full rewrite with no baseline to compare against',
      'No tests',
      'Preprocessing saved separately from the model',
    ],
    followUps: [
      'After refactoring, the metric differs in the third decimal. How do you investigate?',
      'What belongs in a notebook and what does not?',
    ],
  },
];
