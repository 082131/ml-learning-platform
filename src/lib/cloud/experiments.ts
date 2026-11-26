// Experiment definitions for the Cloud for ML track. The logic lives in the modules they import, each unit-tested in
// cloud.test.ts.
import type { ExperimentDef } from '../types';
import { compareApi, type ApiInput, type ApiResult } from './apis';
import { availability, duration, percent, type AvailabilityResult, type Layout } from './availability';
import { monthlyBill, type BillInput, type BillResult } from './bill';
import { checkPlan, type CapstoneResult, type CloudPlan } from './capstone';
import { compareCompute, type ComputeInput, type ComputeResult } from './compute';
import { loadThroughput, transferPlan, type LoadInput, type LoadResult, type Placement, type TransferInput, type TransferResult } from './dataload';
import { fitInstances, INSTANCES, WORKLOAD_LABEL, type GpuInput, type GpuResult, type Workload } from './gpu';
import { plan, toHcl, type PlanResult, type Resource } from './iac';
import { evaluate, type Evaluation, type Policy } from './iam';
import { managedVsVm, type InputMode, type ManagedInput, type ManagedResult } from './managed';
import { parseCidr, reachability, splitCidr, type InboundSource, type NetResult, type NetSetup, type SubnetPlan } from './network';
import { simulateSpot, spotEstimate, type SpotEstimate, type SpotInput, type SpotRun } from './spot';

const yesNo = [
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
];
const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
const yn = (b: boolean) => (b ? 'yes' : 'no');
export const usd = (n: number, digits = 0) =>
  Number.isFinite(n) ? `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}` : 'never finishes';
export const num = (n: number, digits = 1) => n.toLocaleString('en-US', { maximumFractionDigits: digits });

// ---------- regions, zones and availability ----------

export function availabilityExperiment(id: string): ExperimentDef<Layout, AvailabilityResult> {
  const pct = (values: number[]) => values.map((v) => ({ value: String(v), label: percent(v) }));
  return {
    id,
    initial: { instance: 0.99, zone: 0.999, region: 0.9999, replicasPerZone: 1, zonesPerRegion: 1, regions: 1 },
    controls: [
      { kind: 'select', id: 'instance', label: 'One instance is up', options: pct([0.95, 0.99, 0.995, 0.999]), get: (s) => String(s.instance), set: (s, v) => ({ ...s, instance: Number(v) }) },
      { kind: 'select', id: 'zone', label: 'One zone is up', options: pct([0.99, 0.999, 0.9999]), get: (s) => String(s.zone), set: (s, v) => ({ ...s, zone: Number(v) }) },
      { kind: 'select', id: 'region', label: 'One region is up', options: pct([0.999, 0.9999, 0.99999]), get: (s) => String(s.region), set: (s, v) => ({ ...s, region: Number(v) }) },
      { kind: 'slider', id: 'replicas', label: 'Instances per zone', min: 1, max: 4, step: 1, get: (s) => s.replicasPerZone, set: (s, v) => ({ ...s, replicasPerZone: v }) },
      { kind: 'slider', id: 'zones', label: 'Zones', min: 1, max: 3, step: 1, get: (s) => s.zonesPerRegion, set: (s, v) => ({ ...s, zonesPerRegion: v }) },
      { kind: 'slider', id: 'regions', label: 'Regions', min: 1, max: 2, step: 1, get: (s) => s.regions, set: (s, v) => ({ ...s, regions: v }) },
    ],
    compute: availability,
    readout: (_s, r) => [
      { label: 'Service is up', value: percent(r.service) },
      { label: 'Expected downtime per year', value: duration(r.downHoursPerYear), status: r.downHoursPerYear < 1 ? 'ok' : r.downHoursPerYear > 24 ? 'error' : undefined },
      { label: 'Instances you pay for', value: String(r.instances) },
    ],
  };
}

// ---------- IAM ----------

export const ACCOUNT = '111122223333';
export const ROLES: Record<string, string> = {
  train: `arn:aws:iam::${ACCOUNT}:role/train-job`,
  notebook: `arn:aws:iam::${ACCOUNT}:role/data-scientist`,
  ci: `arn:aws:iam::${ACCOUNT}:role/ci-deploy`,
};
const B = 'arn:aws:s3:::acme-ml';

