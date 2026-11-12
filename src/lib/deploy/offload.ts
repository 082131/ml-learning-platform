import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from '../inference/format';

/**
 * How many layers of a GGUF model fit on a GPU with llama.cpp's --n-gpu-layers, and the token rate that
 * follows if generation is limited by reading the weights once per token (an estimate, with the formula
 * shown). Model shapes are Llama 3.1's published configurations; GPU bandwidths are spec-sheet values; CPU
 * bandwidth, the GPU reserve and Q4_K_M's average bits per weight are stated assumptions.
 * OFFLOAD_SOURCE is the same model in Python, checked against CPython in offload.test.ts.
 */
export const MODELS = {
  '8b': { label: 'Llama 3.1 8B', params: 8_030_261_248, layers: 32, vocab: 128_256, hidden: 4096, kvHeads: 8, headDim: 128 },
  '70b': { label: 'Llama 3.1 70B', params: 70_553_706_496, layers: 80, vocab: 128_256, hidden: 8192, kvHeads: 8, headDim: 128 },
} as const;
export const BPW = { Q8_0: 8.5, Q4_K_M: 4.85, Q4_0: 4.5 } as const;
export const GPUS = {
  none: { label: 'no GPU', gib: 0, gbps: 0 },
  '8': { label: '8 GB, 272 GB/s (e.g. RTX 4060)', gib: 8, gbps: 272 },
  '12': { label: '12 GB, 360 GB/s (e.g. RTX 3060 12 GB)', gib: 12, gbps: 360 },
  '24': { label: '24 GB, 1008 GB/s (e.g. RTX 4090)', gib: 24, gbps: 1008 },
} as const;
export const CPU_GBPS = 60; // dual-channel DDR5, an assumption
export const RESERVE_GIB = 0.5; // CUDA context and compute buffers, an assumption
const GIB = 2 ** 30;

export interface OffloadState {
  model: keyof typeof MODELS;
  quant: keyof typeof BPW;
  gpu: keyof typeof GPUS;
  ctx: number;
}
export interface OffloadResult {
  layerGiB: number;
  outputGiB: number;
  weightsGiB: number;
  kvGiB: number;
  ngl: number;
  outputOnGpu: boolean;
  gpuUsedGiB: number;
  gpuReadGiB: number;
  cpuReadGiB: number;
  tokensPerSecond: number;
}

export function runOffload(s: OffloadState): OffloadResult {
  const m = MODELS[s.model];
  const bytes = BPW[s.quant] / 8;
  const embed = m.vocab * m.hidden; // the token embedding table and the output matrix are this size each
  const layer = ((m.params - 2 * embed) * bytes) / m.layers / GIB;
  const output = (embed * bytes) / GIB;
  const kvLayer = (2 * m.kvHeads * m.headDim * s.ctx * 2) / GIB; // keys and values in F16
  const free = GPUS[s.gpu].gib - (GPUS[s.gpu].gib > 0 ? RESERVE_GIB : 0);
  let ngl = 0;
  while (ngl < m.layers && (ngl + 1) * (layer + kvLayer) <= free) ngl += 1;
  const outputOnGpu = ngl === m.layers && ngl * (layer + kvLayer) + output <= free;
  const gpuRead = ngl * layer + (outputOnGpu ? output : 0);
  const cpuRead = (m.layers - ngl) * layer + (outputOnGpu ? 0 : output);
  const gbps = GPUS[s.gpu].gbps;
  const seconds = (gpuRead > 0 ? (gpuRead * GIB) / (gbps * 1e9) : 0) + (cpuRead * GIB) / (CPU_GBPS * 1e9);
  return {
    layerGiB: layer,
    outputGiB: output,
    weightsGiB: (m.params * bytes) / GIB,
    kvGiB: kvLayer * m.layers,
    ngl,
    outputOnGpu,
    gpuUsedGiB: ngl * (layer + kvLayer) + (outputOnGpu ? output : 0),
    gpuReadGiB: gpuRead,
    cpuReadGiB: cpuRead,
    tokensPerSecond: 1 / seconds,
  };
}

