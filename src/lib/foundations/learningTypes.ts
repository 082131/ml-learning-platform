import { complete, PENGUINS, SPECIES, type Species } from '../classical/penguins';
import type { ExperimentDef, ReadoutItem } from '../types';

/** A penguin described by two features, both in millimetres, so plain distances are fair. */
export interface BillPoint {
  row: number;
  x: number; // bill length (mm)
  y: number; // bill depth (mm)
  species: Species;
}

/** The 342 penguins with both bill measurements (2 rows of the 344 have none). */
export const BILLS: BillPoint[] = complete(PENGUINS, ['bill_length_mm', 'bill_depth_mm']).map((p) => ({
  row: p.row,
  x: p.bill_length_mm!,
  y: p.bill_depth_mm!,
  species: p.species,
}));

type XY = { x: number; y: number };
const dist2 = (a: XY, b: XY) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const mean = (pts: XY[]): XY => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});
/** Index of the closest center; ties go to the lower index (as NumPy's argmin). */
export const nearest = (p: XY, centers: XY[]) =>
  centers.reduce((best, c, i) => (dist2(p, c) < dist2(p, centers[best]!) ? i : best), 0);

/** Supervised: the average bill of each species, learned from labeled penguins. */
export const speciesCentroids = (pts: BillPoint[]): Record<Species, XY> =>
  Object.fromEntries(SPECIES.map((s) => [s, mean(pts.filter((p) => p.species === s))])) as Record<
    Species,
    XY
  >;

/** Predicts the species whose average bill is closest (a nearest-centroid classifier). */
export function predictSpecies(p: XY, centroids: Record<Species, XY>): Species {
  return SPECIES[
    nearest(
      p,
      SPECIES.map((s) => centroids[s]),
    )
  ]!;
}

/**
 * Starting centers without labels: the point closest to the overall mean, then repeatedly the point
 * farthest from every center chosen so far. Deterministic, so the lesson always shows the same run.
 */
export function spreadInit(pts: XY[], k: number): XY[] {
  const m = mean(pts);
  const centers = [pts[nearest(m, pts)]!];
  while (centers.length < k) {
    const far = pts.reduce(
      (best, p, i) => {
        const d = Math.min(...centers.map((c) => dist2(p, c)));
        return d > best.d ? { i, d } : best;
      },
      { i: 0, d: -1 },
    );
    centers.push(pts[far.i]!);
  }
  return centers.map((c) => ({ x: c.x, y: c.y }));
}

/** k-means: assign every point to its nearest center, move each center to its points' mean, repeat. */
export function kmeans(
  pts: XY[],
  k: number,
  maxIter = 100,
): { centers: XY[]; labels: number[]; iterations: number } {
  let centers = spreadInit(pts, k);
  let labels = pts.map((p) => nearest(p, centers));
  for (let it = 1; it <= maxIter; it++) {
    centers = centers.map((c, j) => {
      const members = pts.filter((_, i) => labels[i] === j);
      return members.length ? mean(members) : c;
    });
    const next = pts.map((p) => nearest(p, centers));
    if (next.every((l, i) => l === labels[i])) return { centers, labels, iterations: it };
    labels = next;
  }
  return { centers, labels, iterations: maxIter };
}

/** For each cluster, its size and the species most of its members have (looked up only afterwards). */
export function describeClusters(pts: BillPoint[], labels: number[], k: number) {
  return Array.from({ length: k }, (_, j) => {
    const members = pts.filter((_, i) => labels[i] === j);
    const counts = SPECIES.map((s) => members.filter((p) => p.species === s).length);
    const top = counts.indexOf(Math.max(...counts));
    return { size: members.length, majority: SPECIES[top]!, majorityCount: counts[top]! };
  });
}

export type Setup = 'supervised' | 'unsupervised';

export interface TypesState {
  setup: Setup;
  /** The new penguin's bill, in mm. */
  bill: XY;
  k: number;
}

export interface TypesResult {
  centroids: Record<Species, XY>;
  prediction: Species;
  clusters: ReturnType<typeof kmeans>;
  summary: ReturnType<typeof describeClusters>;
  /** The new penguin's cluster (unsupervised) */
  cluster: number;
}

export const CENTROIDS = speciesCentroids(BILLS);
export const BILL_LIMITS = { x: { min: 32, max: 60 }, y: { min: 13, max: 22 } } as const;
export const K_LIMITS = { min: 2, max: 4 } as const;

const kmeansCache = new Map<number, ReturnType<typeof kmeans>>();
const clustersFor = (k: number) => {
  if (!kmeansCache.has(k)) kmeansCache.set(k, kmeans(BILLS, k));
  return kmeansCache.get(k)!;
};

export function computeTypes(s: TypesState): TypesResult {
  const clusters = clustersFor(s.k);
  return {
    centroids: CENTROIDS,
    prediction: predictSpecies(s.bill, CENTROIDS),
    clusters,
    summary: describeClusters(BILLS, clusters.labels, s.k),
    cluster: nearest(s.bill, clusters.centers),
  };
}

const mm = (n: number) => `${n.toFixed(1)} mm`;

export function typesReadout(s: TypesState, r: TypesResult): ReadoutItem[] {
  const bill = `length ${mm(s.bill.x)}, depth ${mm(s.bill.y)}`;
  if (s.setup === 'supervised')
    return [
      { label: 'New penguin’s bill', value: bill },
      ...SPECIES.map((sp) => ({
        label: `Average ${sp} bill (from ${BILLS.filter((p) => p.species === sp).length} labeled penguins)`,
        value: `length ${mm(r.centroids[sp].x)}, depth ${mm(r.centroids[sp].y)}`,
      })),
      { label: 'Prediction: the closest average', value: r.prediction },
    ];
  return [
    { label: 'New penguin’s bill', value: bill },
    { label: `k-means with k = ${s.k}`, value: `converged after ${r.clusters.iterations} rounds` },
    ...r.summary.map((c, j) => ({
      label: `Cluster ${j + 1}`,
      value: `${c.size} penguins; afterwards we checked: ${c.majorityCount} are ${c.majority}`,
    })),
    { label: 'New penguin falls in', value: `cluster ${r.cluster + 1} (a group, not a name)` },
  ];
}

export function typesExperiment(id: string, initial: TypesState): ExperimentDef<TypesState, TypesResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'setup',
        label: 'What the program is given',
        options: [
          { value: 'supervised', label: 'Bills and species labels (supervised)' },
          { value: 'unsupervised', label: 'Bills only, no labels (unsupervised)' },
        ],
        get: (s) => s.setup,
        set: (s, v) => ({ ...s, setup: v as Setup }),
      },
      {
        kind: 'slider',
        id: 'bill-length',
        label: 'New penguin: bill length (mm)',
        ...BILL_LIMITS.x,
        step: 0.5,
        get: (s) => s.bill.x,
        set: (s, v) => ({ ...s, bill: { ...s.bill, x: v } }),
      },
      {
        kind: 'slider',
        id: 'bill-depth',
        label: 'New penguin: bill depth (mm)',
        ...BILL_LIMITS.y,
        step: 0.5,
        get: (s) => s.bill.y,
        set: (s, v) => ({ ...s, bill: { ...s.bill, y: v } }),
      },
      {
        kind: 'slider',
        id: 'k',
        label: 'Unsupervised: number of clusters (k)',
        ...K_LIMITS,
        get: (s) => s.k,
        set: (s, v) => ({ ...s, k: v }),
      },
    ],
    compute: computeTypes,
    readout: typesReadout,
  };
}
