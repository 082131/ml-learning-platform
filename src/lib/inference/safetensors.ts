import type { ExperimentDef, ReadoutItem } from '../types';

/**
 * The safetensors file layout, computed the way the safetensors library writes it: an 8-byte little-endian
 * header length, a JSON header (with "__metadata__" first, then tensors in storage order) padded with spaces
 * to a multiple of 8, then the raw tensor bytes. Storage order is by dtype (larger alignment first), then by
 * name. Checked byte for byte against safetensors 0.8 in safetensors.test.ts.
 */
export type StDtype = 'F64' | 'I64' | 'F32' | 'F16' | 'BF16' | 'I32' | 'I8' | 'U8';

export const DTYPE_BYTES: Record<StDtype, number> = { F64: 8, I64: 8, F32: 4, I32: 4, F16: 2, BF16: 2, I8: 1, U8: 1 };

/** The library sorts dtypes in this order, largest first (the order of its Dtype enum). */
const DTYPE_RANK: StDtype[] = ['U8', 'I8', 'F16', 'BF16', 'I32', 'F32', 'F64', 'I64'];

export interface TensorSpec {
  name: string;
  dtype: StDtype;
  shape: number[];
}

export interface StEntry extends TensorSpec {
  start: number;
  end: number;
}

export interface StLayout {
  entries: StEntry[];
  headerJson: string;
  /** Header length including padding, as stored in the first 8 bytes. */
  headerLen: number;
  padding: number;
  dataBytes: number;
  fileBytes: number;
}

const numel = (shape: number[]) => shape.reduce((a, b) => a * b, 1);

