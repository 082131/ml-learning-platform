import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from '../inference/format';

/**
 * Contiguous versus paged KV-cache allocation for Llama 3.1 8B in F16 (128 KiB per token), on a fixed workload
 * of 256 requests whose total lengths (prompt plus output) run from 200 to 2,000 tokens. Contiguous allocation
 * reserves max_model_len tokens per sequence; paged allocation (as in vLLM's PagedAttention) hands out blocks of
 * block_size tokens as needed. A stated model: requests are admitted in order and none finishes.
 * PAGED_SOURCE is the same model in Python, checked against CPython in pagedKv.test.ts.
 */
export const REQUESTS = 256;
export const KV_BYTES_PER_TOKEN = 2 * 32 * 8 * 128 * 2; // K and V × layers × kv_heads × head_dim × 2 bytes
export const lengthOf = (i: number) => 200 + ((i * 7919) % 1801);
const GIB = 2 ** 30;

export interface PagedState {
  budget: number;
  maxLen: number;
  block: number;
}
export interface PagedResult {
  contiguous: number;
  contiguousUse: number;
  paged: number;
  pagedUse: number;
  blocks: number;
  /** Blocks used by the first few sequences, with the tokens in the last block. */
  sample: { tokens: number; blocks: number }[];
}

export function runPaged(s: PagedState): PagedResult {
  const lengths = Array.from({ length: REQUESTS }, (_, i) => lengthOf(i));
  const budget = s.budget * GIB;
  const contiguous = Math.min(REQUESTS, Math.floor(budget / (s.maxLen * KV_BYTES_PER_TOKEN)));
  const cTokens = lengths.slice(0, contiguous).reduce((a, b) => a + b, 0);
  const blocks = Math.floor(budget / (s.block * KV_BYTES_PER_TOKEN));
  let used = 0;
  let paged = 0;
  let pTokens = 0;
  for (const n of lengths) {
    const need = Math.ceil(n / s.block);
    if (used + need > blocks) break;
    used += need;
    paged += 1;
    pTokens += n;
  }
  return {
    contiguous,
    contiguousUse: contiguous ? cTokens / (contiguous * s.maxLen) : 0,
    paged,
    pagedUse: used ? pTokens / (used * s.block) : 0,
    blocks,
    sample: lengths.slice(0, 4).map((tokens) => ({ tokens, blocks: Math.ceil(tokens / s.block) })),
  };
}

export const PAGED_SOURCE = `import math

budget_gib, max_len, block = {{budget}}, {{maxLen}}, {{block}}   # KV memory, vLLM max_model_len, block_size
per_token = 2 * 32 * 8 * 128 * 2                    # Llama 3.1 8B, F16: 131,072 bytes per token
lengths = [200 + (i * 7919) % 1801 for i in range(256)]   # 256 requests, 200 to 2,000 tokens each
budget = budget_gib * 2**30

# Contiguous: every sequence reserves max_len tokens up front
contiguous = min(len(lengths), budget // (max_len * per_token))
c_use = sum(lengths[:contiguous]) / (contiguous * max_len) if contiguous else 0

# Paged: blocks of block tokens, allocated as the sequence grows
total_blocks = budget // (block * per_token)
used = paged = tokens = 0
for n in lengths:
    need = math.ceil(n / block)
    if used + need > total_blocks:
        break
    used, paged, tokens = used + need, paged + 1, tokens + n
p_use = tokens / (used * block) if used else 0

print(f"KV memory {budget_gib} GiB = {total_blocks} blocks of {block} tokens")
print(f"contiguous: {contiguous} sequences, {c_use:.1%} of reserved memory holds tokens")
print(f"paged:      {paged} sequences, {p_use:.1%} of allocated blocks holds tokens")`;

export const pagedSlots = (s: PagedState): Record<string, string> => ({
  budget: String(s.budget),
  maxLen: String(s.maxLen),
  block: String(s.block),
});

export const pagedPrintout = (s: PagedState, r: PagedResult): string[] => [
  `KV memory ${s.budget} GiB = ${r.blocks} blocks of ${s.block} tokens`,
  `contiguous: ${r.contiguous} sequences, ${pyFixed(r.contiguousUse * 100, 1)}% of reserved memory holds tokens`,
  `paged:      ${r.paged} sequences, ${pyFixed(r.pagedUse * 100, 1)}% of allocated blocks holds tokens`,
];

export function pagedReadout(s: PagedState, r: PagedResult): ReadoutItem[] {
  return [
    { label: 'What the code prints', value: pagedPrintout(s, r).join('\n') },
    {
      label: 'Sequences running at once',
      value: r.contiguous ? `${pyFixed(r.paged / r.contiguous, 1)}× more with paging` : `${r.paged} paged, none contiguous`,
    },
  ];
}

export function pagedExperiment(id: string, initial: PagedState): ExperimentDef<PagedState, PagedResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'budget',
        label: 'GPU memory left for the KV cache (GiB)',
        min: 2,
        max: 60,
        step: 2,
        get: (s) => s.budget,
        set: (s, v) => ({ ...s, budget: v }),
      },
      {
        kind: 'select',
        id: 'maxLen',
        label: 'max_model_len (tokens)',
        options: ['2048', '8192', '32768'].map((v) => ({ value: v, label: v })),
        get: (s) => String(s.maxLen),
        set: (s, v) => ({ ...s, maxLen: Number(v) }),
      },
      {
        kind: 'select',
        id: 'block',
        label: 'block_size (tokens)',
        options: ['8', '16', '32'].map((v) => ({ value: v, label: v })),
        get: (s) => String(s.block),
        set: (s, v) => ({ ...s, block: Number(v) }),
      },
    ],
    compute: runPaged,
    readout: pagedReadout,
  };
}
