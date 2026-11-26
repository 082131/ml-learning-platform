// The capstone plan checker: one fine-tuning and serving plan, checked against the requirements with the same
// functions the earlier lessons use (memory fit, spot time, transfer cost, the bill, the network paths).

import { fitInstances, INSTANCES } from './gpu';
import { reachability } from './network';
import { spotEstimate } from './spot';
import { transferPlan, type Placement } from './dataload';
import { HOURS_PER_MONTH } from './bill';

export interface CloudPlan {
  instance: string;
  /** Hours the fine-tune takes on this instance, measured with a short benchmark run and extrapolated. */
  trainHours: number;
  spot: boolean;
  /** Minutes between checkpoints when on spot. */
  intervalMin: number;
  dataPlacement: Placement;
  credentials: 'role' | 'access-keys';
  network: 'private-endpoint' | 'public-open';
  endpoint: 'fixed-2' | 'autoscale-1-3';
}

export interface Requirements {
  paramsB: number;
  datasetGb: number;
  /** Training runs per month (each reads the data 3 times). */
  runsPerMonth: number;
  deadlineHours: number;
  monthlyBudget: number;
  /** Serving instance price per hour (one 24 GB GPU). */
  servePrice: number;
}

export const CAPSTONE_REQ: Requirements = { paramsB: 8, datasetGb: 200, runsPerMonth: 4, deadlineHours: 30, monthlyBudget: 2500, servePrice: 0.8 };

/** Spot assumptions for the checker: 0.05 interruptions per hour, 3-minute checkpoints, 10-minute restarts, 65% off. */
export const CAPSTONE_SPOT = { ratePerHour: 0.05, checkpointMin: 3, restartMin: 10, discount: 0.65 };

export interface Check {
  id: 'fits' | 'deadline' | 'budget' | 'credentials' | 'network' | 'data';
  label: string;
  ok: boolean;
  detail: string;
}

export interface CapstoneResult {
  checks: Check[];
  passed: number;
  monthly: { training: number; serving: number; transfer: number; total: number };
  wallHours: number;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function checkPlan(p: CloudPlan, req: Requirements = CAPSTONE_REQ): CapstoneResult {
  const inst = INSTANCES.find((i) => i.name === p.instance) ?? INSTANCES[0]!;
  const fit = fitInstances({ paramsB: req.paramsB, workload: 'lora' }, [inst]).fits[0]!;
  const price = p.spot ? inst.price * (1 - CAPSTONE_SPOT.discount) : inst.price;
  const est = spotEstimate({
    workHours: p.trainHours,
    intervalMin: p.spot ? p.intervalMin : 0,
    checkpointMin: CAPSTONE_SPOT.checkpointMin,
    restartMin: CAPSTONE_SPOT.restartMin,
    ratePerHour: p.spot ? CAPSTONE_SPOT.ratePerHour : 0,
    spotPrice: price,
    onDemandPrice: inst.price,
  });
  const wallHours = est.hours;
  const training = (p.spot ? est.spotCost : p.trainHours * inst.price) * req.runsPerMonth;
  const serving = (p.endpoint === 'fixed-2' ? 2 : 1.4) * HOURS_PER_MONTH * req.servePrice;
  const transfer = transferPlan({ datasetGb: req.datasetGb, readsPerMonth: 3 * req.runsPerMonth, placement: p.dataPlacement, cache: false, linkGbps: 5, localGbps: 20 }).cost;
  const total = training + serving + transfer;
  const net = reachability({ subnet: p.network === 'public-open' ? 'public' : 'private', publicIp: p.network === 'public-open', natGateway: true, s3Endpoint: p.network === 'private-endpoint', inbound8888: p.network === 'public-open' ? 'anywhere' : 'none' });
  const exposed = net.paths.find((x) => x.id === 'stranger')!.reachable;
  const checks: Check[] = [
    {
      id: 'fits',
      label: `${req.paramsB}B LoRA fine-tune fits in GPU memory`,
      ok: fit.fit !== 'too-small',
      detail: `needs about ${fit.totalGb - fit.spareGb} GB; ${inst.name} has ${fit.totalGb} GB${fit.fit === 'split' ? ' across GPUs (needs sharding)' : ''}`,
    },
    {
      id: 'deadline',
      label: `Finishes within ${req.deadlineHours} h`,
      ok: Number.isFinite(wallHours) && wallHours <= req.deadlineHours,
      detail: Number.isFinite(wallHours) ? `expected ${wallHours.toFixed(1)} h wall clock` : 'expected never to finish: interruptions undo work faster than it is saved',
    },
    { id: 'budget', label: `Monthly bill under ${usd(req.monthlyBudget)}`, ok: total <= req.monthlyBudget, detail: `${usd(total)}: training ${usd(training)}, serving ${usd(serving)}, transfer ${usd(transfer)}` },
    {
      id: 'credentials',
      label: 'No long-lived keys on machines',
      ok: p.credentials === 'role',
      detail: p.credentials === 'role' ? 'jobs get short-lived credentials from an attached role' : 'access keys in a config file can leak and never expire',
    },
    { id: 'network', label: 'Nothing open to the internet', ok: !exposed, detail: exposed ? 'Jupyter port 8888 is reachable from anywhere' : 'private subnet; S3 through a gateway endpoint' },
    {
      id: 'data',
      label: 'Data next to the GPUs',
      ok: p.dataPlacement === 'same-region',
      detail: p.dataPlacement === 'same-region' ? 'same region: no transfer charge' : `${usd(transfer)} a month to move data to the GPUs`,
    },
  ];
  return { checks, passed: checks.filter((c) => c.ok).length, monthly: { training, serving, transfer, total }, wallHours };
}