export const IDENTITY_POLICIES: Policy[] = [
  {
    name: 'train-job-policy',
    source: 'identity',
    attachedTo: ROLES.train,
    statements: [
      { sid: 'ReadDatasets', effect: 'Allow', actions: ['s3:GetObject'], resources: [`${B}/datasets/*`] },
      { sid: 'WriteModels', effect: 'Allow', actions: ['s3:PutObject'], resources: [`${B}/models/*`] },
    ],
  },
  {
    name: 'data-scientist-policy',
    source: 'identity',
    attachedTo: ROLES.notebook,
    statements: [
      { sid: 'ReadEverything', effect: 'Allow', actions: ['s3:Get*'], resources: [`${B}/*`] },
      { sid: 'WriteScratch', effect: 'Allow', actions: ['s3:PutObject', 's3:DeleteObject'], resources: [`${B}/scratch/*`] },
    ],
  },
  {
    name: 'ci-deploy-policy',
    source: 'identity',
    attachedTo: ROLES.ci,
    statements: [
      { sid: 'ManageModels', effect: 'Allow', actions: ['s3:*'], resources: [`${B}/models/*`] },
      { sid: 'Deploy', effect: 'Allow', actions: ['sagemaker:CreateEndpoint', 'sagemaker:UpdateEndpoint'], resources: ['*'] },
      { sid: 'TooBroad', effect: 'Allow', actions: ['iam:*'], resources: ['*'] },
    ],
  },
];

export const BUCKET_POLICY: Policy = {
  name: 'acme-ml bucket policy',
  source: 'resource',
  statements: [{ sid: 'OnlyCiDeletesModels', effect: 'Deny', principals: ['*'], actions: ['s3:DeleteObject'], resources: [`${B}/models/*`], unlessPrincipal: ROLES.ci }],
};

export const GUARDRAIL: Policy = {
  name: 'organization guardrail (SCP)',
  source: 'guardrail',
  statements: [{ sid: 'MlServicesOnly', effect: 'Allow', actions: ['s3:*', 'sagemaker:*', 'logs:*'], resources: ['*'] }],
};

export const IAM_ACTIONS = ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 'sagemaker:CreateEndpoint', 'iam:CreateAccessKey'];
export const IAM_OBJECTS = ['datasets/train.parquet', 'models/v3/model.tar.gz', 'scratch/eda.csv'];

export interface IamState {
  role: keyof typeof ROLES;
  action: string;
  object: string;
  bucketPolicy: boolean;
  guardrail: boolean;
}

export interface IamResult {
  resource: string;
  evaluation: Evaluation;
  policies: Policy[];
}

export const iamResource = (s: IamState) => (s.action.startsWith('s3:') ? `${B}/${s.object}` : '*');

export function iamPolicies(s: Pick<IamState, 'bucketPolicy' | 'guardrail'>): Policy[] {
  return [...IDENTITY_POLICIES, ...(s.bucketPolicy ? [BUCKET_POLICY] : []), ...(s.guardrail ? [GUARDRAIL] : [])];
}

export function iamExperiment(id: string): ExperimentDef<IamState, IamResult> {
  return {
    id,
    initial: { role: 'train', action: 's3:GetObject', object: 'datasets/train.parquet', bucketPolicy: true, guardrail: false },
    controls: [
      { kind: 'select', id: 'role', label: 'Who asks (role)', options: opts([['train', 'train-job (a training job)'], ['notebook', 'data-scientist (a notebook)'], ['ci', 'ci-deploy (the CI pipeline)']]), get: (s) => s.role, set: (s, v) => ({ ...s, role: v as IamState['role'] }) },
      { kind: 'select', id: 'action', label: 'Action', options: IAM_ACTIONS.map((a) => ({ value: a, label: a })), get: (s) => s.action, set: (s, v) => ({ ...s, action: v }) },
      { kind: 'select', id: 'object', label: 'Object in s3://acme-ml', options: IAM_OBJECTS.map((o) => ({ value: o, label: o })), get: (s) => s.object, set: (s, v) => ({ ...s, object: v }) },
      { kind: 'select', id: 'bucket', label: 'Bucket policy: only CI deletes models', options: yesNo, get: (s) => yn(s.bucketPolicy), set: (s, v) => ({ ...s, bucketPolicy: v === 'yes' }) },
      { kind: 'select', id: 'guardrail', label: 'Organization guardrail: ML services only', options: yesNo, get: (s) => yn(s.guardrail), set: (s, v) => ({ ...s, guardrail: v === 'yes' }) },
    ],
    compute: (s) => {
      const policies = iamPolicies(s);
      const resource = iamResource(s);
      return { resource, policies, evaluation: evaluate(policies, { principal: ROLES[s.role]!, action: s.action, resource }) };
    },
    readout: (_s, r) => [
      { label: 'Decision', value: r.evaluation.allowed ? 'Allow' : 'Deny', status: r.evaluation.allowed ? 'ok' : 'error' },
      { label: 'Why', value: { allow: 'an Allow matched and no Deny did', 'explicit-deny': 'an explicit Deny matched', 'implicit-deny': 'no statement allows it (implicit deny)', 'guardrail-deny': 'the organization guardrail does not allow it' }[r.evaluation.decision] },
      { label: 'Statements that matched', value: r.evaluation.hits.length ? r.evaluation.hits.map((h) => `${h.sid} (${h.effect})`).join(', ') : 'none' },
    ],
  };
}

