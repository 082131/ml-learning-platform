// GPU memory needed to fine-tune, by method. Every number is an estimate with its formula stated:
// - Full fine-tuning with mixed precision and AdamW: 16 bytes per parameter (2 BF16 weights + 2 BF16 gradients
//   + 4 FP32 master weights + 8 for Adam's two FP32 moments), as in the ZeRO paper (Rajbhandari et al. 2020).
// - LoRA: frozen BF16 weights (2 bytes per parameter) plus 16 bytes per adapter parameter.
// - QLoRA: frozen NF4 weights. 4 bits per weight plus block constants; with double quantization the constants cost
//   about 0.127 bits per weight (Dettmers et al. 2023), so 4.127 / 8 bytes per parameter. In practice a few layers
//   (embeddings, the output head) stay in 16 bit; we ignore that here.
// - Activations: about 34 · s · b · h bytes per layer for BF16 (Korthikanti et al. 2022) when attention scores are
//   not stored (FlashAttention). With activation checkpointing only each layer's input is kept (2 · s · b · h bytes)
//   plus one layer recomputed at a time.
// - Logits: s · b · vocab · 4 bytes (FP32 logits for the loss), a large item for 128k vocabularies.
import { getModel, loraCount, type ModelShape, type Targets } from './lora';

export type Method = 'full' | 'lora' | 'qlora';
export const GIB = 1024 ** 3;

export interface MemoryInput {
  model: string;
  seqLen: number;
  batch: number;
  checkpointing: boolean;
  rank: number;
  targets?: Targets;
}

export interface MemoryParts {
  weights: number;
  gradients: number;
  optimizer: number;
  activations: number;
  logits: number;
}

export interface MemoryEstimate {
  method: Method;
  parts: MemoryParts;
  total: number;
  trainable: number;
}

export const NF4_BYTES_PER_PARAM = 4.127 / 8;

export function activationBytes(m: ModelShape, seqLen: number, batch: number, checkpointing: boolean): number {
  const perLayerFull = 34 * seqLen * batch * m.hidden;
  if (!checkpointing) return m.layers * perLayerFull;
  return m.layers * 2 * seqLen * batch * m.hidden + perLayerFull;
}

export function estimateMemory(method: Method, x: MemoryInput): MemoryEstimate {
  const m = getModel(x.model);
  const N = m.totalParams;
  const adapter = loraCount(m, x.rank, x.targets ?? 'all-linear').trainable;
  const activations = activationBytes(m, x.seqLen, x.batch, x.checkpointing);
  const logits = x.seqLen * x.batch * m.vocab * 4;
  let parts: MemoryParts;
  let trainable: number;
  if (method === 'full') {
    trainable = N;
    parts = { weights: 2 * N, gradients: 2 * N, optimizer: 12 * N, activations, logits };
  } else {
    trainable = adapter;
    const base = method === 'lora' ? 2 * N : NF4_BYTES_PER_PARAM * N;
    // adapter: 2 weights + 2 grads + 4 master + 8 Adam = 16 bytes per adapter parameter
    parts = { weights: base + 2 * adapter, gradients: 2 * adapter, optimizer: 12 * adapter, activations, logits };
  }
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { method, parts, total, trainable };
}

export const GPU_MEMORY = [
  { id: '24', label: '24 GB (RTX 4090 class)', bytes: 24e9 },
  { id: '48', label: '48 GB (L40S / RTX 6000 class)', bytes: 48e9 },
  { id: '80', label: '80 GB (A100 / H100)', bytes: 80e9 },
];

export const gb = (bytes: number, digits = 1): string => `${(bytes / 1e9).toFixed(digits)} GB`;
