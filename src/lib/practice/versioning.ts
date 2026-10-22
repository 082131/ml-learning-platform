import type { ExperimentDef, ReadoutItem } from '../types';
import type { FlowEdge, FlowNode, NodeStatus } from '../viz/flow';
import { pyJson, pyRound } from './pyFormat';
import { shortHash } from './sha256';

/**
 * Content-addressed versions for the versioning lesson. Every artifact is identified by a hash of its
 * exact bytes; the run by a hash of its inputs. Mirrors the lesson's Python (`short_hash`, `fit_line`).
 */
export type Row = [km: number, minutes: number];

export interface VersioningState {
  rows: Row[];
  /** null keeps every row ("None" in Python). */
  dropOverMinutes: number | null;
}

export type Fit = { ok: true; w: number; b: number; kept: number } | { ok: false; kept: number };

export function fitLine(rows: Row[], dropOverMinutes: number | null): Fit {
  const kept = dropOverMinutes === null ? rows : rows.filter(([, m]) => m <= dropOverMinutes);
  const n = kept.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const [km, m] of kept) {
    sx += km;
    sy += m;
    sxx += km * km;
    sxy += km * m;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { ok: false, kept: n };
  const w = (n * sxy - sx * sy) / denom;
  return { ok: true, w, b: (sy - w * sx) / n, kept: n };
}

export const dataCsv = (rows: Row[]) => `km,minutes\n${rows.map(([k, m]) => `${k},${m}\n`).join('')}`;
export const configJson = (s: VersioningState) =>
  pyJson({ drop_over_minutes: s.dropOverMinutes === null ? null : { int: s.dropOverMinutes } });
/** The data string as the Python literal on the `data_csv = ...` line. */
export const dataCsvLiteral = (rows: Row[]) => JSON.stringify(dataCsv(rows));

export interface Versions {
  data: string;
  config: string;
  run: string;
  fit: Fit;
  modelJson?: string;
  model?: string;
}

export function computeVersions(s: VersioningState): Versions {
  const data = shortHash(dataCsv(s.rows));
  const config = shortHash(configJson(s));
  const fit = fitLine(s.rows, s.dropOverMinutes);
  const base = { data, config, run: shortHash(data + config), fit };
  if (!fit.ok) return base;
  const modelJson = pyJson({ w: pyRound(fit.w), b: pyRound(fit.b) });
  return { ...base, modelJson, model: shortHash(modelJson) };
}

export interface VersioningResult {
  now: Versions;
  /** The versions of the lesson's starting state, standing in for the model registered as v1. */
  registered: Versions;
}

export type ArtifactKey = 'data' | 'config' | 'run' | 'model';
export const changed = (r: VersioningResult, key: ArtifactKey) => r.now[key] !== r.registered[key];

const status = (r: VersioningResult, key: ArtifactKey): NodeStatus =>
  key === 'model' && !r.now.fit.ok ? 'error' : changed(r, key) ? 'warn' : 'ok';

/** The lineage graph: data and config feed the run (with the code, pinned by git), the run produces the model. */
export function lineage(r: VersioningResult): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const W = 150;
  const nodes: FlowNode[] = [
    { id: 'data', label: 'data.csv', detail: r.now.data, x: 0, y: 0, w: W, status: status(r, 'data') },
    {
      id: 'config',
      label: 'config.json',
      detail: r.now.config,
      x: 0,
      y: 90,
      w: W,
      status: status(r, 'config'),
    },
    { id: 'code', label: 'train.py', detail: 'git commit', x: 0, y: 180, w: W, status: 'idle' },
    { id: 'run', label: 'training run', detail: r.now.run, x: 220, y: 90, w: W, status: status(r, 'run') },
    {
      id: 'model',
      label: 'model.json',
      detail: r.now.model ?? 'not produced',
      x: 440,
      y: 90,
      w: W,
      status: status(r, 'model'),
    },
  ];
  const edges: FlowEdge[] = [
    { from: 'data', to: 'run', fromSide: 'right', toSide: 'left', active: changed(r, 'data') },
    { from: 'config', to: 'run', fromSide: 'right', toSide: 'left', active: changed(r, 'config') },
    { from: 'code', to: 'run', fromSide: 'right', toSide: 'left' },
    { from: 'run', to: 'model', label: 'produces', active: changed(r, 'model') },
  ];
  return { nodes, edges };
}

/** The four lines the lesson's Python prints (or its error). */
export function printed(v: Versions): string[] {
  const lines = [`data   ${v.data}`, `config ${v.config}`, `run    ${v.run}`];
  return v.fit.ok ? [...lines, `model  ${v.model} ${v.modelJson}`] : ['ZeroDivisionError: division by zero'];
}

function readout(s: VersioningState, r: VersioningResult): ReadoutItem[] {
  const v = r.now;
  const same = (k: ArtifactKey) => (changed(r, k) ? 'changed since v1' : 'same as v1');
  if (!v.fit.ok)
    return [
      {
        label: 'The code stops with',
        value: 'ZeroDivisionError: division by zero',
        status: 'error',
      },
      {
        label: 'Why',
        value: `fit_line needs at least two different distances; ${v.fit.kept} row(s) are left after cleaning`,
      },
    ];
  return [
    { label: `data (${same('data')})`, value: `data   ${v.data}` },
    { label: `config (${same('config')})`, value: `config ${v.config}` },
    { label: `run (${same('run')})`, value: `run    ${v.run}` },
    { label: `model (${same('model')})`, value: `model  ${v.model} ${v.modelJson}` },
    { label: 'Rows used for the fit', value: `${v.fit.kept} of ${s.rows.length}` },
  ];
}

export const KM_RANGE: [number, number] = [1, 30];
export const MINUTES_RANGE: [number, number] = [1, 180];
const DROP_OPTIONS = ['none', '90', '60'];

export function versioningExperiment(
  id: string,
  initial: VersioningState,
): ExperimentDef<VersioningState, VersioningResult> {
  const registered = computeVersions(initial);
  return {
    id,
    initial,
    controls: [
      {
        kind: 'matrix-cell',
        id: 'rows',
        label: 'rows',
        min: KM_RANGE[0],
        max: MINUTES_RANGE[1],
        integer: true,
        get: (s) => s.rows,
        set: (s, i, j, value) => ({
          ...s,
          rows: s.rows.map((r, k) => (k === i ? (r.map((x, c) => (c === j ? value : x)) as Row) : r)),
        }),
      },
      {
        kind: 'select',
        id: 'drop',
        label: 'config: drop_over_minutes',
        options: DROP_OPTIONS.map((o) => ({ value: o, label: o === 'none' ? 'None (keep all)' : o })),
        get: (s) => (s.dropOverMinutes === null ? 'none' : String(s.dropOverMinutes)),
        set: (s, v) => ({ ...s, dropOverMinutes: v === 'none' ? null : Number(v) }),
      },
    ],
    compute: (s) => ({ now: computeVersions(s), registered }),
    readout,
  };
}
