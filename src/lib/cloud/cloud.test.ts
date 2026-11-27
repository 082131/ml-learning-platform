// Unit tests for the Cloud for ML track's logic, with hand-worked numbers (each comment shows the arithmetic).
import { describe, expect, it } from 'vitest';
import { compareApi, apiCost, selfHostCost, type ApiInput } from './apis';
import { anyUp, availability, duration, percent } from './availability';
import { monthlyBill, type BillInput } from './bill';
import { checkPlan, type CloudPlan } from './capstone';
import { compareCompute, serverlessCost, vmCost, type ComputeInput } from './compute';
import { loadThroughput, transferPlan } from './dataload';
import { fitInstances, gpuNeed, INSTANCES } from './gpu';
import { plan, toHcl, type Resource } from './iac';
import { evaluate, policyJson, wildcard, type Policy } from './iam';
import { managedVsVm } from './managed';
import { blockSize, contains, intToIp, ipToInt, parseCidr, reachability, splitCidr } from './network';
import { simulateSpot, spotEstimate, type SpotInput } from './spot';
import * as ex from './experiments';
import { validateExperiment } from '../experiment';

describe('availability', () => {
  it('anyUp is 1 − (1 − p)^n', () => {
    expect(anyUp(0.99, 1)).toBeCloseTo(0.99, 12);
    expect(anyUp(0.99, 2)).toBeCloseTo(0.9999, 12); // 1 − 0.01² = 0.9999
  });
  it('one instance in one zone multiplies the layers', () => {
    // 0.99 × 0.999 × 0.9999 = 0.988911099 → 1.1089% of 8760 h ≈ 97.14 h a year
    const r = availability({ instance: 0.99, zone: 0.999, region: 0.9999, replicasPerZone: 1, zonesPerRegion: 1, regions: 1 });
    expect(r.service).toBeCloseTo(0.988911099, 9);
    expect(r.downHoursPerYear).toBeCloseTo(97.1388, 3);
    expect(r.instances).toBe(1);
  });
  it('two replicas in each of two zones', () => {
    // zone serves: 0.999 × (1 − 0.01²) = 0.9989001; region: 0.9999 × (1 − 0.0010999²) ≈ 0.99989879
    const r = availability({ instance: 0.99, zone: 0.999, region: 0.9999, replicasPerZone: 2, zonesPerRegion: 2, regions: 1 });
    expect(r.zoneServes).toBeCloseTo(0.9989001, 9);
    expect(r.service).toBeCloseTo(0.99989879, 8);
    expect(r.downHoursPerYear).toBeCloseTo(0.8866, 3);
    expect(r.instances).toBe(4);
  });
  it('formats percentages and durations', () => {
    expect(percent(0.995)).toBe('99.50%');
    expect(percent(0.99995)).toBe('99.9950%');
    expect(duration(97.14)).toBe('4.0 days');
    expect(duration(0.8866)).toBe('53.2 min');
  });
});