// ---------- networking ----------

export interface NetState extends NetSetup {
  vpc: string;
  subnetPrefix: number;
}

export interface NetExperimentResult extends NetResult {
  split: SubnetPlan | null;
  cidrError: string | null;
}

export function networkExperiment(id: string): ExperimentDef<NetState, NetExperimentResult> {
  return {
    id,
    initial: { subnet: 'public', publicIp: true, natGateway: false, s3Endpoint: false, inbound8888: 'anywhere', vpc: '10.0.0.0/16', subnetPrefix: 24 },
    controls: [
      { kind: 'select', id: 'subnet', label: 'Training instance subnet', options: opts([['public', 'public (route to internet gateway)'], ['private', 'private (no route in)']]), get: (s) => s.subnet, set: (s, v) => ({ ...s, subnet: v as NetSetup['subnet'] }) },
      { kind: 'select', id: 'publicip', label: 'Public IP on the instance', options: yesNo, get: (s) => yn(s.publicIp), set: (s, v) => ({ ...s, publicIp: v === 'yes' }) },
      { kind: 'select', id: 'nat', label: 'NAT gateway for private subnets', options: yesNo, get: (s) => yn(s.natGateway), set: (s, v) => ({ ...s, natGateway: v === 'yes' }) },
      { kind: 'select', id: 'endpoint', label: 'S3 gateway endpoint', options: yesNo, get: (s) => yn(s.s3Endpoint), set: (s, v) => ({ ...s, s3Endpoint: v === 'yes' }) },
      { kind: 'select', id: 'sg', label: 'Security group: inbound TCP 8888 from', options: opts([['none', 'nobody (no rule)'], ['office', 'the office, 203.0.113.0/24'], ['anywhere', 'anywhere, 0.0.0.0/0']]), get: (s) => s.inbound8888, set: (s, v) => ({ ...s, inbound8888: v as InboundSource }) },
      { kind: 'text', id: 'vpc', label: 'VPC CIDR block', maxLength: 18, get: (s) => s.vpc, set: (s, v) => ({ ...s, vpc: v }) },
      { kind: 'slider', id: 'prefix', label: 'Subnet prefix length', min: 16, max: 28, step: 1, get: (s) => s.subnetPrefix, set: (s, v) => ({ ...s, subnetPrefix: v }) },
    ],
    compute: (s) => {
      const c = parseCidr(s.vpc);
      const split = c ? splitCidr(c, s.subnetPrefix) : null;
      const cidrError = !c ? 'not a valid IPv4 CIDR block with zero host bits' : !split ? `subnets must be /${c.prefix} to /28` : null;
      return { ...reachability(s), split, cidrError };
    },
    readout: (_s, r) => [
      { label: 'Paths that go wrong', value: String(r.problems), status: r.problems ? 'error' : 'ok' },
      ...(r.split ? [{ label: 'Subnets of this size', value: `${r.split.count.toLocaleString('en-US')} × ${r.split.size} addresses (${r.split.usableAws} usable on AWS)` }] : [{ label: 'CIDR', value: r.cidrError ?? '', status: 'error' as const }]),
    ],
  };
}

// ---------- object storage throughput ----------

export function loadExperiment(id: string): ExperimentDef<LoadInput, LoadResult> {
  return {
    id,
    initial: { datasetGb: 500, fileMb: 0.1, latencyMs: 20, streamMbps: 80, parallel: 16, nicGbps: 25, needMbps: 600 },
    controls: [
      { kind: 'select', id: 'file', label: 'Object size', options: opts([['0.1', '100 KB (one JPEG per object)'], ['1', '1 MB'], ['16', '16 MB'], ['64', '64 MB shard'], ['256', '256 MB shard']]), get: (s) => String(s.fileMb), set: (s, v) => ({ ...s, fileMb: Number(v) }) },
      { kind: 'slider', id: 'parallel', label: 'Parallel requests (DataLoader workers × in-flight)', min: 1, max: 128, step: 1, get: (s) => s.parallel, set: (s, v) => ({ ...s, parallel: v }) },
      { kind: 'slider', id: 'latency', label: 'Time to first byte (ms)', min: 5, max: 100, step: 5, get: (s) => s.latencyMs, set: (s, v) => ({ ...s, latencyMs: v }) },
      { kind: 'slider', id: 'need', label: 'GPUs consume (MB/s)', min: 100, max: 3000, step: 100, get: (s) => s.needMbps, set: (s, v) => ({ ...s, needMbps: v }) },
      { kind: 'select', id: 'nic', label: 'Instance network', options: opts([['10', '10 Gbit/s'], ['25', '25 Gbit/s'], ['100', '100 Gbit/s']]), get: (s) => String(s.nicGbps), set: (s, v) => ({ ...s, nicGbps: Number(v) }) },
    ],
    compute: loadThroughput,
    readout: (_s, r) => [
      { label: 'Loader throughput', value: `${num(r.throughputMbps, 0)} MB/s (limited by ${r.limitedBy})` },
      { label: 'GPUs busy', value: `${Math.round(r.gpuBusy * 100)}%`, status: r.gpuBusy >= 0.95 ? 'ok' : r.gpuBusy < 0.5 ? 'error' : undefined },
      { label: 'One epoch', value: duration(r.epochHours) },
      { label: 'GET requests per epoch', value: `${r.files.toLocaleString('en-US')} (${usd(r.getCostPerEpoch, 2)})` },
    ],
  };
}