export function layout(tensors: TensorSpec[], metadata?: Record<string, string>): StLayout {
  const sorted = [...tensors].sort(
    (a, b) => DTYPE_RANK.indexOf(b.dtype) - DTYPE_RANK.indexOf(a.dtype) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
  let offset = 0;
  const entries = sorted.map((t) => {
    const size = numel(t.shape) * DTYPE_BYTES[t.dtype];
    const e = { ...t, start: offset, end: offset + size };
    offset += size;
    return e;
  });
  const parts: string[] = [];
  if (metadata) parts.push(`"__metadata__":${JSON.stringify(metadata)}`);
  for (const e of entries)
    parts.push(`${JSON.stringify(e.name)}:{"dtype":"${e.dtype}","shape":[${e.shape.join(',')}],"data_offsets":[${e.start},${e.end}]}`);
  const json = `{${parts.join(',')}}`;
  const raw = new TextEncoder().encode(json).length;
  const padding = (8 - (raw % 8)) % 8;
  return {
    entries,
    headerJson: json,
    headerLen: raw + padding,
    padding,
    dataBytes: offset,
    fileBytes: 8 + raw + padding + offset,
  };
}

export type Scenario = 'match' | 'prefix' | 'resized' | 'missing';
export type NpDtype = 'float32' | 'float16' | 'float64';

export interface CheckpointState {
  dtype: NpDtype;
  scenario: Scenario;
}

const NP_TO_ST: Record<NpDtype, StDtype> = { float32: 'F32', float16: 'F16', float64: 'F64' };

/** The model the checkpoint is loaded into: the digits classifier, 64 → 16 → 10. */
export const EXPECTED: [string, number[]][] = [
  ['fc1.weight', [16, 64]],
  ['fc1.bias', [16]],
  ['fc2.weight', [10, 16]],
  ['fc2.bias', [10]],
];

export const SCENARIO_LABEL: Record<Scenario, string> = {
  match: 'Saved from the same model',
  prefix: 'Saved from a DataParallel wrapper ("module." prefix)',
  resized: 'Saved from a model with 32 hidden units',
  missing: 'Saved from a model without fc2’s bias',
};

export function checkpointTensors(s: CheckpointState): TensorSpec[] {
  const dtype = NP_TO_ST[s.dtype];
  const hidden = s.scenario === 'resized' ? 32 : 16;
  const prefix = s.scenario === 'prefix' ? 'module.' : '';
  const t: TensorSpec[] = [
    { name: `${prefix}fc1.weight`, dtype, shape: [hidden, 64] },
    { name: `${prefix}fc1.bias`, dtype, shape: [hidden] },
    { name: `${prefix}fc2.weight`, dtype, shape: [10, hidden] },
  ];
  if (s.scenario !== 'missing') t.push({ name: `${prefix}fc2.bias`, dtype, shape: [10] });
  return t;
}

export interface CheckResult {
  layout: StLayout;
  missing: string[];
  unexpected: string[];
  wrongShape: string[];
  ok: boolean;
}

export function checkCheckpoint(s: CheckpointState): CheckResult {
  const l = layout(checkpointTensors(s));
  const names = new Map(l.entries.map((e) => [e.name, e.shape]));
  const expected = new Map(EXPECTED);
  const missing = EXPECTED.map(([k]) => k).filter((k) => !names.has(k));
  const unexpected = l.entries.map((e) => e.name).filter((k) => !expected.has(k));
  const wrongShape = EXPECTED.filter(([k, shape]) => names.has(k) && names.get(k)!.join() !== shape.join()).map(([k]) => k);
  return { layout: l, missing, unexpected, wrongShape, ok: !missing.length && !unexpected.length && !wrongShape.length };
}

export const SAVE_SOURCE = `import numpy as np
from safetensors.numpy import save_file

hidden = {{hidden}}
tensors = {
    "{{prefix}}fc1.weight": np.zeros((hidden, 64), dtype=np.{{dtype}}),
    "{{prefix}}fc1.bias": np.zeros(hidden, dtype=np.{{dtype}}),
    "{{prefix}}fc2.weight": np.zeros((10, hidden), dtype=np.{{dtype}}),
{{bias2}}
}
save_file(tensors, "model.safetensors")`;

export function saveSlots(s: CheckpointState): Record<string, string> {
  const prefix = s.scenario === 'prefix' ? 'module.' : '';
  return {
    hidden: s.scenario === 'resized' ? '32' : '16',
    prefix,
    dtype: s.dtype,
    bias2:
      s.scenario === 'missing'
        ? '    # this model had no bias in fc2, so none is saved'
        : `    "${prefix}fc2.bias": np.zeros(10, dtype=np.${s.dtype}),`,
  };
}

export const INSPECT_SOURCE = `import json
import struct

with open("model.safetensors", "rb") as f:
    n = struct.unpack("<Q", f.read(8))[0]        # header length: 8 bytes, little-endian
    header = json.loads(f.read(n))               # names, dtypes, shapes, byte offsets
header.pop("__metadata__", None)

print("header bytes:", n)
for name, info in header.items():
    start, end = info["data_offsets"]
    print(f"{name:18s} {info['dtype']:4s} {str(info['shape']):9s} bytes {start}-{end}")

expected = {"fc1.weight": [16, 64], "fc1.bias": [16], "fc2.weight": [10, 16], "fc2.bias": [10]}
print("missing:    ", [k for k in expected if k not in header])
print("unexpected: ", [k for k in header if k not in expected])
print("wrong shape:", [k for k in expected if k in header and header[k]["shape"] != expected[k]])`;

const pyList = (xs: string[]) => `[${xs.map((x) => `'${x}'`).join(', ')}]`;
const pyShape = (s: number[]) => `[${s.join(', ')}]`;

export function inspectPrintout(r: CheckResult): string[] {
  return [
    `header bytes: ${r.layout.headerLen}`,
    ...r.layout.entries.map(
      (e) => `${e.name.padEnd(18)} ${e.dtype.padEnd(4)} ${pyShape(e.shape).padEnd(9)} bytes ${e.start}-${e.end}`,
    ),
    `missing:     ${pyList(r.missing)}`,
    `unexpected:  ${pyList(r.unexpected)}`,
    `wrong shape: ${pyList(r.wrongShape)}`,
  ];
}

export function checkpointReadout(s: CheckpointState, r: CheckResult): ReadoutItem[] {
  const verdict = r.ok
    ? s.dtype === 'float32'
      ? 'Loads: every name and shape matches.'
      : `Loads: names and shapes match. The ${s.dtype} values are converted to the model’s float32 when copied in.`
    : 'Does not load with strict checking: ' +
      [
        r.missing.length && `${r.missing.length} missing`,
        r.unexpected.length && `${r.unexpected.length} unexpected`,
        r.wrongShape.length && `${r.wrongShape.length} with the wrong shape`,
      ]
        .filter(Boolean)
        .join(', ') +
      '.';
  return [
    { label: 'What inspect.py prints', value: inspectPrintout(r).join('\n') },
    { label: 'File size', value: `8 + ${r.layout.headerLen} + ${r.layout.dataBytes} = ${r.layout.fileBytes} bytes (length, header, data)` },
    { label: 'Loading into the 64 → 16 → 10 model', value: verdict, status: r.ok ? 'ok' : 'error' },
  ];
}

export function checkpointExperiment(id: string, initial: CheckpointState): ExperimentDef<CheckpointState, CheckResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'scenario',
        label: 'Checkpoint',
        options: (Object.keys(SCENARIO_LABEL) as Scenario[]).map((v) => ({ value: v, label: SCENARIO_LABEL[v] })),
        get: (s) => s.scenario,
        set: (s, v) => ({ ...s, scenario: v as Scenario }),
      },
      {
        kind: 'select',
        id: 'dtype',
        label: 'Stored dtype',
        options: [
          { value: 'float32', label: 'float32 (F32, 4 bytes)' },
          { value: 'float16', label: 'float16 (F16, 2 bytes)' },
          { value: 'float64', label: 'float64 (F64, 8 bytes)' },
        ],
        get: (s) => s.dtype,
        set: (s, v) => ({ ...s, dtype: v as NpDtype }),
      },
    ],
    compute: checkCheckpoint,
    readout: checkpointReadout,
  };
}