describe('IAM evaluation', () => {
  const TRAIN = 'arn:aws:iam::111122223333:role/train-job';
  const CI = 'arn:aws:iam::111122223333:role/ci-deploy';
  const identity: Policy = {
    name: 'train-job-policy',
    source: 'identity',
    attachedTo: TRAIN,
    statements: [
      { sid: 'ReadData', effect: 'Allow', actions: ['s3:GetObject'], resources: ['arn:aws:s3:::acme-ml/datasets/*'] },
      { sid: 'WriteModels', effect: 'Allow', actions: ['s3:PutObject'], resources: ['arn:aws:s3:::acme-ml/models/*'] },
    ],
  };
  const bucket: Policy = {
    name: 'acme-ml bucket policy',
    source: 'resource',
    statements: [{ sid: 'OnlyCiDeletesModels', effect: 'Deny', principals: ['*'], actions: ['s3:DeleteObject'], resources: ['arn:aws:s3:::acme-ml/models/*'], unlessPrincipal: CI }],
  };
  it('matches IAM wildcards', () => {
    expect(wildcard('s3:Get*', 's3:GetObject')).toBe(true);
    expect(wildcard('s3:get*', 's3:GetObject', true)).toBe(true);
    expect(wildcard('arn:aws:s3:::acme-ml/datasets/*', 'arn:aws:s3:::acme-ml/models/a.pt')).toBe(false);
    expect(wildcard('file-?.csv', 'file-1.csv')).toBe(true);
    expect(wildcard('file-?.csv', 'file-10.csv')).toBe(false);
  });
  it('allows what an identity policy allows', () => {
    const r = evaluate([identity, bucket], { principal: TRAIN, action: 's3:GetObject', resource: 'arn:aws:s3:::acme-ml/datasets/day=1/part-0.parquet' });
    expect(r.decision).toBe('allow');
    expect(r.hits.map((h) => h.sid)).toEqual(['ReadData']);
  });
  it('denies implicitly when nothing allows', () => {
    const r = evaluate([identity, bucket], { principal: TRAIN, action: 's3:GetObject', resource: 'arn:aws:s3:::acme-ml/models/v3.pt' });
    expect(r.decision).toBe('implicit-deny');
  });
  it('an explicit deny beats an allow', () => {
    const admin: Policy = { name: 'admin', source: 'identity', attachedTo: TRAIN, statements: [{ sid: 'Everything', effect: 'Allow', actions: ['*'], resources: ['*'] }] };
    const r = evaluate([admin, bucket], { principal: TRAIN, action: 's3:DeleteObject', resource: 'arn:aws:s3:::acme-ml/models/v3.pt' });
    expect(r.decision).toBe('explicit-deny');
    // The condition exempts the CI role from the deny.
    const ciAdmin = { ...admin, attachedTo: CI };
    expect(evaluate([ciAdmin, bucket], { principal: CI, action: 's3:DeleteObject', resource: 'arn:aws:s3:::acme-ml/models/v3.pt' }).decision).toBe('allow');
  });
  it('a guardrail must also allow', () => {
    const scp: Policy = { name: 'org guardrail', source: 'guardrail', statements: [{ sid: 'OnlyS3', effect: 'Allow', actions: ['s3:*'], resources: ['*'] }] };
    const ec2: Policy = { name: 'p', source: 'identity', attachedTo: TRAIN, statements: [{ sid: 'Ec2', effect: 'Allow', actions: ['ec2:RunInstances'], resources: ['*'] }] };
    expect(evaluate([ec2, scp], { principal: TRAIN, action: 'ec2:RunInstances', resource: '*' }).decision).toBe('guardrail-deny');
  });
  it('renders policy JSON with the IAM grammar', () => {
    const j = JSON.parse(policyJson(bucket));
    expect(j.Version).toBe('2012-10-17');
    expect(j.Statement[0]).toEqual({
      Sid: 'OnlyCiDeletesModels',
      Effect: 'Deny',
      Principal: '*',
      Action: 's3:DeleteObject',
      Resource: 'arn:aws:s3:::acme-ml/models/*',
      Condition: { ArnNotEquals: { 'aws:PrincipalArn': CI } },
    });
  });
});

