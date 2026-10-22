import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/processing/batch-vs-stream',
  title: 'Batch vs stream processing',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Distinguish event time from processing time, and explain why streams receive events out of order',
    'Assign events to tumbling windows by event time',
    'Explain how a watermark decides when a window is complete, and which events become late',
    'Trade latency against completeness by choosing the allowed lateness, and compare both with a batch job',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: [
    'batch-processing',
    'stream-processing',
    'event-time',
    'processing-time',
    'tumbling-window',
    'watermark',
    'late-event',
  ],
  references: [
    {
      title: 'PySpark: DataFrame.withWatermark',
      url: 'https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.withWatermark.html',
      version: 'PySpark 4.2.0',
    },
    {
      title: 'PySpark: functions.window',
      url: 'https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.window.html',
      version: 'PySpark 4.2.0',
    },
    {
      title: 'Spark Structured Streaming programming guide (handling late data and watermarking)',
      url: 'https://spark.apache.org/docs/latest/streaming/',
      version: 'Apache Spark 4.x',
    },
    {
      title: 'Akidau et al., The Dataflow Model: windows, watermarks and triggers',
      url: 'https://www.vldb.org/pvldb/vol8/p1792-Akidau.pdf',
      version: 'PVLDB 8 (2015)',
    },
  ],
} satisfies LessonMeta;
