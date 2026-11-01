import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/distributed/spark-concepts',
  title: 'Distributed processing with Spark: partitions and shuffles',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how Spark splits a dataset into partitions processed in parallel by executors',
    'Identify the operations that cause a shuffle, such as joins and group-bys, and why they are costly',
    'Recognize data skew and estimate its effect on a stage’s run time',
    'Read a Spark query plan to find its shuffles',
  ],
  prerequisites: ['data/processing/batch-vs-stream', 'data/relational/joins-indexes'],
  concepts: [
    'spark-partition',
    'shuffle',
    'narrow-transformation',
    'data-skew',
    'broadcast-join',
    'lazy-evaluation',
    'batch-processing',
    'sql-join',
    'query-plan',
  ],
  references: [
    {
      title: 'Spark SQL performance tuning (shuffle partitions, broadcast joins, adaptive query execution)',
      url: 'https://spark.apache.org/docs/latest/sql-performance-tuning.html',
      version: 'Apache Spark 4.x',
    },
    {
      title: 'PySpark: DataFrame.explain',
      url: 'https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html',
      version: 'PySpark 4.3.0',
    },
    {
      title: 'PySpark: functions.broadcast',
      url: 'https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.broadcast.html',
      version: 'PySpark 4.3.0',
    },
    {
      title: 'Spark RDD programming guide: shuffle operations',
      url: 'https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations',
      version: 'Apache Spark 4.x',
    },
    {
      title: 'Zaharia et al., Resilient Distributed Datasets (NSDI 2012)',
      url: 'https://www.usenix.org/system/files/conference/nsdi12/nsdi12-final138.pdf',
    },
  ],
} satisfies LessonMeta;