describe('network', () => {
  it('parses and splits CIDR blocks', () => {
    expect(ipToInt('10.0.1.0')).toBe(10 * 2 ** 24 + 256);
    expect(intToIp(167772416)).toBe('10.0.1.0');
    const vpc = parseCidr('10.0.0.0/16')!;
    expect(blockSize(vpc)).toBe(65536); // 2^(32−16)
    expect(parseCidr('10.0.0.1/16')).toBeNull(); // host bits set
    expect(parseCidr('300.0.0.0/8')).toBeNull();
    const s = splitCidr(vpc, 24)!;
    expect(s.count).toBe(256); // 2^(24−16)
    expect(s.size).toBe(256);
    expect(s.usableAws).toBe(251); // 256 − 5 reserved
    expect(s.first).toEqual(['10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24']);
    expect(s.last).toBe('10.0.255.0/24');
    expect(contains(vpc, '10.0.200.7')).toBe(true);
    expect(contains(vpc, '10.1.0.0')).toBe(false);
  });
  it('a private subnet with NAT and an S3 endpoint is reachable out, not in', () => {
    const r = reachability({ subnet: 'private', publicIp: false, natGateway: true, s3Endpoint: true, inbound8888: 'none' });
    expect(r.paths.map((p) => [p.id, p.reachable])).toEqual([
      ['pip', true],
      ['s3', true],
      ['office', false],
      ['stranger', false],
    ]);
    expect(r.paths[1]!.via).toBe('endpoint');
    expect(r.problems).toBe(0);
  });
  it('a private subnet without NAT cannot reach the internet', () => {
    const r = reachability({ subnet: 'private', publicIp: false, natGateway: false, s3Endpoint: false, inbound8888: 'none' });
    expect(r.paths[0]!.reachable).toBe(false);
    expect(r.paths[1]!.reachable).toBe(false);
    expect(r.problems).toBe(2);
  });
  it('a public instance open to 0.0.0.0/0 is reachable by strangers', () => {
    const r = reachability({ subnet: 'public', publicIp: true, natGateway: false, s3Endpoint: false, inbound8888: 'anywhere' });
    expect(r.paths.find((p) => p.id === 'stranger')!.reachable).toBe(true);
    expect(r.problems).toBe(1);
    const office = reachability({ subnet: 'public', publicIp: true, natGateway: false, s3Endpoint: false, inbound8888: 'office' });
    expect(office.paths.map((p) => p.reachable)).toEqual([true, true, true, false]);
  });
});

describe('object storage throughput', () => {
  const base = { datasetGb: 500, latencyMs: 20, streamMbps: 80, parallel: 16, nicGbps: 25, needMbps: 600 };
  it('small files are limited by latency', () => {
    // one request: 0.02 + 0.1/80 = 0.02125 s; 16 × 0.1 MB / 0.02125 s ≈ 75.3 MB/s
    const r = loadThroughput({ ...base, fileMb: 0.1 });
    expect(r.files).toBe(5_000_000);
    expect(r.requestSeconds).toBeCloseTo(0.02125, 10);
    expect(r.throughputMbps).toBeCloseTo(75.294, 3);
    expect(r.limitedBy).toBe('latency');
    expect(r.epochHours).toBeCloseTo(1.8446, 4); // 500,000 MB / 75.29 MB/s / 3600
    expect(r.gpuBusy).toBeCloseTo(0.1255, 4);
    expect(r.getCostPerEpoch).toBeCloseTo(2, 10); // 5,000,000 / 1000 × $0.0004
    expect(r.prefixesNeeded).toBe(1); // 753 GET/s
  });
  it('large shards are limited by bandwidth and feed the GPUs', () => {
    // 0.02 + 256/80 = 3.22 s; 16 × 256 / 3.22 ≈ 1272 MB/s, under the 3125 MB/s card
    const r = loadThroughput({ ...base, fileMb: 256 });
    expect(r.throughputMbps).toBeCloseTo(1272.05, 2);
    expect(r.limitedBy).toBe('bandwidth');
    expect(r.gpuBusy).toBe(1);
    expect(r.files).toBe(1954); // ceil(500,000 / 256)
  });
  it('the network card caps the total', () => {
    const r = loadThroughput({ ...base, fileMb: 256, parallel: 64, nicGbps: 10 });
    expect(r.throughputMbps).toBe(1250); // 10 Gbit/s × 125
    expect(r.limitedBy).toBe('network card');
  });
  it('prices transfer and caching', () => {
    // 1,000 GB read 20 times across regions: 20,000 GB × $0.02 = $400; cached: 1,000 GB × $0.02 = $20
    const x = { datasetGb: 1000, readsPerMonth: 20, placement: 'cross-region' as const, cache: false, linkGbps: 5, localGbps: 20 };
    expect(transferPlan(x).cost).toBeCloseTo(400, 10);
    expect(transferPlan(x).hoursPerRead).toBeCloseTo(0.4444, 4); // 1000 × 8 / 5 / 3600
    const cached = transferPlan({ ...x, cache: true });
    expect(cached.cost).toBeCloseTo(20, 10);
    expect(cached.hours).toBeCloseTo(0.4444 + 20 * 0.1111, 3);
    expect(transferPlan({ ...x, placement: 'same-region' }).cost).toBe(0);
  });
});

