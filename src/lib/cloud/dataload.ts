// How fast a training job can read its dataset from object storage (Amazon S3, Google Cloud Storage), and what the
// GET requests cost. One request per file: each pays a fixed latency before its first byte, then streams at the
// per-connection rate. Parallel connections overlap, and the instance's network card caps the total. Latency and
// per-connection rate are inputs (typical values, not measurements); the GET price and the per-prefix request rate
// are from the Amazon S3 pricing page and performance guidelines.

export interface LoadInput {
  datasetGb: number;
  /** Size of one object. Small images ≈ 0.1 MB; tar or TFRecord shards ≈ 100 to 1000 MB. */
  fileMb: number;
  /** Time to first byte per request, in milliseconds. */
  latencyMs: number;
  /** Throughput of one connection once data flows, MB/s. */
  streamMbps: number;
  parallel: number;
  /** The instance network limit, Gbit/s. */
  nicGbps: number;
  /** How fast the GPUs consume data, MB/s. */
  needMbps: number;
}

export interface LoadResult {
  files: number;
  /** Seconds one request takes: latency + size / stream rate. */
  requestSeconds: number;
  /** MB/s the loader achieves: min(parallel × size / requestSeconds, NIC). */
  throughputMbps: number;
  limitedBy: 'latency' | 'bandwidth' | 'network card';
  epochHours: number;
  /** Fraction of time the GPUs have data: min(1, throughput / need). */
  gpuBusy: number;
  requestsPerSecond: number;
  /** S3's documented floor is 5,500 GET/s per partitioned prefix. */
  prefixesNeeded: number;
  getCostPerEpoch: number;
}

/** Amazon S3 Standard, US East (N. Virginia): $0.0004 per 1,000 GET requests. */
export const GET_PRICE_PER_1000 = 0.0004;
/** Amazon S3 supports at least 5,500 GET/HEAD requests per second per partitioned prefix. */
export const GETS_PER_PREFIX = 5500;
/** Decimal units, as cloud providers bill: 1 GB = 1000 MB, 1 Gbit/s = 125 MB/s. */
export const MB_PER_GB = 1000;
export const MBPS_PER_GBPS = 125;

export function loadThroughput(x: LoadInput): LoadResult {
  const files = Math.ceil((x.datasetGb * MB_PER_GB) / x.fileMb);
  const requestSeconds = x.latencyMs / 1000 + x.fileMb / x.streamMbps;
  const connections = (x.parallel * x.fileMb) / requestSeconds;
  const nic = x.nicGbps * MBPS_PER_GBPS;
  const throughputMbps = Math.min(connections, nic);
  const latencyShare = x.latencyMs / 1000 / requestSeconds;
  const limitedBy = connections > nic ? 'network card' : latencyShare > 0.5 ? 'latency' : 'bandwidth';
  const requestsPerSecond = throughputMbps / x.fileMb;
  return {
    files,
    requestSeconds,
    throughputMbps,
    limitedBy,
    epochHours: (x.datasetGb * MB_PER_GB) / throughputMbps / 3600,
    gpuBusy: Math.min(1, throughputMbps / x.needMbps),
    requestsPerSecond,
    prefixesNeeded: Math.max(1, Math.ceil(requestsPerSecond / GETS_PER_PREFIX)),
    getCostPerEpoch: (files / 1000) * GET_PRICE_PER_1000,
  };
}

// ---------- where should the data live? ----------

export type Placement = 'same-region' | 'cross-region' | 'internet';

/** $/GB to move data to the compute, AWS list prices in US East: same region free, between regions $0.02, out to
 *  the internet $0.09 (first 10 TB a month). Google Cloud's are similar in shape; check both pricing pages. */
export const TRANSFER_PRICE: Record<Placement, number> = { 'same-region': 0, 'cross-region': 0.02, internet: 0.09 };

export interface TransferInput {
  datasetGb: number;
  /** Times the full dataset is read per month: epochs × training runs. */
  readsPerMonth: number;
  placement: Placement;
  /** Copy the data once to a disk or bucket next to the GPUs, then read it from there. */
  cache: boolean;
  /** Effective bandwidth between the data and the compute, Gbit/s. */
  linkGbps: number;
  /** Local NVMe read speed, Gbit/s (when cached). */
  localGbps: number;
}

export interface TransferResult {
  /** GB that cross the priced boundary per month. */
  movedGb: number;
  cost: number;
  /** Hours spent moving or reading data per month. */
  hours: number;
  hoursPerRead: number;
}

const hoursFor = (gb: number, gbps: number) => (gb * 8) / gbps / 3600;

export function transferPlan(x: TransferInput): TransferResult {
  const movedGb = x.cache ? x.datasetGb : x.datasetGb * x.readsPerMonth;
  const cost = movedGb * TRANSFER_PRICE[x.placement];
  const remote = hoursFor(x.datasetGb, x.linkGbps);
  const local = hoursFor(x.datasetGb, x.localGbps);
  const hours = x.cache ? remote + local * x.readsPerMonth : remote * x.readsPerMonth;
  return { movedGb, cost, hours, hoursPerRead: x.cache ? local : remote };
}
