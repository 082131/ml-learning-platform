import type { ExperimentDef, ReadoutItem } from '../types';

/**
 * A reader for GGUF files (version 3), following the GGUF specification in the ggml repository. DEMO_HEX is a
 * 352-byte file written by gguf 0.19.0's GGUFWriter (make_demo_gguf.py in the formats lesson); its parsed
 * offsets and values were checked against gguf.GGUFReader. GGUF_SOURCE is the same reader in Python, and
 * gguf.test.ts checks that it prints exactly what ggufPrintout does.
 */
export const DEMO_HEX =
  '474755460300000002000000000000000300000000000000140000000000000067656e6572616c2e61726368697465637475726508000000040000000000000064656d6f0c0000000000000067656e6572616c2e6e616d6508000000090000000000000074696e792064656d6f100000000000000064656d6f2e626c6f636b5f636f756e7404000000010000000b000000000000006e6f726d2e7765696768740100000004000000000000000000000000000000000000000b0000000000000070726f6a2e77656967687402000000200000000000000001000000000000000800000020000000000000000000000000000000000000000000000000000000000000803f0000003f000080be0000004000000000000000000000000000000000291581899199a1a9b1b9c0c8d0d8e0e8f0f8000810182028303840474f575f676f77000000000000000000000000000000000000000000000000000000000000';

export const TENSOR_TYPES: Record<number, string> = { 0: 'F32', 1: 'F16', 2: 'Q4_0', 8: 'Q8_0', 12: 'Q4_K', 14: 'Q6_K' };
const VALUE_TYPES: Record<number, string> = { 4: 'uint32', 5: 'int32', 6: 'float32', 7: 'bool', 8: 'string', 10: 'uint64' };

export interface GgufField {
  id: string;
  label: string;
  start: number;
  end: number;
  value: string;
}

export const hexToBytes = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)));

export function parseGguf(bytes: Uint8Array): GgufField[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  const fields: GgufField[] = [];
  const u32 = () => ((at += 4), view.getUint32(at - 4, true));
  const u64 = () => ((at += 8), Number(view.getBigUint64(at - 8, true)));
  const str = () => {
    const n = u64();
    at += n;
    return new TextDecoder().decode(bytes.subarray(at - n, at));
  };
  const push = (id: string, label: string, start: number, value: string) =>
    fields.push({ id, label, start, end: at, value });

  at = 4;
  const magic = new TextDecoder().decode(bytes.subarray(0, 4));
  if (magic !== 'GGUF') throw new Error(`not a GGUF file: ${magic}`);
  push('magic', 'magic', 0, "b'GGUF'");
  let s = at;
  push('version', 'version', s, String(u32()));
  s = at;
  const nTensors = u64();
  push('tensor_count', 'tensor_count', s, String(nTensors));
  s = at;
  const nKv = u64();
  push('kv_count', 'kv_count', s, String(nKv));
  let alignment = 32;
  for (let i = 0; i < nKv; i++) {
    s = at;
    const key = str();
    const type = u32();
    let value: string;
    if (type === 8) value = `'${str()}'`;
    else if (type === 4) value = String(u32());
    else if (type === 10) value = String(u64());
    else throw new Error(`value type ${type} is not handled in this reader`);
    if (key === 'general.alignment') alignment = Number(value);
    push(`kv-${i}`, `kv ${key}`, s, `${VALUE_TYPES[type]} ${value}`);
  }
  const tensors: { name: string; offset: number; size: number }[] = [];
  for (let i = 0; i < nTensors; i++) {
    s = at;
    const name = str();
    const nDims = u32();
    const dims = Array.from({ length: nDims }, () => u64());
    const type = u32();
    const offset = u64();
    const count = dims.reduce((a, b) => a * b, 1);
    const size = type === 0 ? count * 4 : type === 8 ? (count / 32) * 34 : NaN;
    tensors.push({ name, offset, size });
    push(`info-${i}`, `tensor_info ${name}`, s, `${TENSOR_TYPES[type]} dims [${dims.join(', ')}] offset ${offset}`);
  }
  const dataStart = Math.ceil(at / alignment) * alignment;
  s = at;
  at = dataStart;
  push('pad', 'padding', s, `${dataStart - s} zero bytes, to a multiple of ${alignment}`);
  tensors.forEach((t, i) => {
    at = dataStart + t.offset + t.size;
    push(`data-${i}`, `data ${t.name}`, dataStart + t.offset, `${t.size} bytes`);
  });
  return fields;
}