describe('serverless vs VM', () => {
  const x: ComputeInput = { requestsPerMonth: 1_000_000, durationMs: 200, memoryGb: 1, vmPricePerHour: 0.1, vmCapacityRps: 50, peakFactor: 3, minVms: 2 };
  it('prices Lambda per GB-second and per request', () => {
    // 1e6 × 0.2 s × 1 GB × $0.0000166667 = $3.33; plus 1 × $0.20
    const s = serverlessCost(x);
    expect(s.duration).toBeCloseTo(3.33334, 4);
    expect(s.total).toBeCloseTo(3.53334, 4);
  });
  it('prices VMs by the hour, at least minVms', () => {
    const v = vmCost(x);
    expect(v.instances).toBe(2);
    expect(v.total).toBeCloseTo(146, 10); // 2 × 730 × $0.10
  });
  it('finds the break-even volume', () => {
    const r = compareCompute(x);
    expect(r.cheaper).toBe('serverless');
    // 146 = R × (0.2 × 0.0000166667 + 0.2e-6) → R ≈ 41.3 million
    expect(r.breakEven! / 1e6).toBeGreaterThan(41);
    expect(r.breakEven! / 1e6).toBeLessThan(42.5);
  });
});

describe('GPU fit', () => {
  it('estimates memory per workload', () => {
    expect(gpuNeed({ paramsB: 7, workload: 'infer-16' })).toEqual({ weightsGb: 14, needGb: 14 * 1.2 });
    expect(gpuNeed({ paramsB: 7, workload: 'full' }).weightsGb).toBe(112); // 7 × 16 bytes
  });
  it('picks the cheapest instance that fits', () => {
    const r = fitInstances({ paramsB: 7, workload: 'infer-16' }); // 16.8 GB
    expect(r.fits.find((f) => f.name === 'g4dn.xlarge')!.fit).toBe('too-small');
    expect(r.cheapest!.name).toBe('g2-standard-4');
    const full = fitInstances({ paramsB: 7, workload: 'full' }); // 134.4 GB
    expect(full.cheapest!.name).toBe('p4d.24xlarge');
    expect(full.cheapest!.fit).toBe('split');
    expect(INSTANCES.every((i) => i.gpus > 0 && i.gbPerGpu > 0)).toBe(true);
  });
});

describe('spot', () => {
  const x: SpotInput = { workHours: 20, intervalMin: 30, checkpointMin: 3, restartMin: 10, ratePerHour: 0.1, spotPrice: 0.35, onDemandPrice: 1 };
  it('estimates wall time with checkpoints', () => {
    // W(1 + C/τ) = 20 × 1.1 = 22; waste λ((τ + C)/2 + R) = 0.1 × (0.275 + 0.1667) = 0.04417; T = 22 / 0.95583
    const r = spotEstimate(x);
    expect(r.onDemandHours).toBeCloseTo(22, 10);
    expect(r.hours).toBeCloseTo(23.0166, 3);
    expect(r.spotCost).toBeCloseTo(23.0166 * 0.35, 3);
    expect(r.bestIntervalMin).toBeCloseTo(60, 6); // sqrt(2 × 0.05 h / 0.1) = 1 h
  });
  it('without checkpoints the expected time grows exponentially', () => {
    // (1/λ + R)(e^(λW) − 1) = (10 + 1/6)(e² − 1) ≈ 64.955
    expect(spotEstimate({ ...x, intervalMin: 0 }).hours).toBeCloseTo(64.9554, 3);
  });
  it('never finishes when waste per hour reaches 1', () => {
    expect(spotEstimate({ ...x, intervalMin: 600, ratePerHour: 0.5 }).hours).toBe(Infinity);
  });
  it('a sample run is consistent and deterministic', () => {
    const a = simulateSpot(x, 7);
    expect(a).toEqual(simulateSpot(x, 7));
    expect(a.finished).toBe(true);
    const work = a.segments.filter((s) => s.kind === 'work').reduce((t, s) => t + s.end - s.start, 0);
    expect(work).toBeCloseTo(20, 6);
    expect(a.segments.filter((s) => s.kind === 'restart').length).toBe(a.interruptions);
    for (let k = 1; k < a.segments.length; k++) expect(a.segments[k]!.start).toBeCloseTo(a.segments[k - 1]!.end, 9);
    expect(simulateSpot({ ...x, ratePerHour: 0 }, 1).hours).toBeCloseTo(22 - 0.05, 9); // no checkpoint after the last chunk
  });
});

