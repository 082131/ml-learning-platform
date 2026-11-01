import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/distributed chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'spark-partition',
    term: 'Partition (Spark)',
    short:
      'One slice of a distributed dataset. Spark runs one task per partition, in parallel across the executors.',
    long: 'Input partitions usually follow the files (or blocks of large files). After a shuffle, the number of partitions is spark.sql.shuffle.partitions. Not to be confused with partitioned folders in a data lake, although reading a partitioned folder produces Spark partitions too.',
    introducedIn: 'data/distributed/spark-concepts',
    aliases: ['task', 'executor', 'stage'],
  },
  {
    id: 'shuffle',
    term: 'Shuffle',
    short:
      'Redistributing records across machines so that all records with the same key end up in the same partition.',
    long: 'Group-bys, joins, distinct and sorts need one. Every record is written to disk, sent over the network and read again, so shuffles dominate the cost of most Spark jobs. In a query plan each shuffle appears as an Exchange.',
    introducedIn: 'data/distributed/spark-concepts',
    aliases: ['exchange', 'wide transformation'],
  },
  {
    id: 'narrow-transformation',
    term: 'Narrow transformation',
    short:
      'An operation where each output partition depends on one input partition only, such as filter, select or withColumn.',
    long: 'No data moves between machines, so Spark chains narrow steps into a single stage. Wide transformations (group-by, join) need a shuffle and start a new stage.',
    introducedIn: 'data/distributed/spark-concepts',
    aliases: ['narrow dependency'],
  },
  {
    id: 'data-skew',
    term: 'Data skew',
    short: 'Uneven key frequencies that send far more records to one partition than to the others.',
    long: 'A stage ends when its slowest task ends, so one overloaded task can make a whole job slow or run out of memory. Fixes include broadcasting the small side, salting the hot key, and Spark’s adaptive skew-join handling.',
    introducedIn: 'data/distributed/spark-concepts',
    aliases: ['skew', 'hot key', 'salting'],
  },
  {
    id: 'broadcast-join',
    term: 'Broadcast join',
    short:
      'A join that copies a small table to every executor, so the large table is joined where it is, without a shuffle.',
    long: 'Spark does it automatically for tables under spark.sql.autoBroadcastJoinThreshold (10 MB by default), or when asked with broadcast(df). It fails if the "small" table does not fit in memory.',
    introducedIn: 'data/distributed/spark-concepts',
    aliases: ['map-side join', 'broadcast hash join'],
  },
  {
    id: 'lazy-evaluation',
    term: 'Lazy evaluation',
    short:
      'Building up a plan of transformations without running it until an action (collect, count, write) needs a result.',
    long: 'Spark sees the whole query before running it, so it can push filters down, read only needed columns and pick join strategies.',
    introducedIn: 'data/distributed/spark-concepts',
    aliases: ['action', 'transformation'],
  },
] satisfies GlossaryTerm[];