export const DEMO_FIELDS = parseGguf(hexToBytes(DEMO_HEX));

export const fieldLine = (f: GgufField) => `${String(f.start).padStart(4, ' ')}..${String(f.end).padEnd(4, ' ')} ${f.label}: ${f.value}`;
export const ggufPrintout = (fields: GgufField[] = DEMO_FIELDS) => fields.map(fieldLine);

export const GGUF_SOURCE = `import math
import struct

data = bytes.fromhex("{{hex}}")                    # demo.gguf, 352 bytes
at = 0


def read(fmt):                                      # little-endian, advancing the position
    global at
    (value,) = struct.unpack_from("<" + fmt, data, at)
    at += struct.calcsize("<" + fmt)
    return value


def string():                                       # uint64 length, then UTF-8 bytes
    global at
    n = read("Q")
    at += n
    return data[at - n:at].decode()


def show(start, label, value):
    print(f"{start:4d}..{at:<4d} {label}: {value}")


assert data[:4] == b"GGUF"
at = 4
show(0, "magic", data[:4])
s = at; show(s, "version", read("I"))
s = at; n_tensors = read("Q"); show(s, "tensor_count", n_tensors)
s = at; n_kv = read("Q"); show(s, "kv_count", n_kv)
types = {4: ("uint32", "I"), 10: ("uint64", "Q")}
for _ in range(n_kv):
    s = at
    key = string()
    t = read("I")
    value = repr(string()) if t == 8 else read(types[t][1])
    show(s, f"kv {key}", f"{'string' if t == 8 else types[t][0]} {value}")
tensors = []
for _ in range(n_tensors):
    s = at
    name = string()
    dims = [read("Q") for _ in range(read("I"))]
    kind = {0: "F32", 8: "Q8_0"}[read("I")]
    offset = read("Q")
    count = math.prod(dims)
    tensors.append((name, offset, count * 4 if kind == "F32" else count // 32 * 34))
    show(s, f"tensor_info {name}", f"{kind} dims {dims} offset {offset}")
data_start = -(-at // 32) * 32                       # round up to the 32-byte alignment
s = at; at = data_start
show(s, "padding", f"{data_start - s} zero bytes, to a multiple of 32")
for name, offset, size in tensors:
    at = data_start + offset + size
    show(data_start + offset, f"data {name}", f"{size} bytes")`;

export interface GgufState {
  part: string;
}

export function ggufReadout(s: GgufState): ReadoutItem[] {
  const f = DEMO_FIELDS.find((x) => x.id === s.part) ?? DEMO_FIELDS[0]!;
  const bytes = DEMO_HEX.slice(f.start * 2, Math.min(f.end, f.start + 24) * 2).match(/../g)!.join(' ');
  return [
    { label: 'Selected part', value: fieldLine(f) },
    { label: `Bytes ${f.start} to ${f.end - 1}${f.end - f.start > 24 ? ' (first 24)' : ''}`, value: bytes },
    { label: 'What the code prints', value: ggufPrintout().join('\n') },
  ];
}

export function ggufExperiment(id: string, initial: GgufState): ExperimentDef<GgufState, GgufField[]> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'part',
        label: 'Part of the file',
        options: DEMO_FIELDS.map((f) => ({ value: f.id, label: f.label })),
        get: (s) => s.part,
        set: (s, v) => ({ ...s, part: v }),
      },
    ],
    compute: () => DEMO_FIELDS,
    readout: (s) => ggufReadout(s),
  };
}
