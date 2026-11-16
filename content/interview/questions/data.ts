import type { InterviewQuestion } from '@/lib/interview/types';

// Data Engineering: SQL, modeling, pipeline design. SQL rounds are in most loops, so several questions are SQL reasoning.
export const dataQuestions: InterviewQuestion[] = [
  {
    id: 'data-join-fanout',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'SQL',
    prompt:
      'Total revenue doubled after a colleague joined `orders` to `shipments`. Nothing else changed. What happened and how do you fix it properly?',
    answer: `The join fanned out. \`orders\` has one row per order, but an order can have several shipments, so each order row was repeated once per shipment and its revenue was summed more than once.

To confirm, I compare \`count(*)\` with \`count(distinct order_id)\` before and after the join, and look for order ids that appear more than once on the right side.

The proper fix is to bring both sides to the same grain before joining: aggregate \`shipments\` to one row per order in a subquery or CTE, then join that. Adding \`DISTINCT\` or dividing afterwards only hides the problem and breaks as soon as two orders legitimately share an amount. I would also add a test that the join output has the same row count as \`orders\`, so the regression is caught next time.`,
    covers: [
      'Names join fanout and the one-to-many relationship',
      'Confirms with row counts versus distinct keys',
      'Fixes by aggregating to the join grain first',
      'Rejects DISTINCT as a patch; adds a row-count test',
    ],
    redFlags: ['"Add DISTINCT"', 'Not asking what one row of each table represents'],
    followUps: [
      'How do row counts behave for INNER, LEFT and FULL OUTER joins here?',
      'Where would a NULL join key go in each?',
    ],
  },
  {
    id: 'data-window-latest',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'SQL',
    prompt:
      'A table holds every update to every customer record. Write, in words or SQL, how you get the latest row per customer. What if two updates share the same timestamp?',
    answer: `I use a window function: \`row_number() over (partition by customer_id order by updated_at desc)\` in a subquery, then keep the rows where it equals 1. That reads the table once, unlike a self-join to \`max(updated_at)\`, and it returns exactly one row per customer.

Ties are the catch. With equal timestamps \`row_number\` picks one arbitrarily, so two runs can give different answers. I add a deterministic tiebreaker to the ordering, such as an ingestion sequence number or the log offset, and if none exists I say so, because then "latest" is not well defined in the source. \`rank()\` would return both tied rows, which breaks the one-row-per-customer guarantee downstream.

On a large table I would make sure the data is partitioned or clustered so the window does not sort everything on every run, or maintain the result incrementally with a merge.`,
    covers: [
      'row_number over a partition, filtered to 1',
      'A deterministic tiebreaker, and why rank() is wrong here',
      'Awareness of cost on large tables; incremental alternative',
    ],
    redFlags: ['GROUP BY with non-aggregated columns', 'Ignoring ties'],
    followUps: ['Difference between row_number, rank and dense_rank?', 'How would you do this in pandas?'],
  },
  {
    id: 'data-idempotent',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'Pipelines',
    prompt:
      'Your nightly job failed halfway and the scheduler retried it. In the morning some rows are duplicated. How should the job have been written?',
    answer: `The job was not idempotent: running it twice produced a different result from running it once. Retries are normal, so every task has to be safe to rerun.

The standard patterns are, first, partition overwrite: the job computes one date partition and replaces it atomically, so a rerun overwrites rather than appends. Second, a merge or upsert on a business key, so reprocessed rows update in place. Third, write to a staging location and swap or commit at the end, so a half-finished run is never visible.

The job should also take its date window as a parameter from the scheduler rather than calling "now", so a rerun or backfill for last Tuesday processes last Tuesday's data. To clean up today, I would deduplicate the affected partitions on the key, then add a uniqueness test so duplicates fail the pipeline instead of reaching dashboards.`,
    covers: [
      'Defines idempotency in terms of reruns',
      'Partition overwrite, merge on key, staging then atomic commit',
      'Parameterized run date instead of wall-clock time',
      'A data test that would have caught it',
    ],
    redFlags: ['"Disable retries"', 'Plain INSERT with no key', 'Using now() inside the job'],
    followUps: [
      'How do you get exactly-once results from an at-least-once queue?',
      'How do you backfill three months safely?',
    ],
  },
  {
    id: 'data-grain',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'Modeling',
    prompt:
      'Model the data for a food-delivery app so analysts can report revenue by restaurant, city and day. Where do you start?',
    answer: `I start by stating the grain of the fact table before drawing anything: one row represents exactly one order line item. Choosing the lowest useful grain keeps every later question answerable; an order-level table could not report revenue by dish.

Around that fact I put dimensions: restaurant, customer, courier, date, and location. Measures on the fact are additive: quantity, item price, discount. Order-level amounts such as the delivery fee do not belong on line items, because summing them would repeat the fee, so they go on a separate order-grain fact.

Dimensions change: a restaurant moves city. If history must report under the city at the time, I keep versions of the row with validity dates (a type 2 slowly changing dimension) and the fact points at the version current when the order happened. I would use surrogate keys, and confirm with the analysts which questions need history before paying that complexity.`,
    covers: [
      'States the grain first, in one sentence',
      'Star schema: facts with additive measures, dimensions around them',
      'Mixed-grain measures kept on separate facts',
      'Slowly changing dimensions and when they are worth it',
    ],
    redFlags: [
      'Drawing tables before stating what a row is',
      'One wide table with order-level fees repeated per item',
    ],
    followUps: [
      'When would you choose one wide denormalized table instead?',
      'How do late-arriving dimension rows get handled?',
    ],
  },
  {
    id: 'data-batch-stream',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'Architecture',
    prompt:
      'Product asks for a "real-time" dashboard. How do you decide between batch, micro-batch and streaming?',
    answer: `I ask what decision the data feeds and how stale it can be before that decision gets worse. "Real time" usually means minutes, and occasionally means hours.

If a freshness of an hour is fine, scheduled batch is the cheapest and simplest: easy to test, easy to backfill. If the need is a few minutes, micro-batch on the same engine keeps most of that simplicity. True streaming is justified when something acts on each event within seconds, such as fraud checks or alerting, and it brings real costs: state management, out-of-order and late events, exactly-once concerns, and an on-call burden.

So I would state the freshness target as a number, pick the simplest design that meets it, and design the model so that moving from batch to micro-batch later does not require a rewrite. I would also show the cost difference, because that often changes what "real time" means to the requester.`,
    covers: [
      'Turns "real time" into a freshness number tied to a decision',
      'Trade-offs: simplicity and backfills versus latency',
      'Streaming costs: state, late data, operations',
      'Picks the simplest option that meets the requirement',
    ],
    redFlags: ['Proposing Kafka and Flink before asking about freshness', 'Ignoring cost and operability'],
    followUps: [
      'What is a watermark and what happens to an event that arrives after it?',
      'Event time versus processing time: which should the dashboard use?',
    ],
  },
  {
    id: 'data-quality',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'Quality',
    prompt:
      "An executive says yesterday's numbers look wrong. Nothing failed overnight. How do you investigate, and what do you put in place afterwards?",
    answer: `A green run only means the code did not crash. I would first make the complaint precise: which metric, which day, wrong compared to what.

Then I walk the lineage backwards from the dashboard to the source, checking at each hop: did the table update, is the row count in line with a normal day, did null rates or distinct counts of key columns jump, are there duplicate keys, is the latest event time recent. The usual causes are a late or partial upstream load, a schema change that turned a column into nulls, a join that fanned out, or a timezone boundary.

Once found, I fix and backfill the affected partitions and tell the consumers what was wrong and for which dates.

Afterwards I add checks where it broke: freshness, volume against a rolling baseline, uniqueness and not-null on keys, and a reconciliation of totals against the source. Critical checks block publication, so stale but correct data is shown instead of fresh but wrong data.`,
    covers: [
      'Clarifies the symptom before digging',
      'Lineage walk with freshness, volume, nulls, duplicates',
      'Fix, backfill and communicate',
      'Preventive tests that block bad data from publishing',
    ],
    redFlags: ['"The job succeeded, so the data is right"', 'Fixing silently without telling consumers'],
    followUps: [
      'How do you set a volume threshold that does not alert every Monday?',
      'What is a data contract and who owns it?',
    ],
  },
  {
    id: 'data-spark-skew',
    role: 'data',
    kind: 'technical',
    level: 'senior',
    topic: 'Distributed compute',
    prompt:
      'A Spark job that joins two large tables has 199 of 200 tasks finish in two minutes and one task run for an hour. Diagnose and fix.',
    answer: `That is data skew. A shuffle join hashes rows by key into partitions, and one key, often null, a default id or one enormous customer, holds a large share of the rows. All of them land in one partition, so one task does most of the work and may spill to disk or run out of memory.

I would confirm in the stage view that the slow task read far more shuffle data than the median, then count rows per join key to find the heavy keys.

Fixes depend on the cause. Null or junk keys that can never match should be filtered before the join. If one side is small, broadcast it and avoid the shuffle altogether. If both are large, enable adaptive query execution's skew-join handling, which splits oversized partitions, or salt the hot keys: append a random suffix on the skewed side and replicate the matching rows on the other. Simply raising the partition count does not help, because one key still hashes to one partition.`,
    covers: [
      'Recognizes skew from the task-time distribution',
      'Explains hash partitioning and why one key cannot be split',
      'Verifies with shuffle read sizes and key counts',
      'Filter junk keys, broadcast, AQE skew join, salting',
    ],
    redFlags: ['"Add more executors" or "more partitions"', 'No verification step'],
    followUps: [
      'When does a broadcast join become a bad idea?',
      'What is the difference between a narrow and a wide transformation?',
    ],
  },
  {
    id: 'data-file-formats',
    role: 'data',
    kind: 'technical',
    level: 'core',
    topic: 'Storage',
    prompt: 'Why is Parquet usually faster than CSV for analytics? When would you still choose a row format?',
    answer: `Analytic queries read a few columns from many rows. Parquet stores data column by column, so the engine reads only the columns the query names instead of every byte of every row. Values within a column are similar, so encodings such as dictionary and run-length plus compression shrink them well, which means less I/O.

Parquet files also carry a schema with types and per-row-group statistics such as min and max. The engine uses those to skip whole chunks that cannot match a filter, and combined with partitioning by date it can skip whole files. CSV has no types, no statistics, and must be parsed as text in full.

A row format fits when the workload writes or reads whole records one at a time: an event stream or a transactional store. Avro is common for streaming because it appends cheaply and handles schema evolution with a registry. Parquet is also a poor fit for many tiny files, since metadata overhead dominates.`,
    covers: [
      'Column pruning',
      'Encoding and compression by column',
      'Statistics and predicate pushdown; partition pruning',
      'Row formats for record-at-a-time workloads; the small-files problem',
    ],
    redFlags: ['"Parquet is compressed" as the whole answer', 'No case where rows are better'],
    followUps: [
      'What does a table format such as Delta or Iceberg add on top of Parquet?',
      'How would you pick a partition column?',
    ],
  },
  {
    id: 'data-cdc',
    role: 'data',
    kind: 'technical',
    level: 'senior',
    topic: 'Ingestion',
    prompt:
      'You need to replicate a 500 GB Postgres table into the warehouse every 15 minutes. Compare querying by `updated_at` with log-based change data capture.',
    answer: `Querying by \`updated_at\` is simple: each run selects rows changed since the last high-water mark and merges them. Its weaknesses are that it misses hard deletes entirely, it misses rows whose timestamp was not updated by some code path, it sees only the final state when a row changes several times between runs, and it adds query load to the primary. It also needs care at the boundary: I would overlap the window slightly and rely on the merge to make that safe.

Log-based CDC reads the database's write-ahead log, so it captures every insert, update and delete in order, with little load on the primary. The cost is operational: a replication slot that can bloat the log if the consumer stops, schema changes to handle, and an initial snapshot to coordinate with the stream.

For 15-minute freshness on a large table where deletes matter I would choose log-based CDC into a staging table and merge by primary key using the log position to order changes. If deletes never happen and the team is small, the timestamp approach is a reasonable start.`,
    covers: [
      'Timestamp polling: misses deletes and intermediate states, loads the source',
      'Log-based CDC: complete and ordered, with operational costs',
      'Merge by key, ordered by log position; idempotent replays',
      'A choice justified by the requirements',
    ],
    redFlags: ['Full reload every 15 minutes', 'Not noticing that deletes are lost'],
    followUps: [
      'The consumer was down for a day. What happens to the source database?',
      'How do you handle a column being renamed upstream?',
    ],
  },
  {
    id: 'data-sd-daily-pipeline',
    role: 'data',
    kind: 'system-design',
    level: 'core',
    topic: 'Batch pipeline',
    prompt:
      'Design the daily pipeline that takes order data from a production Postgres database to tables analysts query in the warehouse.',
    answer: `First the requirements: data ready by 7 am, correct to the previous day, about 20 million orders a day, and analysts need history.

Extract incrementally rather than reloading, from a read replica so production is not affected, landing raw data unchanged in object storage partitioned by load date. That raw layer is the replay point for every later fix.

Load and transform in layers. A staging layer casts types and deduplicates on the primary key. A core layer builds the fact and dimension tables with a merge on business keys, so reruns are idempotent. A marts layer holds the aggregates analysts use.

An orchestrator runs the steps as a DAG with retries, a parameterized run date and alerts on failure or lateness. Between layers sit tests: freshness, row counts against the source, uniqueness and not-null keys; a failed test stops promotion.

I would also cover late-arriving updates by reprocessing a trailing window of days, schema changes from the source, access control for personal data, and cost through partitioning and incremental models.`,
    covers: [
      'A freshness SLA stated as a time',
      'Incremental extraction from a replica; immutable raw layer',
      'Layered transforms with idempotent merges',
      'Orchestration, retries, alerting, backfills',
      'Data quality gates, late data, schema change',
    ],
    redFlags: [
      'Full table reload from the primary every night',
      'No raw layer to replay from',
      'No tests between extraction and dashboards',
    ],
    followUps: [
      'The source table is renamed without notice. What breaks and how do you find out?',
      'How do you backfill a year after fixing a transformation bug?',
    ],
  },
  {
    id: 'data-sd-clickstream',
    role: 'data',
    kind: 'system-design',
    level: 'senior',
    topic: 'Streaming',
    prompt:
      'Design the ingestion of 100,000 clickstream events per second from web and mobile clients, feeding both a live metrics view and the warehouse.',
    answer: `Clients send batched events to a stateless collection service that validates the envelope, stamps a receive time and writes to a durable partitioned log such as Kafka. The log decouples producers from consumers and gives replay. I would size partitions for the peak with headroom and key by user so one user's events stay ordered.

Each event carries a client-generated id and event time. Delivery is at least once, so duplicates are certain; consumers deduplicate on the id.

Two consumers read the log. A stream job computes windowed aggregates on event time for the live view, with a watermark to bound how long it waits for late mobile events, and writes to a serving store. A second consumer writes micro-batches as columnar files to object storage, partitioned by event date, which the warehouse loads; late events land in the correct partition and trigger a recompute of that day.

A schema registry rejects incompatible events into a dead-letter topic. I would monitor consumer lag, the dead-letter rate and end-to-end delay, and plan for backpressure, client clock skew and removal of personal data.`,
    covers: [
      'Collection tier and a durable log for decoupling and replay',
      'Partitioning and ordering key; capacity estimate',
      'At-least-once delivery with deduplication by event id',
      'Event time, watermarks and late data',
      'Schema enforcement, dead letters, lag monitoring',
    ],
    redFlags: [
      'Writing each event directly into the warehouse',
      'Assuming exactly-once delivery from clients',
      'Using arrival time for user-facing metrics',
    ],
    followUps: [
      'How do you add a partition without breaking per-user ordering?',
      'The live view and the warehouse disagree by 0.5%. Is that acceptable?',
    ],
  },
];
