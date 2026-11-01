// Code for the Spark lesson. shuffle.py is pure Python; its output for every setting was produced with
// CPython 3.13.18 (shuffle.test.ts checks the browser's model against it). plans.py ran with PySpark 4.3.0
// on OpenJDK 21 in local mode; the plans shown are its real output with the expression ids (#12) and plan
// ids removed and the long FileScan lines shortened, as marked with "...".
import { SHUFFLE_SOURCE, shuffleExperiment, shuffleSlots, type ShuffleState } from '@/lib/data/shuffle';
import type { CodeExample } from '@/lib/types';

export const shuffle = shuffleExperiment('shuffle');

const st = (s: unknown) => s as ShuffleState;

export const shufflePython: CodeExample = {
  id: 'shuffle-python',
  language: 'python',
  source: SHUFFLE_SOURCE,
  slots: {
    op: (s) => shuffleSlots(st(s)).op,
    partitions: (s) => shuffleSlots(st(s)).partitions,
    skew: (s) => shuffleSlots(st(s)).skew,
  },
  annotations: [
    {
      id: 'op',
      range: { line: 3, startCol: 6, endCol: 12 },
      match: '{{op}}',
      kind: 'parameter',
      title: 'OP',
      what: 'The operation, from the "Operation" control.',
      why: 'Whether records have to move between machines depends only on the operation, not on the data size.',
    },
    {
      id: 'n',
      range: { line: 4, startCol: 4, endCol: 18 },
      match: '{{partitions}}',
      kind: 'parameter',
      title: 'N',
      what: 'How many partitions a shuffle produces, from the slider.',
      why: 'In Spark this is spark.sql.shuffle.partitions (200 by default). Too few gives big, slow tasks; too many gives tiny ones with overhead.',
    },
    {
      id: 'skew',
      range: { line: 5, startCol: 7, endCol: 15 },
      match: '{{skew}}',
      kind: 'parameter',
      title: 'SKEW',
      what: 'When True, customer C1 places 14 of the 24 orders.',
      why: 'Real keys are rarely even: one big customer, one popular product, or a NULL key that collects millions of rows.',
    },
    {
      id: 'inputs',
      range: { line: 15 },
      kind: 'variable',
      title: 'inputs',
      what: 'The 24 orders split into 3 partitions of 8, one per input file.',
      why: 'Spark reads a dataset as partitions and runs one task per partition, in parallel on the executors’ cores.',
    },
    {
      id: 'target',
      range: { line: 19 },
      kind: 'math',
      title: 'crc32(key) % N',
      what: 'The shuffle partition for a key: a stable hash of the key, modulo N.',
      why: 'Every record with the same key lands in the same partition, which is what a group-by or join needs. Different keys can share a partition, and a partition can get no key at all.',
    },
    {
      id: 'narrow',
      range: { line: 24 },
      kind: 'syntax',
      title: 'A narrow operation',
      what: 'A filter needs only the record in hand, so each task works on its own partition.',
      why: 'No data moves, so narrow steps chain together into one stage and are cheap.',
    },
    {
      id: 'partial',
      range: { line: 33 },
      kind: 'syntax',
      title: 'Partial sums before the shuffle',
      what: 'Each task first adds up its own records per customer, then sends one subtotal per customer.',
      why: 'A sum can be computed in pieces, so Spark shrinks the shuffle this way: 18 records instead of 24 here, and far fewer on real data.',
    },
    {
      id: 'join',
      range: { line: 39 },
      kind: 'syntax',
      title: 'A shuffle join moves every order',
      what: 'Each order is sent to the partition of its customer, where it meets that customer’s row.',
      why: 'Unlike a sum, a join cannot be pre-combined. With a hot key, one task receives most of the data.',
    },
    {
      id: 'time',
      range: { line: 47 },
      kind: 'math',
      title: 'The time model',
      what: 'Each stage takes as long as its slowest task; a shuffle adds a second stage.',
      why: 'This is why skew hurts: one 16-record task holds up a stage whose other tasks finished at 2 to 4 records.',
    },
  ],
};

