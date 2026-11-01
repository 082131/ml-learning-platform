/**
 * The cloud lesson's monthly cost estimate for a growing dataset: storage by class with a lifecycle rule for
 * data older than 3 months, plus query cost from bytes scanned. The prices are example values (round numbers
 * of the order of published list prices), not any provider's current price list; the result is an estimate.
 * cloudCost.test.ts checks every setting against COST_SOURCE run with CPython 3.13.
 */
import type { ExperimentDef } from '../types';

export const PRICE = { standard: 0.023, infrequent: 0.0125, archive: 0.004 } as const;
export const SCAN_PRICE = 5.0;
export const MONTHS = 12;
export const HOT_MONTHS = 3;

export type Lifecycle = 'none' | 'infrequent' | 'archive';
export type ScanMode = 'recent' | 'full';
export type StorageClass = keyof typeof PRICE;

export interface CostState {
  newGb: number;
  lifecycle: Lifecycle;
  queries: number;
  scan: ScanMode;
}

export interface CostResult {
  hot: number;
  cold: number;
  coldClass: StorageClass;
  storage: number;
  scannedGb: number;
  queryCost: number;
  total: number;
  /** Full scans would need archived objects restored first. */
  archiveConflict: boolean;
}

export function estimateCost({ newGb, lifecycle, queries, scan }: CostState): CostResult {
  const hot = newGb * Math.min(MONTHS, HOT_MONTHS);
  const cold = newGb * MONTHS - hot;
  const coldClass: StorageClass = lifecycle === 'none' ? 'standard' : lifecycle;
  const storage = hot * PRICE.standard + cold * PRICE[coldClass];
  const scannedGb = scan === 'recent' ? (newGb * 7) / 30 : newGb * MONTHS;
  const queryCost = ((queries * 30 * scannedGb) / 1000) * SCAN_PRICE;
  return {
    hot,
    cold,
    coldClass,
    storage,
    scannedGb,
    queryCost,
    total: storage + queryCost,
    archiveConflict: scan === 'full' && coldClass === 'archive',
  };
}

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** Python's format(x, ",") for an int and format(x, ",.2f") for a float. */
export const intComma = (n: number) => group(String(n));
export const money = (x: number) => {
  const [i, f] = x.toFixed(2).split('.');
  return `${group(i!)}.${f}`;
};

/** What COST_SOURCE prints. */
export function costPrintout(r: CostResult): string {
  const lines = [
    `stored: ${intComma(r.hot)} GB standard + ${intComma(r.cold)} GB ${r.coldClass}`,
    `storage $${money(r.storage)} + queries $${money(r.queryCost)} = $${money(r.total)} per month`,
  ];
  if (r.archiveConflict) lines.push('but full scans cannot read archived objects until they are restored');
  return lines.join('\n');
}

export const COST_SOURCE = `PRICE = {"standard": 0.023, "infrequent": 0.0125, "archive": 0.004}  # example $ per GB-month
SCAN_PRICE = 5.0  # example $ per TB a query engine scans
NEW_GB = {{newGb}}  # GB landed per month
LIFECYCLE = "{{lifecycle}}"  # none, infrequent or archive: where data older than 3 months goes
QUERIES_PER_DAY = {{queries}}
SCAN = "{{scan}}"  # recent: queries read the last 7 days (partitioned); full: the whole table

months = 12  # the bill in month 12, once a year of data has built up
hot = NEW_GB * min(months, 3)
cold = NEW_GB * months - hot
cold_class = "standard" if LIFECYCLE == "none" else LIFECYCLE
storage = hot * PRICE["standard"] + cold * PRICE[cold_class]
scanned_gb = NEW_GB * 7 / 30 if SCAN == "recent" else NEW_GB * months
queries = QUERIES_PER_DAY * 30 * scanned_gb / 1000 * SCAN_PRICE

print(f"stored: {hot:,} GB standard + {cold:,} GB {cold_class}")
print(f"storage \${storage:,.2f} + queries \${queries:,.2f} = \${storage + queries:,.2f} per month")
if SCAN == "full" and cold_class == "archive":
    print("but full scans cannot read archived objects until they are restored")`;

export const costSlots = (s: CostState) => ({
  newGb: String(s.newGb),
  lifecycle: s.lifecycle,
  queries: String(s.queries),
  scan: s.scan,
});

export function costExperiment(id: string): ExperimentDef<CostState, CostResult> {
  return {
    id,
    initial: { newGb: 500, lifecycle: 'none', queries: 50, scan: 'full' },
    controls: [
      {
        kind: 'slider',
        id: 'newGb',
        label: 'New data per month (GB)',
        min: 100,
        max: 1000,
        step: 100,
        get: (s) => s.newGb,
        set: (s, v) => ({ ...s, newGb: v }),
      },
      {
        kind: 'select',
        id: 'lifecycle',
        label: 'Data older than 3 months moves to',
        options: [
          { value: 'none', label: 'Nowhere (stays standard)' },
          { value: 'infrequent', label: 'Infrequent access' },
          { value: 'archive', label: 'Archive' },
        ],
        get: (s) => s.lifecycle,
        set: (s, v) => ({ ...s, lifecycle: v as Lifecycle }),
      },
      {
        kind: 'slider',
        id: 'queries',
        label: 'Dashboard queries per day',
        min: 0,
        max: 200,
        step: 50,
        get: (s) => s.queries,
        set: (s, v) => ({ ...s, queries: v }),
      },
      {
        kind: 'select',
        id: 'scan',
        label: 'Each query reads',
        options: [
          { value: 'full', label: 'The whole table' },
          { value: 'recent', label: 'The last 7 days (partitioned)' },
        ],
        get: (s) => s.scan,
        set: (s, v) => ({ ...s, scan: v as ScanMode }),
      },
    ],
    compute: estimateCost,
    readout: (_s, r) => [
      { label: 'Python: what cost.py prints', value: costPrintout(r) },
      {
        label: 'Estimated bill in month 12',
        value: `$${money(r.total)} per month (example prices)`,
        status: r.archiveConflict ? 'error' : undefined,
      },
    ],
  };
}