describe('managed training job vs VM', () => {
  it('bills download, training and upload, not provisioning', () => {
    // File mode: 100 GB at 500 MB/s = 200 s = 3.33 min; training 120 min; 5 GB upload = 10 s
    const r = managedVsVm({ datasetGb: 100, inputMode: 'File', downloadMbps: 500, trainHours: 2, modelGb: 5, pricePerHour: 6, instances: 1, forgottenHours: 10, setupMin: 45 });
    expect(r.managed.billedHours).toBeCloseTo((200 / 60 + 120 + 10 / 60) / 60, 10);
    expect(r.managed.phases[0]!.billed).toBe(false);
    expect(r.vm.billedHours).toBeCloseTo((45 + 200 / 60 + 120 + 10 / 60 + 600) / 60, 10);
    expect(r.vm.cost / r.managed.cost).toBeGreaterThan(6);
    const fast = managedVsVm({ datasetGb: 100, inputMode: 'FastFile', downloadMbps: 500, trainHours: 2, modelGb: 5, pricePerHour: 6, instances: 2, forgottenHours: 0, setupMin: 0 });
    expect(fast.managed.billedHours).toBeCloseTo(2 * (120 + 10 / 60) / 60, 10);
  });
});

describe('API vs self-hosting', () => {
  const x: ApiInput = { requestsPerDay: 10_000, inputTokens: 1000, outputTokens: 300, priceIn: 0.5, priceOut: 1.5, gpuPricePerHour: 1, tokensPerSecondPerGpu: 400, peakFactor: 3, opsHours: 10, opsRate: 100 };
  it('prices the API per token', () => {
    // 30 × 10,000 × (1000 × 0.5 + 300 × 1.5) / 1e6 = 30 × 10,000 × 950 / 1e6 = $285
    expect(apiCost(x)).toBeCloseTo(285, 10);
  });
  it('prices self-hosting by the GPU-hour plus operations', () => {
    // 3,000,000 output tokens/day = 34.7 tok/s, peak 104 tok/s → 1 GPU; 730 × $1 + 10 × $100
    const s = selfHostCost(x);
    expect(s.gpus).toBe(1);
    expect(s.total).toBeCloseTo(1730, 10);
    expect(s.utilization).toBeCloseTo(34.722 / 400, 4);
  });
  it('finds where self-hosting starts to win', () => {
    const r = compareApi(x);
    expect(r.cheaper).toBe('api');
    // the API costs $0.0285 per request-day; 1730 / 0.0285 ≈ 60,700 a day (more GPUs may push it later)
    expect(r.breakEvenPerDay!).toBeGreaterThan(55_000);
    expect(r.breakEvenPerDay!).toBeLessThan(120_000);
    expect(apiCost(x, r.breakEvenPerDay!)).toBeGreaterThanOrEqual(selfHostCost(x, r.breakEvenPerDay!).total);
  });
});