export const sparkPlans: CodeExample = {
  id: 'spark-plans',
  language: 'python',
  source: `from pyspark.sql import SparkSession, functions as F

spark = (SparkSession.builder.master("local[4]")
         .config("spark.sql.shuffle.partitions", "4")
         .config("spark.sql.autoBroadcastJoinThreshold", "-1")  # turn off automatic broadcast joins
         .getOrCreate())

rows = [(f"C{i % 6 + 1}", (i * 7) % 50 + 5) for i in range(24)]
spark.createDataFrame(rows, "customer string, amount int").repartition(3).write.parquet("orders")
orders = spark.read.parquet("orders")
customers = spark.createDataFrame([(f"C{i}", f"city{i}") for i in range(1, 7)], "customer string, city string")

totals = orders.groupBy("customer").agg(F.sum("amount").alias("total"))
totals.explain()
print(totals.orderBy("customer").take(2))

orders.join(customers, "customer").explain()
orders.join(F.broadcast(customers), "customer").explain()`,
  annotations: [
    {
      id: 'master',
      range: { line: 3 },
      kind: 'framework',
      title: 'master("local[4]")',
      what: 'Runs Spark on this machine with 4 worker threads instead of a cluster.',
      why: 'The same code runs on a cluster by changing the master; partitions, stages and shuffles work the same way.',
    },
    {
      id: 'auto-broadcast',
      range: { line: 5 },
      kind: 'parameter',
      title: 'spark.sql.autoBroadcastJoinThreshold = -1',
      what: 'Stops Spark from broadcasting small tables on its own (by default it broadcasts tables up to 10 MB).',
      why: 'Without this, Spark would broadcast the 6-row customers table automatically and the shuffle join would not appear.',
    },
    {
      id: 'lazy',
      range: { line: 13 },
      kind: 'framework',
      title: 'groupBy(...).agg(...)',
      what: 'Builds a plan; nothing runs yet. Spark transformations are lazy.',
      why: 'Spark sees the whole query before running it, so it can plan partial aggregation, prune columns and choose join strategies.',
    },
    {
      id: 'explain',
      range: { line: 14 },
      kind: 'function',
      title: 'explain()',
      what: 'Prints the physical plan. Read it from the bottom up: scan, partial aggregate, exchange, final aggregate.',
      why: 'Every "Exchange" line is a shuffle. Counting them is the quickest way to find a query’s expensive steps.',
    },
    {
      id: 'take',
      range: { line: 15 },
      kind: 'function',
      title: 'take(2)',
      what: 'An action: it runs the plan and returns rows to the driver.',
      why: 'Only actions (take, collect, count, write) start jobs. Check: C1’s orders are 5 + 47 + 39 + 31 = 122.',
    },
    {
      id: 'broadcast',
      range: { line: 18 },
      kind: 'framework',
      title: 'F.broadcast(customers)',
      what: 'Asks Spark to copy the small table to every executor and join without shuffling the orders.',
      why: 'The plan changes from SortMergeJoin with two Exchanges to BroadcastHashJoin with none on the orders side.',
    },
  ],
  expectedOutput: `== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=false
+- HashAggregate(keys=[customer], functions=[sum(amount)])
   +- Exchange hashpartitioning(customer, 4), ENSURE_REQUIREMENTS
      +- HashAggregate(keys=[customer], functions=[partial_sum(amount)])
         +- FileScan parquet [customer,amount] ...

[Row(customer='C1', total=122), Row(customer='C2', total=150)]
== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=false
+- Project [customer, amount, city]
   +- SortMergeJoin [customer], [customer], Inner
      :- Sort [customer ASC NULLS FIRST], false, 0
      :  +- Exchange hashpartitioning(customer, 4), ENSURE_REQUIREMENTS
      :     +- Filter isnotnull(customer)
      :        +- FileScan parquet [customer,amount] ...
      +- Sort [customer ASC NULLS FIRST], false, 0
         +- Exchange hashpartitioning(customer, 4), ENSURE_REQUIREMENTS
            +- Filter isnotnull(customer)
               +- Scan ExistingRDD[customer,city]

== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=false
+- Project [customer, amount, city]
   +- BroadcastHashJoin [customer], [customer], Inner, BuildRight, false, false
      :- Filter isnotnull(customer)
      :  +- FileScan parquet [customer,amount] ...
      +- BroadcastExchange HashedRelationBroadcastMode(List(input[0, string, false]),false)
         +- Filter isnotnull(customer)
            +- Scan ExistingRDD[customer,city]`,
};

/** Hash partitioning in plain Python, runnable in the browser. */
export const hashRunner: CodeExample = {
  id: 'hash-runner',
  language: 'python',
  run: 'pyodide',
  source: `import zlib

keys = ["C1", "C2", "C3", "C4", "C5", "C6"]
for n in (4, 6):
    parts = {}
    for key in keys:
        parts.setdefault(zlib.crc32(key.encode()) % n, []).append(key)
    print(n, "partitions:", dict(sorted(parts.items())))`,
  annotations: [],
  expectedOutput: `4 partitions: {0: ['C4', 'C6'], 1: ['C2'], 2: ['C5'], 3: ['C1', 'C3']}
6 partitions: {2: ['C5', 'C6'], 3: ['C1', 'C3'], 4: ['C4'], 5: ['C2']}`,
};