export function transferExperiment(id: string): ExperimentDef<TransferInput, TransferResult> {
  return {
    id,
    initial: { datasetGb: 2000, readsPerMonth: 20, placement: 'cross-region', cache: false, linkGbps: 5, localGbps: 20 },
    controls: [
      { kind: 'select', id: 'placement', label: 'The data lives', options: opts([['same-region', 'in a bucket in the GPUs’ region'], ['cross-region', 'in a bucket in another region'], ['internet', 'outside the cloud (another cloud, on premises)']]), get: (s) => s.placement, set: (s, v) => ({ ...s, placement: v as Placement }) },
      { kind: 'select', id: 'cache', label: 'Copy once to storage next to the GPUs', options: yesNo, get: (s) => yn(s.cache), set: (s, v) => ({ ...s, cache: v === 'yes' }) },
      { kind: 'slider', id: 'size', label: 'Dataset (GB)', min: 100, max: 10000, step: 100, get: (s) => s.datasetGb, set: (s, v) => ({ ...s, datasetGb: v }) },
      { kind: 'slider', id: 'reads', label: 'Full reads per month (epochs × runs)', min: 1, max: 60, step: 1, get: (s) => s.readsPerMonth, set: (s, v) => ({ ...s, readsPerMonth: v }) },
      { kind: 'slider', id: 'link', label: 'Bandwidth to the data (Gbit/s)', min: 1, max: 25, step: 1, get: (s) => s.linkGbps, set: (s, v) => ({ ...s, linkGbps: v }) },
    ],
    compute: transferPlan,
    readout: (_s, r) => [
      { label: 'GB moved across the priced boundary', value: num(r.movedGb, 0) },
      { label: 'Transfer cost per month', value: usd(r.cost), status: r.cost === 0 ? 'ok' : r.cost > 500 ? 'error' : undefined },
      { label: 'Hours spent moving data per month', value: num(r.hours) },
    ],
  };
}

// ---------- compute options ----------

export const REQUEST_VOLUMES = [10_000, 100_000, 1_000_000, 10_000_000, 30_000_000, 100_000_000, 300_000_000];

export function computeExperiment(id: string): ExperimentDef<ComputeInput, ComputeResult> {
  return {
    id,
    initial: { requestsPerMonth: 1_000_000, durationMs: 200, memoryGb: 1, vmPricePerHour: 0.1, vmCapacityRps: 50, peakFactor: 3, minVms: 2 },
    controls: [
      { kind: 'select', id: 'volume', label: 'Requests per month', options: REQUEST_VOLUMES.map((v) => ({ value: String(v), label: v.toLocaleString('en-US') })), get: (s) => String(s.requestsPerMonth), set: (s, v) => ({ ...s, requestsPerMonth: Number(v) }) },
      { kind: 'slider', id: 'duration', label: 'Time per request (ms)', min: 20, max: 2000, step: 20, get: (s) => s.durationMs, set: (s, v) => ({ ...s, durationMs: v }) },
      { kind: 'select', id: 'memory', label: 'Function memory', options: opts([['0.5', '512 MB'], ['1', '1 GB'], ['2', '2 GB'], ['4', '4 GB']]), get: (s) => String(s.memoryGb), set: (s, v) => ({ ...s, memoryGb: Number(v) }) },
      { kind: 'slider', id: 'vmprice', label: 'VM price ($/hour)', min: 0.02, max: 1, step: 0.02, get: (s) => s.vmPricePerHour, set: (s, v) => ({ ...s, vmPricePerHour: v }) },
      { kind: 'slider', id: 'minvms', label: 'VMs always running', min: 1, max: 3, step: 1, get: (s) => s.minVms, set: (s, v) => ({ ...s, minVms: v }) },
    ],
    compute: compareCompute,
    readout: (_s, r) => [
      { label: 'Serverless per month', value: usd(r.serverless.total, 2), status: r.cheaper === 'serverless' ? 'ok' : undefined },
      { label: 'VMs per month', value: `${usd(r.vm.total, 2)} (${r.vm.instances} running, ${Math.round(r.vm.utilization * 100)}% busy on average)`, status: r.cheaper === 'vm' ? 'ok' : undefined },
      { label: 'Break-even volume', value: r.breakEven ? `${num(r.breakEven / 1e6)} million requests a month` : 'beyond the range' },
    ],
  };
}