export const OFFLOAD_SOURCE = `params, layers, vocab, hidden, kv_heads, head_dim = {{shape}}   # {{label}}
bpw, ctx = {{bpw}}, {{ctx}}                       # bits per weight of the GGUF type, context length
gpu_gib, gpu_gbps, cpu_gbps = {{gpu}}, 60      # GPU memory and bandwidth; CPU RAM bandwidth (assumed)
GIB = 2**30

embed = vocab * hidden                           # token embeddings and the output matrix, each
layer = (params - 2 * embed) * bpw / 8 / layers / GIB
output = embed * bpw / 8 / GIB
kv_layer = 2 * kv_heads * head_dim * ctx * 2 / GIB   # K and V in F16, per layer
free = gpu_gib - 0.5 if gpu_gib else 0           # keep 0.5 GiB for the CUDA context and buffers

ngl = 0
while ngl < layers and (ngl + 1) * (layer + kv_layer) <= free:
    ngl += 1                                     # the largest -ngl that fits
out_gpu = ngl == layers and ngl * (layer + kv_layer) + output <= free
gpu_read = ngl * layer + (output if out_gpu else 0)       # GiB read per token on the GPU
cpu_read = (layers - ngl) * layer + (0 if out_gpu else output)
seconds = (gpu_read * GIB / (gpu_gbps * 1e9) if gpu_read else 0) + cpu_read * GIB / (cpu_gbps * 1e9)
print(f"weights {params * bpw / 8 / GIB:.2f} GiB: {layers} layers of {layer:.3f} GiB, output {output:.3f} GiB")
print(f"KV cache {kv_layer * layers:.2f} GiB at {ctx} tokens")
print(f"-ngl {ngl}: {ngl} of {layers} layers on the GPU, output on the {'GPU' if out_gpu else 'CPU'}")
print(f"per token: {gpu_read:.2f} GiB from GPU memory, {cpu_read:.2f} GiB from RAM")
print(f"estimate: {1 / seconds:.1f} tokens/s")`;

export const offloadSlots = (s: OffloadState): Record<string, string> => {
  const m = MODELS[s.model];
  const g = GPUS[s.gpu];
  return {
    shape: [m.params, m.layers, m.vocab, m.hidden, m.kvHeads, m.headDim].join(', '),
    label: m.label,
    bpw: String(BPW[s.quant]),
    ctx: String(s.ctx),
    gpu: `${g.gib}, ${g.gbps}`,
  };
};

export function offloadPrintout(s: OffloadState, r: OffloadResult): string[] {
  const m = MODELS[s.model];
  return [
    `weights ${pyFixed(r.weightsGiB, 2)} GiB: ${m.layers} layers of ${pyFixed(r.layerGiB, 3)} GiB, output ${pyFixed(r.outputGiB, 3)} GiB`,
    `KV cache ${pyFixed(r.kvGiB, 2)} GiB at ${s.ctx} tokens`,
    `-ngl ${r.ngl}: ${r.ngl} of ${m.layers} layers on the GPU, output on the ${r.outputOnGpu ? 'GPU' : 'CPU'}`,
    `per token: ${pyFixed(r.gpuReadGiB, 2)} GiB from GPU memory, ${pyFixed(r.cpuReadGiB, 2)} GiB from RAM`,
    `estimate: ${pyFixed(r.tokensPerSecond, 1)} tokens/s`,
  ];
}

export function offloadReadout(s: OffloadState, r: OffloadResult): ReadoutItem[] {
  return [
    { label: 'What the code prints', value: offloadPrintout(s, r).join('\n') },
    {
      label: 'Command',
      value: `llama-server -m model-${s.quant}.gguf -c ${s.ctx} -ngl ${r.ngl}`,
    },
  ];
}

export function offloadExperiment(id: string, initial: OffloadState): ExperimentDef<OffloadState, OffloadResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'model',
        label: 'Model',
        options: Object.entries(MODELS).map(([value, m]) => ({ value, label: m.label })),
        get: (s) => s.model,
        set: (s, v) => ({ ...s, model: v as OffloadState['model'] }),
      },
      {
        kind: 'select',
        id: 'quant',
        label: 'GGUF type',
        options: [
          { value: 'Q8_0', label: 'Q8_0 (8.5 bits)' },
          { value: 'Q4_K_M', label: 'Q4_K_M (about 4.85 bits)' },
          { value: 'Q4_0', label: 'Q4_0 (4.5 bits)' },
        ],
        get: (s) => s.quant,
        set: (s, v) => ({ ...s, quant: v as OffloadState['quant'] }),
      },
      {
        kind: 'select',
        id: 'gpu',
        label: 'GPU',
        options: Object.entries(GPUS).map(([value, g]) => ({ value, label: g.label })),
        get: (s) => s.gpu,
        set: (s, v) => ({ ...s, gpu: v as OffloadState['gpu'] }),
      },
      {
        kind: 'select',
        id: 'ctx',
        label: 'Context (-c, tokens)',
        options: ['4096', '8192', '32768', '131072'].map((v) => ({ value: v, label: v })),
        get: (s) => String(s.ctx),
        set: (s, v) => ({ ...s, ctx: Number(v) }),
      },
    ],
    compute: runOffload,
    readout: offloadReadout,
  };
}
