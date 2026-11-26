import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'request-time',
    type: 'numeric',
    prompt: 'Time to first byte is 25 ms and one connection streams 100 MB/s. How many milliseconds does one GET of a 500 KB (0.5 MB) object take?',
    answer: 30,
    tolerance: 0.01,
    hint: 'latency + size / rate, with the transfer part converted to milliseconds.',
    explain: '25 ms + 0.5 / 100 s = 25 ms + 5 ms = 30 ms. Five sixths of it is waiting.',
  },
  {
    id: 'what-limits',
    type: 'choice',
    prompt: 'A loader reads 100 KB images with 16 workers and the GPUs sit at 15% utilization. Doubling the instance’s network bandwidth from 25 to 50 Gbit/s changes almost nothing. Why?',
    options: [
      { text: 'The network card was never the limit: each request is mostly waiting for its first byte', correct: true, explain: 'At 75 MB/s the loader uses about 2% of a 25 Gbit/s card. Latency per request is the limit, so more bandwidth cannot help; bigger objects or more parallelism can.' },
      { text: 'S3 caps every bucket at 25 Gbit/s, so extra bandwidth goes unused', correct: false, explain: 'S3 has no such per-bucket bandwidth cap; it scales with parallel requests and prefixes.' },
      { text: 'The GPUs are too slow to use more data, so the loader backs off', correct: false, explain: 'Low GPU utilization means the GPUs are waiting for data, not the other way round.' },
    ],
  },
  {
    id: 'shards-tradeoff',
    type: 'choice',
    prompt: 'You pack images into 512 MB shards. What do you give up, and how do training pipelines compensate?',
    options: [
      { text: 'Durability, because large objects are stored in only one zone; keep two copies', correct: false, explain: 'Object size does not change how S3 stores data across zones.' },
      { text: 'Cheap random access to one sample; shuffle shard order and then samples in a buffer', correct: true, explain: 'Shards are read sequentially, so a perfect global shuffle is expensive. Shuffling shards and then a buffer of samples gives enough randomness for SGD.' },
      { text: 'Compression, because tar files cannot be compressed; store raw pixels instead', correct: false, explain: 'Samples inside a shard stay compressed (JPEG, PNG). The tar adds only small headers.' },
    ],
  },
  {
    id: 'gpu-busy',
    type: 'numeric',
    prompt: 'The loader delivers 450 MB/s and the GPUs could consume 1,200 MB/s. If an epoch of GPU work would take 2 hours with unlimited data, roughly how many hours does it take with this loader?',
    answer: 5.333,
    tolerance: 0.01,
    hint: 'The GPUs have data 450 / 1200 of the time, so the same work stretches by 1200 / 450.',
    explain: '2 h × 1200 / 450 = 5.33 h. The GPUs are busy only 37.5% of the time, and you pay for all of it.',
  },
  {
    id: 'list-cost',
    type: 'choice',
    prompt: 'Why write a manifest file of shard keys when you build a dataset, instead of listing the bucket when training starts?',
    options: [
      { text: 'Listing returns at most 1,000 keys per call and LISTs are priced higher than GETs', correct: true, explain: 'Millions of keys mean thousands of sequential LIST calls (and LIST costs 12.5 times a GET on S3 Standard). A manifest is one GET, and it also pins exactly which objects belong to the dataset version.' },
      { text: 'S3 listings may miss keys that were written in the last hour', correct: false, explain: 'S3 listings are strongly consistent since 2020. The problem is time and cost, plus reproducibility.' },
      { text: 'Training jobs are not allowed to list buckets under the default role', correct: false, explain: 'Roles allow whatever their policies say. Some do allow s3:ListBucket; the reasons for manifests are speed, cost and reproducibility.' },
    ],
  },
];

export const shardExercise: Exercise = {
  id: 'cloud-shard-size',
  prompt:
    'Write `throughput(object_mb, latency_ms, stream_mbps, parallel, nic_mbps)` returning MB/s with the lesson’s formula: min(parallel × size / (latency + size / stream), nic). Then write `smallest_shard_mb(need_mbps, latency_ms, stream_mbps, parallel, nic_mbps, sizes)`: the smallest size in the sorted list `sizes` whose throughput reaches `need_mbps`, or None if none does.',
  starter: `def throughput(object_mb, latency_ms, stream_mbps, parallel, nic_mbps):
    return 0

def smallest_shard_mb(need_mbps, latency_ms, stream_mbps, parallel, nic_mbps, sizes):
    return None`,
  hints: [
    'Convert latency to seconds: latency_ms / 1000. One request takes that plus object_mb / stream_mbps.',
    'Loop over sizes in order and return the first whose throughput is >= need_mbps.',
  ],
  solution: `def throughput(object_mb, latency_ms, stream_mbps, parallel, nic_mbps):
    one_request = latency_ms / 1000 + object_mb / stream_mbps
    return min(parallel * object_mb / one_request, nic_mbps)

def smallest_shard_mb(need_mbps, latency_ms, stream_mbps, parallel, nic_mbps, sizes):
    for size in sizes:
        if throughput(size, latency_ms, stream_mbps, parallel, nic_mbps) >= need_mbps:
            return size
    return None`,
  explanation:
    'Throughput rises with object size until the per-connection rate (parallel × stream) or the network card takes over, so beyond a certain size bigger shards stop helping.',
  tests: `assert abs(throughput(0.1, 20, 80, 16, 3125) - 75.294) < 0.01
assert abs(throughput(256, 20, 80, 16, 3125) - 1272.05) < 0.01
assert throughput(256, 20, 80, 64, 1250) == 1250
assert smallest_shard_mb(600, 20, 80, 16, 3125, [0.1, 1, 16, 64, 256]) == 16
assert smallest_shard_mb(2000, 20, 80, 16, 3125, [0.1, 1, 16, 64, 256]) is None
assert smallest_shard_mb(50, 20, 80, 16, 3125, [0.1, 1]) == 0.1`,
};
