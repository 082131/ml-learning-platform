// Code for "Object storage that keeps GPUs fed". The loader model is src/lib/cloud/dataload.ts (unit-tested): one
// request per object, a fixed time to first byte, then streaming at a per-connection rate, overlapped by parallel
// requests and capped by the network card. Latency and per-connection rate are typical values, not measurements.
// shards.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The WebDataset loader needs
// PyTorch, webdataset 1.0 and AWS credentials and is not run here.
import type { LoadInput } from '@/lib/cloud/dataload';
import { loadExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const load = loadExperiment('cloud-load');

const L = (s: unknown) => s as LoadInput;

export const shardsDemo: CodeExample = {
  id: 'cloud-shards',
  language: 'python',
  run: 'pyodide',
  source: `import io, tarfile

def epoch_hours(dataset_gb, object_mb, latency_ms=20, stream_mbps=80, parallel=16, nic_mbps=3125):
    one_request = latency_ms / 1000 + object_mb / stream_mbps        # seconds
    throughput = min(parallel * object_mb / one_request, nic_mbps)   # MB/s
    return dataset_gb * 1000 / throughput / 3600, throughput

for size in (0.1, 1, 64, 256):
    hours, mbps = epoch_hours(500, size)
    print(f"{size:>6} MB objects: {mbps:7.1f} MB/s, epoch {hours:5.2f} h")

# Packing: 1,000 small samples into tar shards of 25 samples each.
samples = [(f"img_{i:04d}.jpg", bytes(100)) for i in range(1000)]
shards, per_shard = [], 25
for start in range(0, len(samples), per_shard):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        for name, data in samples[start:start + per_shard]:
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    shards.append(buf.getvalue())
print(len(samples), "objects became", len(shards), "shards; first shard holds", len(tarfile.open(fileobj=io.BytesIO(shards[0])).getnames()), "samples")`,
  expectedOutput: `   0.1 MB objects:    75.3 MB/s, epoch  1.84 h
     1 MB objects:   492.3 MB/s, epoch  0.28 h
    64 MB objects:  1248.8 MB/s, epoch  0.11 h
   256 MB objects:  1272.0 MB/s, epoch  0.11 h
1000 objects became 40 shards; first shard holds 25 samples`,
  annotations: [
    {
      id: 'one-request',
      range: { line: 4 },
      kind: 'math',
      title: 'One request = wait + transfer',
      what: 'Every GET first waits for the first byte (here 20 ms), then streams at the connection’s rate.',
      why: 'For a 100 KB object the wait is 94% of the request. The data itself takes 1.25 ms.',
    },
    {
      id: 'throughput',
      range: { line: 5 },
      kind: 'math',
      title: 'Parallel requests overlap the waits',
      what: 'With 16 requests in flight, 16 objects arrive per request time; the network card caps the total.',
      why: 'Either raise parallelism or make each request carry more data. Sharding does the second.',
    },
    {
      id: 'tar',
      range: { line: 17 },
      kind: 'framework',
      title: 'A shard is just a tar file',
      what: 'Many samples are written back to back into one archive object, read sequentially in one request.',
      why: 'WebDataset, TFRecord and MosaicML’s MDS all use the same idea: few large objects instead of millions of small ones.',
    },
  ],
};

export const loaderCode: CodeExample = {
  id: 'cloud-webdataset-loader',
  language: 'python',
  source: `import torch
import webdataset as wds

# 1,954 shards of 256 MB (the lab is set to {{size}} MB objects, {{files}} of them)
urls = "pipe:aws s3 cp s3://acme-ml/datasets/train/shard-{000000..001953}.tar -"
dataset = (
    wds.WebDataset(urls, shardshuffle=1000)
    .shuffle(5000)                      # shuffle samples inside a buffer
    .decode("torchrgb")
    .to_tuple("jpg", "cls")
)
loader = torch.utils.data.DataLoader(dataset, batch_size=256, num_workers={{parallel}}, pin_memory=True)`,
  slots: {
    files: (s) => Math.ceil((L(s).datasetGb * 1000) / L(s).fileMb).toLocaleString('en-US'),
    size: (s) => String(L(s).fileMb),
    parallel: (s) => String(L(s).parallel),
  },
  annotations: [
    {
      id: 'brace',
      range: { line: 5 },
      kind: 'syntax',
      title: 'Brace expansion over shard names',
      what: 'WebDataset expands {000000..001953} into 1,954 shard URLs; each is streamed with the AWS CLI through a pipe.',
      why: 'Numbered shards let each worker take a different subset of files without listing the bucket.',
    },
    {
      id: 'shardshuffle',
      range: { line: 7 },
      kind: 'parameter',
      title: 'Two levels of shuffling',
      what: 'Shard order is shuffled, then samples are shuffled within a buffer of 5,000.',
      why: 'Reading sequentially within shards is what makes them fast; the two shuffles restore enough randomness for training.',
    },
    {
      id: 'workers',
      range: { line: 12 },
      kind: 'parameter',
      title: 'num_workers is your parallelism',
      what: 'Each DataLoader worker process reads and decodes its own shards. The lab’s “parallel requests” slider sets it.',
      why: 'Too few workers leave the GPUs waiting; too many compete for CPU to decode images.',
    },
  ],
};