// ---------- GPU instances ----------

export const MODEL_SIZES = [1, 3, 7, 8, 13, 34, 70];

export function gpuExperiment(id: string): ExperimentDef<GpuInput, GpuResult> {
  return {
    id,
    initial: { paramsB: 8, workload: 'infer-16' },
    controls: [
      { kind: 'select', id: 'size', label: 'Model size (billions of parameters)', options: MODEL_SIZES.map((v) => ({ value: String(v), label: `${v}B` })), get: (s) => String(s.paramsB), set: (s, v) => ({ ...s, paramsB: Number(v) }) },
      { kind: 'select', id: 'workload', label: 'Workload', options: Object.entries(WORKLOAD_LABEL).map(([value, label]) => ({ value, label })), get: (s) => s.workload, set: (s, v) => ({ ...s, workload: v as Workload }) },
    ],
    compute: (s) => fitInstances(s),
    readout: (_s, r) => [
      { label: 'Weights (and training state)', value: `${num(r.weightsGb)} GB` },
      { label: 'Plan for, with 20% headroom', value: `${num(r.needGb)} GB` },
      { label: 'Cheapest instance that fits', value: r.cheapest ? `${r.cheapest.name}, ${r.cheapest.gpus} × ${r.cheapest.gpu} (${usd(r.cheapest.price, 2)}/h, illustrative)` : 'none in this list', status: r.cheapest ? 'ok' : 'error' },
    ],
  };
}

// ---------- spot and checkpoints ----------

export interface SpotState extends SpotInput {
  seed: number;
}

export interface SpotResult {
  estimate: SpotEstimate;
  run: SpotRun;
}

