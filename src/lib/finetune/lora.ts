// LoRA parameter arithmetic and a tiny worked example. A LoRA adapter on a linear layer W (out × in) adds
// ΔW = (alpha / r) · B · A with B: out × r and A: r × in, so it trains r · (in + out) numbers instead of in · out.
// Model shapes follow the published configs of Llama 3.2 1B, Llama 3.1 8B and Llama 3.1 70B (hidden size, layers,
// MLP size, 8 key/value heads of size 64 or 128). Parameter totals are the published sizes.

export interface ModelShape {
  id: string;
  label: string;
  hidden: number;
  layers: number;
  mlp: number;
  /** Output width of the k and v projections: key/value heads × head size (grouped-query attention). */
  kvDim: number;
  vocab: number;
  totalParams: number;
}

export const MODELS: ModelShape[] = [
  { id: '1b', label: '1B (Llama 3.2 1B shape)', hidden: 2048, layers: 16, mlp: 8192, kvDim: 512, vocab: 128256, totalParams: 1.24e9 },
  { id: '8b', label: '8B (Llama 3.1 8B shape)', hidden: 4096, layers: 32, mlp: 14336, kvDim: 1024, vocab: 128256, totalParams: 8.03e9 },
  { id: '70b', label: '70B (Llama 3.1 70B shape)', hidden: 8192, layers: 80, mlp: 28672, kvDim: 1024, vocab: 128256, totalParams: 70.6e9 },
];

export const getModel = (id: string): ModelShape => MODELS.find((m) => m.id === id) ?? MODELS[1]!;

export type Targets = 'qv' | 'attention' | 'all-linear';

export interface Linear {
  name: string;
  in: number;
  out: number;
}

/** The linear layers of one transformer block. */
export function blockLinears(m: ModelShape): Linear[] {
  const d = m.hidden;
  return [
    { name: 'q_proj', in: d, out: d },
    { name: 'k_proj', in: d, out: m.kvDim },
    { name: 'v_proj', in: d, out: m.kvDim },
    { name: 'o_proj', in: d, out: d },
    { name: 'gate_proj', in: d, out: m.mlp },
    { name: 'up_proj', in: d, out: m.mlp },
    { name: 'down_proj', in: m.mlp, out: d },
  ];
}

export const TARGET_SETS: Record<Targets, string[]> = {
  qv: ['q_proj', 'v_proj'],
  attention: ['q_proj', 'k_proj', 'v_proj', 'o_proj'],
  'all-linear': ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],
};

export interface LoraCount {
  perLayer: { name: string; in: number; out: number; full: number; lora: number }[];
  /** Trainable LoRA parameters in the whole model. */
  trainable: number;
  /** Parameters of the targeted matrices (what full fine-tuning of just those would train). */
  targetedFull: number;
  /** trainable / totalParams. */
  share: number;
  /** Adapter file size in bytes when saved in 16-bit (2 bytes per number). */
  adapterBytes: number;
}

export function loraCount(m: ModelShape, rank: number, targets: Targets): LoraCount {
  const names = TARGET_SETS[targets];
  const perLayer = blockLinears(m)
    .filter((l) => names.includes(l.name))
    .map((l) => ({ ...l, full: l.in * l.out, lora: rank * (l.in + l.out) }));
  const trainable = m.layers * perLayer.reduce((a, l) => a + l.lora, 0);
  const targetedFull = m.layers * perLayer.reduce((a, l) => a + l.full, 0);
  return { perLayer, trainable, targetedFull, share: trainable / m.totalParams, adapterBytes: trainable * 2 };
}

/** The scale LoRA applies to B·A: alpha / r (PEFT default) or alpha / √r (rsLoRA, use_rslora=True). */
export const loraScale = (alpha: number, rank: number, rslora = false): number => alpha / (rslora ? Math.sqrt(rank) : rank);

// ---------- matrices for the worked example ----------

export type Mat = number[][];

export function matmul(a: Mat, b: Mat): Mat {
  return a.map((row) => b[0]!.map((_, j) => row.reduce((s, v, k) => s + v * b[k]![j]!, 0)));
}
export const add = (a: Mat, b: Mat): Mat => a.map((row, i) => row.map((v, j) => v + b[i]![j]!));
export const scale = (a: Mat, k: number): Mat => a.map((row) => row.map((v) => v * k));

/** Rank by Gaussian elimination (exact enough for the small integer matrices in the lesson). */
export function rank(a: Mat, eps = 1e-9): number {
  const m = a.map((r) => [...r]);
  let r = 0;
  for (let c = 0; c < m[0]!.length && r < m.length; c++) {
    let p = r;
    for (let i = r + 1; i < m.length; i++) if (Math.abs(m[i]![c]!) > Math.abs(m[p]![c]!)) p = i;
    if (Math.abs(m[p]![c]!) < eps) continue;
    [m[r], m[p]] = [m[p]!, m[r]!];
    for (let i = 0; i < m.length; i++)
      if (i !== r) {
        const f = m[i]![c]! / m[r]![c]!;
        for (let j = c; j < m[0]!.length; j++) m[i]![j]! -= f * m[r]![j]!;
      }
    r++;
  }
  return r;
}

/** W' = W + (alpha / r) · B · A: what "merging the adapter" computes once, after training. */
export function mergeLora(w: Mat, b: Mat, a: Mat, alpha: number): { delta: Mat; merged: Mat } {
  const r = a.length;
  const delta = scale(matmul(b, a), alpha / r);
  return { delta, merged: add(w, delta) };
}
