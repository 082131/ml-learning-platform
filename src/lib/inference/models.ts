/**
 * Decoder-only transformer configurations for the memory lesson, copied from the models' published
 * configs (see `source`). Parameter counts are computed from these shapes by `paramBreakdown`, and
 * the unit tests check them against the counts the model publishers report.
 */
export interface ModelConfig {
  id: string;
  label: string;
  vocab: number;
  /** Width of the residual stream (d_model). */
  hidden: number;
  layers: number;
  /** Query heads. head_dim = hidden / heads. */
  heads: number;
  /** Key/value heads. Equal to `heads` for multi-head attention, fewer for grouped-query attention. */
  kvHeads: number;
  /** Width of the MLP's inner layer. */
  intermediate: number;
  /** 'gelu': two matrices (up, down). 'gated': three (gate, up, down), as in SwiGLU. */
  mlp: 'gelu' | 'gated';
  /** Learned position embeddings (rows), or 0 for rotary embeddings, which have no parameters. */
  positionEmbeddings: number;
  /** Whether the linear layers have bias vectors. */
  biases: boolean;
  /** LayerNorm has a scale and a shift per dimension, RMSNorm only a scale. */
  norm: 'layernorm' | 'rmsnorm';
  /** The output projection reuses the token embedding matrix. */
  tiedEmbeddings: boolean;
  /** Longest sequence the model was configured for. */
  maxContext: number;
  source: { title: string; url: string };
}

export const GPT2_SMALL: ModelConfig = {
  id: 'gpt2',
  label: 'GPT-2 small (124M)',
  vocab: 50257,
  hidden: 768,
  layers: 12,
  heads: 12,
  kvHeads: 12,
  intermediate: 3072,
  mlp: 'gelu',
  positionEmbeddings: 1024,
  biases: true,
  norm: 'layernorm',
  tiedEmbeddings: true,
  maxContext: 1024,
  source: {
    title: 'GPT2Config defaults (Hugging Face Transformers)',
    url: 'https://github.com/huggingface/transformers/blob/main/src/transformers/models/gpt2/configuration_gpt2.py',
  },
};

const LLAMA3_VOCAB = 128256;
const LLAMA31_CONTEXT = 131072;
const LLAMA_SKU_LIST = {
  title: 'Llama 3.1 architecture arguments (meta-llama/llama-models, sku_list.py)',
  url: 'https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py',
};

/** FFN width 14336: int(1.3 · int(2 · 4 · 4096 / 3)) rounded up to a multiple of 1024 (llama-models). */
export const LLAMA31_8B: ModelConfig = {
  id: 'llama-3.1-8b',
  label: 'Llama 3.1 8B',
  vocab: LLAMA3_VOCAB,
  hidden: 4096,
  layers: 32,
  heads: 32,
  kvHeads: 8,
  intermediate: 14336,
  mlp: 'gated',
  positionEmbeddings: 0,
  biases: false,
  norm: 'rmsnorm',
  tiedEmbeddings: false,
  maxContext: LLAMA31_CONTEXT,
  source: LLAMA_SKU_LIST,
};

/** FFN width 28672: int(1.3 · int(2 · 4 · 8192 / 3)) rounded up to a multiple of 4096. */
export const LLAMA31_70B: ModelConfig = {
  id: 'llama-3.1-70b',
  label: 'Llama 3.1 70B',
  vocab: LLAMA3_VOCAB,
  hidden: 8192,
  layers: 80,
  heads: 64,
  kvHeads: 8,
  intermediate: 28672,
  mlp: 'gated',
  positionEmbeddings: 0,
  biases: false,
  norm: 'rmsnorm',
  tiedEmbeddings: false,
  maxContext: LLAMA31_CONTEXT,
  source: LLAMA_SKU_LIST,
};

export const MODELS: Record<string, ModelConfig> = Object.fromEntries(
  [GPT2_SMALL, LLAMA31_8B, LLAMA31_70B].map((m) => [m.id, m]),
);

export const headDim = (c: ModelConfig) => c.hidden / c.heads;

export interface ParamBreakdown {
  embeddings: number;
  attention: number;
  mlp: number;
  norms: number;
  outputHead: number;
  total: number;
}

/**
 * Parameters by part, from the shapes alone. Per layer: Q and O are hidden × hidden, K and V are
 * hidden × (kvHeads · head_dim); the MLP has 2 or 3 matrices of hidden × intermediate; two norms.
 */
export function paramBreakdown(c: ModelConfig): ParamBreakdown {
  const h = c.hidden;
  const kv = c.kvHeads * headDim(c);
  const bias = c.biases ? 1 : 0;
  const attention = 2 * h * h + 2 * h * kv + bias * (2 * h + 2 * kv);
  const mats = c.mlp === 'gated' ? 3 : 2;
  const mlp = mats * h * c.intermediate + bias * (c.intermediate * (mats - 1) + h);
  const perNorm = c.norm === 'layernorm' ? 2 * h : h;
  const embeddings = c.vocab * h + c.positionEmbeddings * h;
  const outputHead = c.tiedEmbeddings ? 0 : c.vocab * h;
  const layers = c.layers * (attention + mlp);
  const norms = (2 * c.layers + 1) * perNorm;
  return {
    embeddings,
    attention: c.layers * attention,
    mlp: c.layers * mlp,
    norms,
    outputHead,
    total: embeddings + layers + norms + outputHead,
  };
}
