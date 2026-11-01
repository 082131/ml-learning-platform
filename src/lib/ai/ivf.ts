import type { ExperimentDef } from '../types';
import { normal, seededRandom } from '../classical/random';
import { dot } from '../math/vector';

/**
 * An inverted-file (IVF) vector index over seeded synthetic embeddings: k-means splits the vectors into
 * `nlist` clusters, and a query scans only the `nprobe` clusters whose centers are closest. Recall is
 * measured against exact search on the same vectors. Everything is computed in the browser.
 */

export const DIM = 16;
export const N_VECTORS = 3000;
export const N_TOPICS = 40;
export const N_QUERIES = 60;
export const TOP_K = 10;
export const KMEANS_ITERS = 8;

function unit(v: number[]): number[] {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}

export interface VectorSet {
  vectors: number[][];
  queries: number[][];
}

/** Unit vectors around N_TOPICS random topic directions, and queries near randomly chosen vectors. */
export function makeVectors(seed: number, n = N_VECTORS, nq = N_QUERIES, spread = 0.6): VectorSet {
  const rand = seededRandom(seed);
  const topics = Array.from({ length: N_TOPICS }, () =>
    unit(Array.from({ length: DIM }, () => normal(rand))),
  );
  const vectors = Array.from({ length: n }, () => {
    const t = topics[Math.floor(rand() * N_TOPICS)]!;
    return unit(t.map((x) => x + (spread / Math.sqrt(DIM)) * normal(rand) * 1.5));
  });
  const queries = Array.from({ length: nq }, () => {
    const v = vectors[Math.floor(rand() * n)]!;
    return unit(v.map((x) => x + (spread / Math.sqrt(DIM)) * normal(rand)));
  });
  return { vectors, queries };
}

/** Indices of the k largest dot products, best first (ties by index). */
export function topK(
  query: readonly number[],
  vectors: readonly (readonly number[])[],
  ids: readonly number[],
  k: number,
): number[] {
  return ids
    .map((i) => ({ i, s: dot(query, vectors[i]!) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, k)
    .map((x) => x.i);
}

export interface IvfIndex {
  centroids: number[][];
  lists: number[][];
}

/** Spherical k-means: assign by largest dot product, recompute centers as normalized means. */
export function buildIvf(
  vectors: readonly (readonly number[])[],
  nlist: number,
  seed: number,
  iters = KMEANS_ITERS,
): IvfIndex {
  const rand = seededRandom(seed);
  const picked = new Set<number>();
  while (picked.size < nlist) picked.add(Math.floor(rand() * vectors.length));
  let centroids = [...picked].map((i) => [...vectors[i]!]);
  let lists: number[][] = [];
  for (let it = 0; it <= iters; it++) {
    lists = centroids.map(() => []);
    vectors.forEach((v, i) => {
      let best = 0;
      let bestS = -Infinity;
      centroids.forEach((c, j) => {
        const s = dot(v, c);
        if (s > bestS) [best, bestS] = [j, s];
      });
      lists[best]!.push(i);
    });
    if (it === iters) break;
    centroids = centroids.map((c, j) => {
      const members = lists[j]!;
      if (members.length === 0) return c;
      const sum = new Array<number>(c.length).fill(0);
      for (const i of members) vectors[i]!.forEach((x, d) => (sum[d]! += x));
      return unit(sum);
    });
  }
  return { centroids, lists };
}

export function searchIvf(
  index: IvfIndex,
  vectors: readonly (readonly number[])[],
  query: readonly number[],
  nprobe: number,
  k: number,
): { ids: number[]; scanned: number } {
  const probe = topK(
    query,
    index.centroids,
    index.centroids.map((_, j) => j),
    nprobe,
  );
  const ids = probe.flatMap((j) => index.lists[j]!);
  return { ids: topK(query, vectors, ids, k), scanned: ids.length };
}

/** Share of the exact top k that the approximate result also found. */
export function recallAtK(exact: readonly number[], approx: readonly number[]): number {
  const got = new Set(approx);
  return exact.filter((i) => got.has(i)).length / exact.length;
}

export interface IvfPoint {
  nprobe: number;
  recall: number;
  /** Mean vectors compared per query, as a share of all vectors. */
  scannedShare: number;
}

export function ivfCurve(set: VectorSet, index: IvfIndex, maxProbe: number): IvfPoint[] {
  const all = set.vectors.map((_, i) => i);
  const exact = set.queries.map((q) => topK(q, set.vectors, all, TOP_K));
  const points: IvfPoint[] = [];
  for (let p = 1; p <= maxProbe; p++) {
    let recall = 0;
    let scanned = 0;
    set.queries.forEach((q, qi) => {
      const r = searchIvf(index, set.vectors, q, p, TOP_K);
      recall += recallAtK(exact[qi]!, r.ids);
      scanned += r.scanned;
    });
    points.push({
      nprobe: p,
      recall: recall / set.queries.length,
      scannedShare: scanned / set.queries.length / set.vectors.length,
    });
  }
  return points;
}

export interface IvfState {
  nlist: number;
  nprobe: number;
}

export interface IvfResult {
  curve: IvfPoint[];
  current: IvfPoint;
  listSizes: number[];
}

export const NLIST_OPTIONS = [16, 32, 64] as const;
export const MAX_PROBE = 16;

/** Indexes are cached per nlist, so moving nprobe only re-runs the queries. */
export function ivfExperiment(
  id: string,
  seed: number,
  initial: IvfState,
): ExperimentDef<IvfState, IvfResult> {
  let set: VectorSet | undefined;
  const curves = new Map<number, { curve: IvfPoint[]; sizes: number[] }>();
  const curveFor = (nlist: number) => {
    set ??= makeVectors(seed);
    let c = curves.get(nlist);
    if (!c) {
      const index = buildIvf(set.vectors, nlist, seed);
      c = { curve: ivfCurve(set, index, MAX_PROBE), sizes: index.lists.map((l) => l.length) };
      curves.set(nlist, c);
    }
    return c;
  };
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'nlist',
        label: 'Clusters (nlist)',
        options: NLIST_OPTIONS.map((n) => ({ value: String(n), label: String(n) })),
        get: (s) => String(s.nlist),
        set: (s, v) => ({ ...s, nlist: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'nprobe',
        label: 'Clusters searched per query (nprobe)',
        min: 1,
        max: MAX_PROBE,
        get: (s) => s.nprobe,
        set: (s, v) => ({ ...s, nprobe: Math.round(v) }),
      },
    ],
    compute: (s) => {
      const c = curveFor(s.nlist);
      return { curve: c.curve, current: c.curve[Math.min(s.nprobe, MAX_PROBE) - 1]!, listSizes: c.sizes };
    },
    readout: (s, r) => [
      { label: `Recall@${TOP_K}`, value: r.current.recall.toFixed(3) },
      {
        label: 'Vectors compared per query',
        value: `${Math.round(r.current.scannedShare * N_VECTORS)} of ${N_VECTORS} (${(r.current.scannedShare * 100).toFixed(1)}%)`,
      },
      { label: 'Cluster centers compared first', value: String(s.nlist) },
    ],
  };
}