export function spotExperiment(id: string): ExperimentDef<SpotState, SpotResult> {
  return {
    id,
    initial: { workHours: 20, intervalMin: 30, checkpointMin: 3, restartMin: 10, ratePerHour: 0.1, spotPrice: 0.35, onDemandPrice: 1, seed: 3 },
    controls: [
      { kind: 'slider', id: 'interval', label: 'Checkpoint every (minutes of work, 0 = never)', min: 0, max: 240, step: 10, get: (s) => s.intervalMin, set: (s, v) => ({ ...s, intervalMin: v }) },
      { kind: 'slider', id: 'rate', label: 'Interruptions per hour', min: 0, max: 0.5, step: 0.02, get: (s) => s.ratePerHour, set: (s, v) => ({ ...s, ratePerHour: v }) },
      { kind: 'slider', id: 'ckpt', label: 'Minutes to save one checkpoint', min: 1, max: 15, step: 1, get: (s) => s.checkpointMin, set: (s, v) => ({ ...s, checkpointMin: v }) },
      { kind: 'slider', id: 'restart', label: 'Minutes to restart after an interruption', min: 2, max: 30, step: 1, get: (s) => s.restartMin, set: (s, v) => ({ ...s, restartMin: v }) },
      { kind: 'slider', id: 'work', label: 'Hours of training the job needs', min: 2, max: 48, step: 1, get: (s) => s.workHours, set: (s, v) => ({ ...s, workHours: v }) },
      { kind: 'slider', id: 'seed', label: 'Random seed (example run)', min: 1, max: 20, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: (s) => ({ estimate: spotEstimate(s), run: simulateSpot(s, s.seed) }),
    readout: (_s, r) => [
      { label: 'Expected wall clock on spot', value: Number.isFinite(r.estimate.hours) ? `${num(r.estimate.hours)} h` : 'never finishes', status: Number.isFinite(r.estimate.hours) ? undefined : 'diverged' },
      { label: 'Expected spot cost vs on-demand', value: `${usd(r.estimate.spotCost, 2)} vs ${usd(r.estimate.onDemandCost, 2)}`, status: r.estimate.spotCost < r.estimate.onDemandCost ? 'ok' : 'error' },
      { label: 'Best interval (Young’s rule)', value: r.estimate.bestIntervalMin ? `${Math.round(r.estimate.bestIntervalMin)} min` : 'no interruptions: none needed' },
      { label: 'Example run', value: `${num(r.run.hours)} h, ${r.run.interruptions} interruptions, ${num(r.run.lostHours)} h redone` },
    ],
  };
}

// ---------- managed training jobs ----------

export function managedExperiment(id: string): ExperimentDef<ManagedInput, ManagedResult> {
  return {
    id,
    initial: { datasetGb: 200, inputMode: 'File', downloadMbps: 500, trainHours: 3, modelGb: 16, pricePerHour: 1.86, instances: 1, forgottenHours: 14, setupMin: 45 },
    controls: [
      { kind: 'select', id: 'mode', label: 'SageMaker input mode', options: opts([['File', 'File (copy everything first)'], ['FastFile', 'FastFile (stream on demand)']]), get: (s) => s.inputMode, set: (s, v) => ({ ...s, inputMode: v as InputMode }) },
      { kind: 'slider', id: 'size', label: 'Dataset (GB)', min: 10, max: 2000, step: 10, get: (s) => s.datasetGb, set: (s, v) => ({ ...s, datasetGb: v }) },
      { kind: 'slider', id: 'train', label: 'Training hours', min: 0.5, max: 24, step: 0.5, get: (s) => s.trainHours, set: (s, v) => ({ ...s, trainHours: v }) },
      { kind: 'slider', id: 'instances', label: 'Instances', min: 1, max: 4, step: 1, get: (s) => s.instances, set: (s, v) => ({ ...s, instances: v }) },
      { kind: 'slider', id: 'forgot', label: 'Your VM: idle hours before someone stops it', min: 0, max: 72, step: 1, get: (s) => s.forgottenHours, set: (s, v) => ({ ...s, forgottenHours: v }) },
    ],
    compute: managedVsVm,
    readout: (_s, r) => [
      { label: 'Managed job: billed', value: `${num(r.managed.billedHours, 2)} instance-hours, ${usd(r.managed.cost, 2)}` },
      { label: 'Your own VM: billed', value: `${num(r.vm.billedHours, 2)} instance-hours, ${usd(r.vm.cost, 2)}` },
      { label: 'Difference', value: usd(r.vm.cost - r.managed.cost, 2), status: r.vm.cost > r.managed.cost ? 'ok' : undefined },
    ],
  };
}

// ---------- API vs self-hosting ----------

export const DAILY_VOLUMES = [1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000];

export function apiExperiment(id: string): ExperimentDef<ApiInput, ApiResult> {
  return {
    id,
    initial: { requestsPerDay: 10_000, inputTokens: 1000, outputTokens: 300, priceIn: 0.5, priceOut: 1.5, gpuPricePerHour: 1, tokensPerSecondPerGpu: 400, peakFactor: 3, opsHours: 10, opsRate: 100 },
    controls: [
      { kind: 'select', id: 'volume', label: 'Requests per day', options: DAILY_VOLUMES.map((v) => ({ value: String(v), label: v.toLocaleString('en-US') })), get: (s) => String(s.requestsPerDay), set: (s, v) => ({ ...s, requestsPerDay: Number(v) }) },
      { kind: 'slider', id: 'in', label: 'Input tokens per request', min: 100, max: 8000, step: 100, get: (s) => s.inputTokens, set: (s, v) => ({ ...s, inputTokens: v }) },
      { kind: 'slider', id: 'out', label: 'Output tokens per request', min: 50, max: 2000, step: 50, get: (s) => s.outputTokens, set: (s, v) => ({ ...s, outputTokens: v }) },
      { kind: 'slider', id: 'priceout', label: 'API $ per million output tokens', min: 0.5, max: 20, step: 0.5, get: (s) => s.priceOut, set: (s, v) => ({ ...s, priceOut: v }) },
      { kind: 'slider', id: 'tps', label: 'Self-hosted output tokens/s per GPU', min: 100, max: 3000, step: 100, get: (s) => s.tokensPerSecondPerGpu, set: (s, v) => ({ ...s, tokensPerSecondPerGpu: v }) },
      { kind: 'slider', id: 'ops', label: 'Engineer hours per month to run it', min: 0, max: 80, step: 5, get: (s) => s.opsHours, set: (s, v) => ({ ...s, opsHours: v }) },
    ],
    compute: compareApi,
    readout: (_s, r) => [
      { label: 'API per month', value: usd(r.api), status: r.cheaper === 'api' ? 'ok' : undefined },
      { label: 'Self-hosted per month', value: `${usd(r.selfHost.total)} (${r.selfHost.gpus} GPU${r.selfHost.gpus === 1 ? '' : 's'}, ${Math.round(r.selfHost.utilization * 100)}% busy on average)`, status: r.cheaper === 'self-host' ? 'ok' : undefined },
      { label: 'Self-hosting starts to win at', value: r.breakEvenPerDay ? `about ${r.breakEvenPerDay.toLocaleString('en-US')} requests a day` : 'never below 100 million a day' },
    ],
  };
}

// ---------- the monthly bill ----------

export function billExperiment(id: string): ExperimentDef<BillInput, BillResult> {
  const toggle = (key: 'autoStop' | 'autoscale' | 'commit' | 'lifecycle', label: string) => ({
    kind: 'select' as const,
    id: key,
    label,
    options: yesNo,
    get: (s: BillInput) => yn(s[key]),
    set: (s: BillInput, v: string) => ({ ...s, [key]: v === 'yes' }),
  });
  return {
    id,
    initial: {
      trainGpuHours: 300, trainPrice: 4, spotShare: 0, spotDiscount: 0.6, notebooks: 4, notebookPrice: 1.2,
      autoStop: false, endpointInstances: 2, endpointPrice: 1, autoscale: false, autoscaleShare: 0.55,
      commit: false, commitDiscount: 0.3, storageGb: 40_000, lifecycle: false, lifecycleShare: 0.5, egressGb: 2000,
    },
    controls: [
      { kind: 'slider', id: 'spot', label: 'Share of training on spot', min: 0, max: 1, step: 0.1, get: (s) => s.spotShare, set: (s, v) => ({ ...s, spotShare: v }), format: (v) => `${Math.round(v * 100)}%` },
      toggle('autoStop', 'Stop idle notebooks'),
      toggle('autoscale', 'Autoscale the endpoint'),
      toggle('commit', 'Commit to steady endpoint usage (30% off)'),
      toggle('lifecycle', 'Lifecycle rules: expire old checkpoints'),
      { kind: 'slider', id: 'train', label: 'Training GPU-hours per month', min: 0, max: 2000, step: 50, get: (s) => s.trainGpuHours, set: (s, v) => ({ ...s, trainGpuHours: v }) },
      { kind: 'slider', id: 'notebooks', label: 'Notebooks', min: 0, max: 12, step: 1, get: (s) => s.notebooks, set: (s, v) => ({ ...s, notebooks: v }) },
    ],
    compute: monthlyBill,
    readout: (_s, r) => [
      { label: 'This month', value: usd(r.total) },
      { label: 'With every control off', value: usd(r.baseline) },
      { label: 'Saved', value: `${usd(r.baseline - r.total)} (${Math.round((1 - r.total / r.baseline) * 100)}%)`, status: r.total < r.baseline ? 'ok' : undefined },
    ],
  };
}

// ---------- infrastructure as code ----------

const BUCKET: Resource = { address: 'aws_s3_bucket.data', type: 'aws_s3_bucket', attrs: { bucket: 'acme-ml-data' } };
const VERSIONING: Resource = { address: 'aws_s3_bucket_versioning.data', type: 'aws_s3_bucket_versioning', attrs: { bucket: 'aws_s3_bucket.data.id', status: 'Enabled' } };
const NOTEBOOK: Resource = { address: 'aws_instance.notebook', type: 'aws_instance', attrs: { ami: 'ami-0a1b2c3d', instance_type: 'g5.xlarge' } };
const BASE = [BUCKET, VERSIONING, NOTEBOOK];
const withAttr = (r: Resource, k: string, v: string): Resource => ({ ...r, attrs: { ...r.attrs, [k]: v } });

export const IAC_SCENARIOS: Record<string, { label: string; config: Resource[]; state: Resource[]; cloud: Resource[] }> = {
  first: { label: 'First apply (nothing exists yet)', config: BASE, state: [], cloud: [] },
  same: { label: 'Run plan again, nothing changed', config: BASE, state: BASE, cloud: BASE },
  resize: { label: 'Change instance_type to g6.xlarge', config: [BUCKET, VERSIONING, withAttr(NOTEBOOK, 'instance_type', 'g6.xlarge')], state: BASE, cloud: BASE },
  ami: { label: 'Change the AMI (machine image)', config: [BUCKET, VERSIONING, withAttr(NOTEBOOK, 'ami', 'ami-9z8y7x6w')], state: BASE, cloud: BASE },
  remove: { label: 'Delete the notebook block from the code', config: [BUCKET, VERSIONING], state: BASE, cloud: BASE },
  rename: { label: 'Rename the bucket', config: [withAttr(BUCKET, 'bucket', 'acme-ml-data-v2'), VERSIONING, NOTEBOOK], state: BASE, cloud: BASE },
  drift: { label: 'Someone suspended versioning in the console', config: BASE, state: BASE, cloud: [BUCKET, withAttr(VERSIONING, 'status', 'Suspended'), NOTEBOOK] },
};

export interface IacState {
  scenario: string;
  preventDestroy: boolean;
}

export interface IacResult extends PlanResult {
  hcl: string;
}

export function iacExperiment(id: string): ExperimentDef<IacState, IacResult> {
  return {
    id,
    initial: { scenario: 'first', preventDestroy: false },
    controls: [
      { kind: 'select', id: 'scenario', label: 'What happened', options: Object.entries(IAC_SCENARIOS).map(([value, x]) => ({ value, label: x.label })), get: (s) => s.scenario, set: (s, v) => ({ ...s, scenario: v }) },
      { kind: 'select', id: 'prevent', label: 'prevent_destroy on the bucket', options: yesNo, get: (s) => yn(s.preventDestroy), set: (s, v) => ({ ...s, preventDestroy: v === 'yes' }) },
    ],
    compute: (s) => {
      const sc = IAC_SCENARIOS[s.scenario] ?? IAC_SCENARIOS.first!;
      const guard = s.preventDestroy ? [BUCKET.address] : [];
      return { ...plan(sc.config, sc.state, sc.cloud, guard), hcl: toHcl(sc.config, guard) };
    },
    readout: (_s, r) => [
      { label: 'terraform plan', value: r.summary, status: r.error ? 'error' : r.destroy ? 'diverged' : 'ok' },
      { label: 'Drift found while refreshing', value: r.drift.length ? r.drift.map((d) => `${d.address}.${d.attr}: ${d.inState} → ${d.inCloud}`).join('; ') : 'none' },
    ],
  };
}

// ---------- capstone ----------

export function capstoneExperiment(id: string): ExperimentDef<CloudPlan, CapstoneResult> {
  return {
    id,
    initial: { instance: 'g4dn.xlarge', trainHours: 20, spot: true, intervalMin: 0, dataPlacement: 'cross-region', credentials: 'access-keys', network: 'public-open', endpoint: 'fixed-2' },
    controls: [
      { kind: 'select', id: 'instance', label: 'Training instance', options: INSTANCES.filter((i) => i.gpus === 1).map((i) => ({ value: i.name, label: `${i.name} (${i.gpu}, ${i.gbPerGpu} GB)` })), get: (s) => s.instance, set: (s, v) => ({ ...s, instance: v }) },
      { kind: 'slider', id: 'hours', label: 'Measured training hours on it', min: 4, max: 40, step: 1, get: (s) => s.trainHours, set: (s, v) => ({ ...s, trainHours: v }) },
      { kind: 'select', id: 'spot', label: 'Use spot capacity', options: yesNo, get: (s) => yn(s.spot), set: (s, v) => ({ ...s, spot: v === 'yes' }) },
      { kind: 'slider', id: 'interval', label: 'Checkpoint every (minutes, 0 = never)', min: 0, max: 180, step: 10, get: (s) => s.intervalMin, set: (s, v) => ({ ...s, intervalMin: v }) },
      { kind: 'select', id: 'data', label: 'Training data lives', options: opts([['same-region', 'same region as the GPUs'], ['cross-region', 'another region'], ['internet', 'outside the cloud']]), get: (s) => s.dataPlacement, set: (s, v) => ({ ...s, dataPlacement: v as Placement }) },
      { kind: 'select', id: 'creds', label: 'Credentials', options: opts([['role', 'an IAM role attached to the job'], ['access-keys', 'access keys in a config file']]), get: (s) => s.credentials, set: (s, v) => ({ ...s, credentials: v as CloudPlan['credentials'] }) },
      { kind: 'select', id: 'network', label: 'Network', options: opts([['private-endpoint', 'private subnet, S3 endpoint'], ['public-open', 'public subnet, port 8888 open']]), get: (s) => s.network, set: (s, v) => ({ ...s, network: v as CloudPlan['network'] }) },
      { kind: 'select', id: 'endpoint', label: 'Serving endpoint', options: opts([['fixed-2', '2 instances, always on'], ['autoscale-1-3', 'autoscale 1 to 3 (1.4 on average)']]), get: (s) => s.endpoint, set: (s, v) => ({ ...s, endpoint: v as CloudPlan['endpoint'] }) },
    ],
    compute: (s) => checkPlan(s),
    readout: (_s, r) => [
      { label: 'Checks passed', value: `${r.passed} of ${r.checks.length}`, status: r.passed === r.checks.length ? 'ok' : 'error' },
      { label: 'Estimated monthly bill', value: usd(r.monthly.total) },
    ],
  };
}