describe('monthly bill', () => {
  const x: BillInput = {
    trainGpuHours: 200, trainPrice: 4, spotShare: 0, spotDiscount: 0.6, notebooks: 3, notebookPrice: 1,
    autoStop: false, endpointInstances: 2, endpointPrice: 1, autoscale: false, autoscaleShare: 0.5,
    commit: false, commitDiscount: 0.3, storageGb: 10_000, lifecycle: false, lifecycleShare: 0.5, egressGb: 1000,
  };
  it('adds the line items', () => {
    // 800 + 3 × 730 + 2 × 730 + 10,000 × 0.023 + 1000 × 0.09 = 800 + 2190 + 1460 + 230 + 90
    const r = monthlyBill(x);
    expect(r.lines.map((l) => Math.round(l.cost * 100) / 100)).toEqual([800, 2190, 1460, 230, 90]);
    expect(r.total).toBeCloseTo(4770, 9);
    expect(r.baseline).toBe(r.total);
  });
  it('applies every control', () => {
    // training: 100 × 4 + 100 × 4 × 0.4 = 560; notebooks 3 × 174 = 522; endpoint 1 × 730 × 0.7 = 511; storage 115; egress 90
    const r = monthlyBill({ ...x, spotShare: 0.5, autoStop: true, autoscale: true, commit: true, lifecycle: true });
    expect(r.lines.map((l) => Math.round(l.cost * 100) / 100)).toEqual([560, 522, 511, 115, 90]);
    expect(r.baseline).toBeCloseTo(4770, 9);
    expect(r.lines[0]!.formula).toBe('100 h × $4 + 100 h × $4 × 0.4');
  });
});

describe('terraform plan', () => {
  const bucket: Resource = { address: 'aws_s3_bucket.data', type: 'aws_s3_bucket', attrs: { bucket: 'acme-ml-data' } };
  const vm: Resource = { address: 'aws_instance.notebook', type: 'aws_instance', attrs: { ami: 'ami-0a1b2c', instance_type: 'g5.xlarge' } };
  it('creates everything on the first apply', () => {
    const r = plan([bucket, vm], [], []);
    expect(r.changes.map((c) => c.action)).toEqual(['create', 'create']);
    expect(r.summary).toBe('Plan: 2 to add, 0 to change, 0 to destroy.');
  });
  it('updates in place, or replaces when an argument forces it', () => {
    const resized = { ...vm, attrs: { ...vm.attrs, instance_type: 'g6.xlarge' } };
    expect(plan([bucket, resized], [bucket, vm], [bucket, vm]).summary).toBe('Plan: 0 to add, 1 to change, 0 to destroy.');
    const newAmi = { ...vm, attrs: { ...vm.attrs, ami: 'ami-9z8y7x' } };
    const r = plan([bucket, newAmi], [bucket, vm], [bucket, vm]);
    expect(r.changes[1]!.action).toBe('replace');
    expect(r.summary).toBe('Plan: 1 to add, 0 to change, 1 to destroy.');
  });
  it('destroys what left the configuration, unless prevent_destroy', () => {
    expect(plan([vm], [bucket, vm], [bucket, vm]).summary).toBe('Plan: 0 to add, 0 to change, 1 to destroy.');
    const renamed = { ...bucket, attrs: { bucket: 'acme-ml-data-v2' } };
    const r = plan([renamed, vm], [bucket, vm], [bucket, vm], ['aws_s3_bucket.data']);
    expect(r.error).toMatch(/prevent_destroy/);
  });
  it('replaces resources that refer to a replaced one', () => {
    const versioning: Resource = { address: 'aws_s3_bucket_versioning.data', type: 'aws_s3_bucket_versioning', attrs: { bucket: 'aws_s3_bucket.data.id', 'versioning_configuration.status': 'Enabled' } };
    const renamed = { ...bucket, attrs: { bucket: 'acme-ml-data-v2' } };
    const r = plan([renamed, versioning], [bucket, versioning], [bucket, versioning]);
    expect(r.changes[1]).toEqual({ address: 'aws_s3_bucket_versioning.data', action: 'replace', diffs: [['bucket', 'acme-ml-data', '(known after apply)', true]] });
    expect(r.summary).toBe('Plan: 2 to add, 0 to change, 2 to destroy.');
  });
  it('detects drift and plans to undo it', () => {
    const changed = { ...vm, attrs: { ...vm.attrs, instance_type: 'p4d.24xlarge' } };
    const r = plan([bucket, vm], [bucket, vm], [bucket, changed]);
    expect(r.drift).toEqual([{ address: 'aws_instance.notebook', attr: 'instance_type', inState: 'g5.xlarge', inCloud: 'p4d.24xlarge' }]);
    expect(r.changes[1]!.diffs).toEqual([['instance_type', 'p4d.24xlarge', 'g5.xlarge', false]]);
    expect(plan([bucket, vm], [bucket, vm], [bucket, vm]).summary).toMatch(/^No changes/);
  });
  it('writes HCL', () => {
    expect(toHcl([bucket], ['aws_s3_bucket.data'])).toBe(
      'resource "aws_s3_bucket" "data" {\n  bucket = "acme-ml-data"\n\n  lifecycle {\n    prevent_destroy = true\n  }\n}',
    );
  });
});

