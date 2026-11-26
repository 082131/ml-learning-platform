// A month's cloud bill for a small ML team, line by line, and what common controls do to it. Every price and
// discount is an input shown next to its line, so the formula is visible. Storage and egress defaults are Amazon S3
// Standard ($0.023 per GB-month, first 50 TB) and internet data transfer out ($0.09 per GB, first 10 TB) in US East.

export const S3_GB_MONTH = 0.023;
export const EGRESS_GB = 0.09;
export const HOURS_PER_MONTH = 730;
/** 8 working hours × about 21.75 working days. */
export const WORK_HOURS_PER_MONTH = 174;

export interface BillInput {
  trainGpuHours: number;
  trainPrice: number;
  /** Share of training run on spot, 0 to 1. */
  spotShare: number;
  /** Spot discount versus on-demand, 0 to 1 (AWS says "up to 90%"; it varies by type and hour). */
  spotDiscount: number;
  notebooks: number;
  notebookPrice: number;
  /** Stop notebooks after idle time: they run only during working hours. */
  autoStop: boolean;
  endpointInstances: number;
  endpointPrice: number;
  /** Autoscale the endpoint: average instances ≈ this fraction of the fixed count. */
  autoscale: boolean;
  autoscaleShare: number;
  /** Commit (Savings Plan, committed use discount) to cover the endpoint's steady usage. */
  commit: boolean;
  commitDiscount: number;
  storageGb: number;
  /** Delete old checkpoints and expire stale data: cuts stored GB by this share. */
  lifecycle: boolean;
  lifecycleShare: number;
  egressGb: number;
}

export interface BillLine {
  id: 'training' | 'notebooks' | 'endpoint' | 'storage' | 'egress';
  label: string;
  formula: string;
  cost: number;
}

export interface BillResult {
  lines: BillLine[];
  total: number;
  /** The same month with every control off. */
  baseline: number;
}

const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function monthlyBill(x: BillInput): BillResult {
  const spotH = x.trainGpuHours * x.spotShare;
  const odH = x.trainGpuHours - spotH;
  const training = odH * x.trainPrice + spotH * x.trainPrice * (1 - x.spotDiscount);
  const nbHours = x.autoStop ? WORK_HOURS_PER_MONTH : HOURS_PER_MONTH;
  const notebooks = x.notebooks * nbHours * x.notebookPrice;
  const avgInstances = x.autoscale ? x.endpointInstances * x.autoscaleShare : x.endpointInstances;
  const endpointRate = x.endpointPrice * (x.commit ? 1 - x.commitDiscount : 1);
  const endpoint = avgInstances * HOURS_PER_MONTH * endpointRate;
  const gb = x.lifecycle ? x.storageGb * (1 - x.lifecycleShare) : x.storageGb;
  const storage = gb * S3_GB_MONTH;
  const egress = x.egressGb * EGRESS_GB;
  const lines: BillLine[] = [
    {
      id: 'training',
      label: 'Training GPUs',
      formula:
        x.spotShare > 0
          ? `${num(odH)} h × ${usd(x.trainPrice)} + ${num(spotH)} h × ${usd(x.trainPrice)} × ${num(1 - x.spotDiscount)}`
          : `${num(x.trainGpuHours)} h × ${usd(x.trainPrice)}`,
      cost: training,
    },
    { id: 'notebooks', label: 'Notebooks', formula: `${x.notebooks} × ${nbHours} h × ${usd(x.notebookPrice)}`, cost: notebooks },
    {
      id: 'endpoint',
      label: 'Model endpoint',
      formula: `${num(avgInstances)} avg instances × ${HOURS_PER_MONTH} h × ${usd(+endpointRate.toFixed(4))}`,
      cost: endpoint,
    },
    { id: 'storage', label: 'Object storage', formula: `${num(gb)} GB × ${usd(S3_GB_MONTH)}`, cost: storage },
    { id: 'egress', label: 'Data transfer out', formula: `${num(x.egressGb)} GB × ${usd(EGRESS_GB)}`, cost: egress },
  ];
  const total = lines.reduce((a, l) => a + l.cost, 0);
  const anyControl = x.spotShare > 0 || x.autoStop || x.autoscale || x.commit || x.lifecycle;
  const baseline = anyControl
    ? monthlyBill({ ...x, spotShare: 0, autoStop: false, autoscale: false, commit: false, lifecycle: false }).total
    : total;
  return { lines, total, baseline };
}