describe('capstone plan checker', () => {
  const good: CloudPlan = { instance: 'g6e.xlarge', trainHours: 20, spot: true, intervalMin: 30, dataPlacement: 'same-region', credentials: 'role', network: 'private-endpoint', endpoint: 'autoscale-1-3' };
  it('a sound plan passes every check', () => {
    const r = checkPlan(good);
    expect(r.checks.filter((c) => !c.ok).map((c) => c.id)).toEqual([]);
    expect(r.passed).toBe(6);
  });
  it('flags each bad choice', () => {
    const r = checkPlan({ ...good, instance: 'g4dn.xlarge', credentials: 'access-keys', network: 'public-open', dataPlacement: 'internet', spot: true, intervalMin: 0 });
    expect(r.checks.filter((c) => !c.ok).map((c) => c.id)).toEqual(['fits', 'deadline', 'credentials', 'network', 'data']);
  });
});

describe('experiment definitions', () => {
  const defs = [
    ex.availabilityExperiment('a'), ex.iamExperiment('b'), ex.networkExperiment('c'), ex.loadExperiment('d'),
    ex.transferExperiment('e'), ex.computeExperiment('f'), ex.gpuExperiment('g'), ex.spotExperiment('h'),
    ex.managedExperiment('i'), ex.apiExperiment('j'), ex.billExperiment('k'), ex.iacExperiment('l'), ex.capstoneExperiment('m'),
  ];
  for (const d of defs) it(`${d.id} is valid`, () => expect(validateExperiment(d as never)).toEqual([]));
  it('every IaC scenario plans without throwing', () => {
    const d = ex.iacExperiment('x');
    for (const scenario of Object.keys(ex.IAC_SCENARIOS)) expect(d.compute({ scenario, preventDestroy: true }).summary).toBeTruthy();
    expect(d.compute({ scenario: 'drift', preventDestroy: false }).drift).toHaveLength(1);
    expect(d.compute({ scenario: 'rename', preventDestroy: true }).error).toMatch(/prevent_destroy/);
  });
  it('the IAM lab tells the three outcomes apart', () => {
    const d = ex.iamExperiment('x');
    const s = d.initial;
    expect(d.compute(s).evaluation.decision).toBe('allow');
    expect(d.compute({ ...s, role: 'notebook', action: 's3:DeleteObject', object: 'models/v3/model.tar.gz' }).evaluation.decision).toBe('explicit-deny');
    expect(d.compute({ ...s, action: 's3:PutObject' }).evaluation.decision).toBe('implicit-deny');
    expect(d.compute({ ...s, role: 'ci', action: 'iam:CreateAccessKey', guardrail: true }).evaluation.decision).toBe('guardrail-deny');
    expect(d.compute({ ...s, role: 'ci', action: 'iam:CreateAccessKey', guardrail: false }).evaluation.decision).toBe('allow');
  });
});
