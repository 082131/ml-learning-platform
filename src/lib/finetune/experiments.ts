// Experiment definitions for the LLM fine-tuning track. The logic lives in the modules they import, each unit-tested
// in finetune.test.ts; this file only wires state, controls and readouts.
import type { ExperimentDef } from '../types';
import { payback, recommendApproach, type DecideInput, type PaybackInput, type PaybackResult, type Problem, type Recommendation } from './decide';
import { contaminated, dedup, type DedupResult } from './dedup';
import { regressionGate, sampleSize, winRate, type BenchRow, type GateRow, type WinRate } from './evalstats';
import { round, sequenceLoss, type SequenceLoss } from './loss';
import { getModel, loraCount, mergeLora, rank as matRank, type LoraCount, type Mat, type Targets } from './lora';
import { estimateMemory, gb, GPU_MEMORY, type MemoryEstimate } from './memory';
import { bradleyTerry, dpoLoss, expectation, klOptimum, trainDpo, type DpoInput, type DpoResult, type DpoStep, type KlOptimum, type PairScore } from './preference';
import { computeBudget, GPUS, human, sci, type ComputeInput, type ComputeResult } from './scaling';
import { batchMath, lrAt, scheduleCurve, type BatchInput, type BatchResult, type ScheduleInput, type ScheduleKind } from './schedule';
import { simulateSft, type SftInput, type SftResult } from './sft';
import { maskSummary, pack, renderChat, type MaskMode, type MaskSummary, type Message, type PackResult, type Tok } from './template';

const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
const yesNo = opts([
  ['yes', 'yes'],
  ['no', 'no'],
]);
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const money = (x: number) => (x >= 1000 ? `$${Math.round(x).toLocaleString('en-US')}` : `$${x.toFixed(2)}`);

// ---------- 1. next-token loss ----------

export const LOSS_CONTEXT = 'The';
export const LOSS_TOKENS = ['capital', 'of', 'France', 'is', 'Paris'];
export const LOSS_PRESETS: Record<string, { label: string; probs: number[] }> = {
  early: { label: 'Early in pretraining', probs: [0.02, 0.1, 0.01, 0.1, 0.01] },
  pretrained: { label: 'After pretraining', probs: [0.05, 0.6, 0.2, 0.7, 0.8] },
  wrong: { label: 'Confident about the wrong city', probs: [0.05, 0.6, 0.2, 0.7, 0.01] },
};
export const VOCAB = 50000;

export interface LossState {
  preset: string;
  probs: number[];
}

export function lossExperiment(id: string): ExperimentDef<LossState, SequenceLoss> {
  return {
    id,
    initial: { preset: 'pretrained', probs: [...LOSS_PRESETS.pretrained!.probs] },
    controls: [
      {
        kind: 'select',
        id: 'preset',
        label: 'Model',
        options: [...Object.entries(LOSS_PRESETS).map(([value, p]) => ({ value, label: p.label })), { value: 'custom', label: 'Custom (your sliders)' }],
        get: (s) => s.preset,
        set: (s, v) => (LOSS_PRESETS[v] ? { preset: v, probs: [...LOSS_PRESETS[v].probs] } : { ...s, preset: 'custom' }),
      },
      ...LOSS_TOKENS.map((t, i) => ({
        kind: 'slider' as const,
        id: `p${i}`,
        label: `P("${t}")`,
        min: 0.01,
        max: 0.99,
        step: 0.01,
        get: (s: LossState) => s.probs[i]!,
        set: (s: LossState, v: number) => ({ preset: 'custom', probs: s.probs.map((p, k) => (k === i ? v : p)) }),
      })),
    ],
    compute: (s) => sequenceLoss(s.probs),
    readout: (_s, r) => [
      { label: 'Average loss (cross-entropy)', value: `${r.mean.toFixed(3)} nats` },
      { label: 'Perplexity', value: r.perplexity.toFixed(2) },
      { label: 'Worst token', value: `"${LOSS_TOKENS[r.losses.indexOf(Math.max(...r.losses))]}" (${Math.max(...r.losses).toFixed(2)})` },
      { label: `Uniform guess over ${VOCAB.toLocaleString('en-US')} tokens`, value: `${Math.log(VOCAB).toFixed(2)} nats` },
    ],
  };
}

// ---------- 2. prompt, RAG or fine-tune ----------

export function decideExperiment(id: string): ExperimentDef<DecideInput, Recommendation> {
  return {
    id,
    initial: { problem: 'format', factsChange: false, examples: 1500, promptTried: true },
    controls: [
      {
        kind: 'select',
        id: 'problem',
        label: 'What is wrong with the answers?',
        options: opts([
          ['facts', 'Missing or outdated facts'],
          ['format', 'Wrong format, tone or style'],
          ['cost', 'Too slow or too expensive'],
          ['skill', 'Weak at a narrow task'],
        ]),
        get: (s) => s.problem,
        set: (s, v) => ({ ...s, problem: v as Problem }),
      },
      { kind: 'select', id: 'change', label: 'Do the facts change often?', options: yesNo, get: (s) => (s.factsChange ? 'yes' : 'no'), set: (s, v) => ({ ...s, factsChange: v === 'yes' }) },
      { kind: 'select', id: 'tried', label: 'Tried and measured a careful prompt?', options: yesNo, get: (s) => (s.promptTried ? 'yes' : 'no'), set: (s, v) => ({ ...s, promptTried: v === 'yes' }) },
      { kind: 'slider', id: 'examples', label: 'Good examples you have', min: 0, max: 5000, step: 50, get: (s) => s.examples, set: (s, v) => ({ ...s, examples: v }) },
    ],
    compute: recommendApproach,
    readout: (_s, r) => [{ label: 'Recommendation', value: r.label }],
  };
}

export function paybackExperiment(id: string): ExperimentDef<PaybackInput, PaybackResult> {
  return {
    id,
    initial: { requestsPerDay: 20000, savedTokens: 1500, pricePerMTok: 3, trainTokensM: 15, trainPricePerMTok: 8, peopleCost: 6000 },
    controls: [
      { kind: 'slider', id: 'rpd', label: 'Requests per day', min: 500, max: 200000, step: 500, get: (s) => s.requestsPerDay, set: (s, v) => ({ ...s, requestsPerDay: v }) },
      { kind: 'slider', id: 'saved', label: 'Prompt tokens saved per request', min: 0, max: 5000, step: 100, get: (s) => s.savedTokens, set: (s, v) => ({ ...s, savedTokens: v }) },
      { kind: 'slider', id: 'price', label: 'Input price ($ per million tokens)', min: 0.1, max: 15, step: 0.1, get: (s) => s.pricePerMTok, set: (s, v) => ({ ...s, pricePerMTok: v }) },
      { kind: 'slider', id: 'people', label: 'People time for data and evals ($)', min: 0, max: 40000, step: 500, get: (s) => s.peopleCost, set: (s, v) => ({ ...s, peopleCost: v }) },
    ],
    compute: payback,
    readout: (_s, r) => [
      { label: 'One-time cost', value: money(r.oneTime) },
      { label: 'Saved per month', value: money(r.savedPerMonth) },
      { label: 'Pays back after', value: r.paybackMonths === null ? 'never (nothing saved)' : `${r.paybackMonths.toFixed(1)} months` },
    ],
  };
}

// ---------- 3. compute budgets ----------

export function computeExperiment(id: string): ExperimentDef<ComputeInput, ComputeResult> {
  return {
    id,
    initial: { paramsB: 7, tokensB: 2000, gpu: 'h100', mfu: 0.4, gpus: 512, dollarsPerGpuHour: 2.5 },
    controls: [
      { kind: 'slider', id: 'params', label: 'Parameters (billions)', min: 0.5, max: 70, step: 0.5, get: (s) => s.paramsB, set: (s, v) => ({ ...s, paramsB: v }) },
      { kind: 'slider', id: 'tokens', label: 'Training tokens (billions)', min: 10, max: 15000, step: 10, get: (s) => s.tokensB, set: (s, v) => ({ ...s, tokensB: v }) },
      { kind: 'select', id: 'gpu', label: 'GPU', options: GPUS.map((g) => ({ value: g.id, label: g.label })), get: (s) => s.gpu, set: (s, v) => ({ ...s, gpu: v }) },
      { kind: 'slider', id: 'mfu', label: 'Utilization (MFU)', min: 0.2, max: 0.6, step: 0.05, get: (s) => s.mfu, set: (s, v) => ({ ...s, mfu: v }), format: (v) => `${Math.round(v * 100)}%` },
      { kind: 'slider', id: 'gpus', label: 'GPUs', min: 8, max: 4096, step: 8, get: (s) => s.gpus, set: (s, v) => ({ ...s, gpus: v }) },
    ],
    compute: computeBudget,
    readout: (_s, r) => [
      { label: 'Training compute (6·N·D)', value: `${sci(r.flops)} FLOPs` },
      { label: 'Tokens per parameter', value: r.tokensPerParam.toFixed(0) },
      { label: 'GPU-hours', value: human(r.gpuHours) },
      { label: 'Wall-clock time', value: `${r.days.toFixed(1)} days` },
      { label: 'Cost at $2.50 per GPU-hour (estimate)', value: money(r.cost) },
      { label: 'Compute-optimal split of this budget', value: `${human(r.optimal.params)} params, ${human(r.optimal.tokens)} tokens` },
    ],
  };
}

// ---------- 4. learning-rate schedules and batches ----------

export interface ScheduleState {
  kind: ScheduleKind;
  peak: number;
  warmupPct: number;
  minRatio: number;
  totalSteps: number;
}
export interface ScheduleResult {
  input: ScheduleInput;
  curve: [number, number][];
  at: { step: number; lr: number }[];
}

export function scheduleExperiment(id: string): ExperimentDef<ScheduleState, ScheduleResult> {
  return {
    id,
    initial: { kind: 'cosine', peak: 2e-4, warmupPct: 3, minRatio: 0.1, totalSteps: 1000 },
    controls: [
      {
        kind: 'select',
        id: 'kind',
        label: 'Schedule',
        options: opts([
          ['constant', 'Constant (after warmup)'],
          ['linear', 'Linear decay'],
          ['cosine', 'Cosine decay'],
          ['wsd', 'Warmup-stable-decay'],
        ]),
        get: (s) => s.kind,
        set: (s, v) => ({ ...s, kind: v as ScheduleKind }),
      },
      {
        kind: 'select',
        id: 'peak',
        label: 'Peak learning rate',
        options: opts([
          ['0.00001', '1e-5'],
          ['0.00002', '2e-5 (full fine-tune)'],
          ['0.0002', '2e-4 (LoRA)'],
          ['0.0003', '3e-4 (pretraining)'],
        ]),
        get: (s) => String(s.peak),
        set: (s, v) => ({ ...s, peak: Number(v) }),
      },
      { kind: 'slider', id: 'warmup', label: 'Warmup (% of steps)', min: 0, max: 20, step: 1, get: (s) => s.warmupPct, set: (s, v) => ({ ...s, warmupPct: v }) },
      { kind: 'slider', id: 'min', label: 'Floor (% of peak)', min: 0, max: 50, step: 5, get: (s) => Math.round(s.minRatio * 100), set: (s, v) => ({ ...s, minRatio: v / 100 }) },
    ],
    compute: (s) => {
      const input: ScheduleInput = { kind: s.kind, peak: s.peak, warmupSteps: Math.round((s.totalSteps * s.warmupPct) / 100), totalSteps: s.totalSteps, minRatio: s.minRatio };
      return { input, curve: scheduleCurve(input), at: [0, 10, input.warmupSteps, 500, 900, 1000].map((step) => ({ step, lr: lrAt(step, input) })) };
    },
    readout: (_s, r) => [
      { label: 'Warmup steps', value: String(r.input.warmupSteps) },
      { label: 'LR at step 500', value: lrAt(500, r.input).toExponential(2) },
      { label: 'LR at the last step', value: lrAt(r.input.totalSteps, r.input).toExponential(2) },
    ],
  };
}

export function batchExperiment(id: string): ExperimentDef<BatchInput, BatchResult> {
  return {
    id,
    initial: { microBatch: 4, gradAccum: 8, gpus: 2, seqLen: 2048, datasetTokens: 20e6, epochs: 3 },
    controls: [
      { kind: 'slider', id: 'micro', label: 'Micro batch per GPU', min: 1, max: 32, step: 1, get: (s) => s.microBatch, set: (s, v) => ({ ...s, microBatch: v }) },
      { kind: 'slider', id: 'accum', label: 'Gradient accumulation steps', min: 1, max: 64, step: 1, get: (s) => s.gradAccum, set: (s, v) => ({ ...s, gradAccum: v }) },
      { kind: 'slider', id: 'gpus', label: 'GPUs', min: 1, max: 16, step: 1, get: (s) => s.gpus, set: (s, v) => ({ ...s, gpus: v }) },
      {
        kind: 'select',
        id: 'seq',
        label: 'Sequence length',
        options: opts([
          ['1024', '1,024'],
          ['2048', '2,048'],
          ['4096', '4,096'],
        ]),
        get: (s) => String(s.seqLen),
        set: (s, v) => ({ ...s, seqLen: Number(v) }),
      },
    ],
    compute: batchMath,
    readout: (_s, r) => [
      { label: 'Sequences per optimizer step', value: String(r.sequencesPerStep) },
      { label: 'Tokens per step', value: r.tokensPerStep.toLocaleString('en-US') },
      { label: 'Steps per epoch (20 M tokens)', value: String(r.stepsPerEpoch) },
      { label: 'Total steps (3 epochs)', value: String(r.totalSteps) },
    ],
  };
}

// ---------- 5. chat templates and loss masks ----------

export const CONVERSATIONS: Record<string, { label: string; messages: Message[] }> = {
  single: {
    label: 'One question',
    messages: [
      { role: 'system', content: 'You are the support assistant for Acme Cloud.' },
      { role: 'user', content: 'How do I reset my password?' },
      { role: 'assistant', content: 'Open Settings, choose Security, then click Reset password.' },
    ],
  },
  multi: {
    label: 'Two turns',
    messages: [
      { role: 'system', content: 'You are the support assistant for Acme Cloud.' },
      { role: 'user', content: 'How do I reset my password?' },
      { role: 'assistant', content: 'Open Settings, choose Security, then click Reset password.' },
      { role: 'user', content: 'I never got the email.' },
      { role: 'assistant', content: 'Check your spam folder, then request a new link after five minutes.' },
    ],
  },
};

export interface MaskState {
  conversation: string;
  mode: MaskMode;
}
export interface MaskResult {
  toks: Tok[];
  summary: MaskSummary;
}

export function maskExperiment(id: string): ExperimentDef<MaskState, MaskResult> {
  return {
    id,
    initial: { conversation: 'multi', mode: 'assistant' },
    controls: [
      { kind: 'select', id: 'conv', label: 'Conversation', options: Object.entries(CONVERSATIONS).map(([value, c]) => ({ value, label: c.label })), get: (s) => s.conversation, set: (s, v) => ({ ...s, conversation: v }) },
      {
        kind: 'select',
        id: 'mode',
        label: 'Loss on',
        options: opts([
          ['all', 'Every token'],
          ['assistant', 'Assistant replies only'],
          ['last', 'Last reply only'],
        ]),
        get: (s) => s.mode,
        set: (s, v) => ({ ...s, mode: v as MaskMode }),
      },
    ],
    compute: (s) => {
      const toks = renderChat(CONVERSATIONS[s.conversation]!.messages, s.mode);
      return { toks, summary: maskSummary(toks) };
    },
    readout: (_s, r) => [
      { label: 'Tokens in the sequence', value: String(r.summary.total) },
      { label: 'Tokens in the loss', value: String(r.summary.trained) },
      { label: 'Masked (label −100)', value: String(r.summary.masked) },
    ],
  };
}

export const PACK_DATASETS: Record<string, { label: string; lengths: number[] }> = {
  chat: { label: 'Short chats', lengths: [180, 420, 95, 760, 310, 150, 980, 240, 60, 510, 330, 205] },
  mixed: { label: 'Chats plus two long documents', lengths: [180, 420, 95, 760, 310, 2600, 150, 980, 1500, 240, 60, 510] },
};

export interface PackState {
  dataset: string;
  maxLen: number;
  strategy: 'pad' | 'pack';
}

export function packExperiment(id: string): ExperimentDef<PackState, PackResult> {
  return {
    id,
    initial: { dataset: 'chat', maxLen: 1024, strategy: 'pad' },
    controls: [
      { kind: 'select', id: 'data', label: 'Examples', options: Object.entries(PACK_DATASETS).map(([value, d]) => ({ value, label: d.label })), get: (s) => s.dataset, set: (s, v) => ({ ...s, dataset: v }) },
      {
        kind: 'select',
        id: 'strategy',
        label: 'Batching',
        options: opts([
          ['pad', 'One example per row, padded'],
          ['pack', 'Packed (best-fit decreasing)'],
        ]),
        get: (s) => s.strategy,
        set: (s, v) => ({ ...s, strategy: v as 'pad' | 'pack' }),
      },
      {
        kind: 'select',
        id: 'max',
        label: 'Max length',
        options: opts([
          ['1024', '1,024'],
          ['2048', '2,048'],
        ]),
        get: (s) => String(s.maxLen),
        set: (s, v) => ({ ...s, maxLen: Number(v) }),
      },
    ],
    compute: (s) => pack(PACK_DATASETS[s.dataset]!.lengths, s.maxLen, s.strategy),
    readout: (_s, r) => [
      { label: 'Rows', value: String(r.blocks.length) },
      { label: 'Real tokens', value: r.realTokens.toLocaleString('en-US') },
      { label: 'Padding tokens', value: r.padding.toLocaleString('en-US') },
      { label: 'Useful share of compute', value: pct(r.efficiency) },
      { label: 'Tokens cut off', value: r.truncated.toLocaleString('en-US') },
    ],
  };
}

// ---------- 6. deduplication and contamination ----------

export const TRAIN_DOCS = [
  'How do I reset my password? Open Settings, choose Security, then click Reset password.',
  'how do i reset my password? open settings, choose security, then click reset password!',
  'How can I reset my password? Open Settings, pick Security, then click Reset password.',
  'How do I change my billing address? Go to Billing and edit the address on file.',
  'How do I update my billing address? Go to Billing and edit the address on file.',
  'Why was my card declined? Your bank may block the charge; contact them or try another card.',
  'How do I export my data? Open Settings, choose Privacy, then click Export data.',
  'Can I get a refund? Refunds are available within 30 days of purchase from the Billing page.',
];
export const TEST_DOCS = [
  'How do I export my data? Open Settings, choose Privacy, then click Export data.',
  'How do I delete my account permanently?',
  'Can I get a refund after 30 days?',
];

/** Contamination uses 8-word overlaps (GPT-3 used 13; these examples are short). */
export const CONTAM_N = 8;

export interface DedupState {
  n: number;
  threshold: number;
}
export interface DedupView extends DedupResult {
  contaminated: number[];
}

export function dedupExperiment(id: string): ExperimentDef<DedupState, DedupView> {
  return {
    id,
    initial: { n: 3, threshold: 0.5 },
    controls: [
      { kind: 'slider', id: 'n', label: 'Shingle size (words)', min: 1, max: 6, step: 1, get: (s) => s.n, set: (s, v) => ({ ...s, n: v }) },
      { kind: 'slider', id: 'threshold', label: 'Duplicate threshold (Jaccard)', min: 0.3, max: 0.95, step: 0.05, get: (s) => s.threshold, set: (s, v) => ({ ...s, threshold: round(v, 2) }) },
    ],
    compute: (s) => ({ ...dedup(TRAIN_DOCS, s.n, s.threshold), contaminated: contaminated(TRAIN_DOCS, TEST_DOCS, CONTAM_N) }),
    readout: (_s, r) => [
      { label: 'Pairs flagged', value: String(r.flagged.length) },
      { label: 'Training examples kept', value: `${r.kept.length} of ${TRAIN_DOCS.length}` },
      { label: 'Test items that overlap training', value: `${r.contaminated.length} of ${TEST_DOCS.length}` },
    ],
  };
}

// ---------- 7. SFT run (simulated) ----------

export function sftExperiment(id: string): ExperimentDef<SftInput, SftResult> {
  return {
    id,
    initial: { method: 'full', lrScale: 1, epochs: 5, examples: 2000 },
    controls: [
      {
        kind: 'select',
        id: 'method',
        label: 'Method',
        options: opts([
          ['full', 'Full fine-tuning'],
          ['lora', 'LoRA'],
        ]),
        get: (s) => s.method,
        set: (s, v) => ({ ...s, method: v as SftInput['method'] }),
      },
      {
        kind: 'select',
        id: 'lr',
        label: 'Learning rate',
        options: opts([
          ['0.25', '¼ × usual'],
          ['1', 'usual (2e-5 full, 2e-4 LoRA)'],
          ['4', '4 × usual'],
          ['12', '12 × usual'],
        ]),
        get: (s) => String(s.lrScale),
        set: (s, v) => ({ ...s, lrScale: Number(v) }),
      },
      { kind: 'slider', id: 'epochs', label: 'Epochs', min: 1, max: 8, step: 1, get: (s) => s.epochs, set: (s, v) => ({ ...s, epochs: v }) },
      {
        kind: 'select',
        id: 'examples',
        label: 'Training examples',
        options: opts([
          ['500', '500'],
          ['2000', '2,000'],
          ['20000', '20,000'],
        ]),
        get: (s) => String(s.examples),
        set: (s, v) => ({ ...s, examples: Number(v) }),
      },
    ],
    compute: (s) => simulateSft(s),
    readout: (_s, r) => [
      { label: 'Best validation loss', value: `${r.best.val.toFixed(3)} at epoch ${r.best.epoch}` },
      { label: 'Final validation loss', value: r.points[r.points.length - 1]!.val.toFixed(3) },
      { label: 'General-skills score (before: 62)', value: String(r.points[r.points.length - 1]!.general) },
      ...(r.diverged ? [{ label: 'Run', value: 'unstable: loss blew up', status: 'diverged' as const }] : []),
    ],
    resultSource: 'simulated curves (formulas in src/lib/finetune/sft.ts)',
  };
}

// ---------- 8. LoRA ----------

export interface LoraState {
  model: string;
  rank: number;
  targets: Targets;
}

export function loraExperiment(id: string): ExperimentDef<LoraState, LoraCount> {
  return {
    id,
    initial: { model: '8b', rank: 16, targets: 'all-linear' },
    controls: [
      { kind: 'select', id: 'model', label: 'Model', options: opts([['1b', '1B (Llama 3.2 1B shape)'], ['8b', '8B (Llama 3.1 8B shape)'], ['70b', '70B (Llama 3.1 70B shape)']]), get: (s) => s.model, set: (s, v) => ({ ...s, model: v }) },
      { kind: 'select', id: 'rank', label: 'Rank r', options: ['4', '8', '16', '32', '64', '128'].map((v) => ({ value: v, label: v })), get: (s) => String(s.rank), set: (s, v) => ({ ...s, rank: Number(v) }) },
      {
        kind: 'select',
        id: 'targets',
        label: 'Target modules',
        options: opts([
          ['qv', 'q_proj, v_proj (original paper)'],
          ['attention', 'all attention projections'],
          ['all-linear', 'all-linear (attention + MLP)'],
        ]),
        get: (s) => s.targets,
        set: (s, v) => ({ ...s, targets: v as Targets }),
      },
    ],
    compute: (s) => loraCount(getModel(s.model), s.rank, s.targets),
    readout: (s, r) => [
      { label: 'Trainable parameters', value: `${human(r.trainable, 2)} (${(r.share * 100).toFixed(2)}% of ${human(getModel(s.model).totalParams, 2)})` },
      { label: 'Adapter file (16-bit)', value: `${(r.adapterBytes / 1e6).toFixed(0)} MB` },
      { label: 'Full checkpoint (16-bit)', value: gb(getModel(s.model).totalParams * 2) },
    ],
  };
}

export const LORA_W: Mat = [
  [2, 0, 1, 0],
  [0, 1, 0, 2],
  [1, 0, 3, 0],
  [0, 2, 0, 1],
];
export const LORA_FACTORS: Record<number, { b: Mat; a: Mat }> = {
  1: { b: [[1], [0], [2], [0]], a: [[0, 1, 0, 1]] },
  2: {
    b: [
      [1, 0],
      [0, 1],
      [2, 0],
      [0, 1],
    ],
    a: [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ],
  },
};

export interface LoraMatState {
  rank: 1 | 2;
  alpha: number;
}
export interface LoraMatResult {
  w: Mat;
  b: Mat;
  a: Mat;
  delta: Mat;
  merged: Mat;
  deltaRank: number;
  scale: number;
  numbers: { full: number; lora: number };
}

export function loraMatrixExperiment(id: string): ExperimentDef<LoraMatState, LoraMatResult> {
  return {
    id,
    initial: { rank: 1, alpha: 1 },
    controls: [
      { kind: 'select', id: 'rank', label: 'Rank r', options: opts([['1', '1'], ['2', '2']]), get: (s) => String(s.rank), set: (s, v) => ({ ...s, rank: Number(v) as 1 | 2 }) },
      { kind: 'slider', id: 'alpha', label: 'alpha', min: 0, max: 4, step: 0.5, get: (s) => s.alpha, set: (s, v) => ({ ...s, alpha: v }) },
    ],
    compute: (s) => {
      const { b, a } = LORA_FACTORS[s.rank]!;
      const { delta, merged } = mergeLora(LORA_W, b, a, s.alpha);
      return { w: LORA_W, b, a, delta, merged, deltaRank: matRank(delta), scale: s.alpha / s.rank, numbers: { full: 16, lora: s.rank * 8 } };
    },
    readout: (_s, r) => [
      { label: 'Scale alpha / r', value: String(r.scale) },
      { label: 'Rank of ΔW', value: String(r.deltaRank) },
      { label: 'Numbers trained', value: `${r.numbers.lora} (B and A) instead of ${r.numbers.full}` },
    ],
  };
}

// ---------- 9. GPU memory ----------

export interface MemoryState {
  model: string;
  seqLen: number;
  batch: number;
  checkpointing: boolean;
  rank: number;
  gpu: string;
}
export interface MemoryResult {
  estimates: MemoryEstimate[];
  gpuBytes: number;
}

export function memoryExperiment(id: string): ExperimentDef<MemoryState, MemoryResult> {
  return {
    id,
    initial: { model: '8b', seqLen: 2048, batch: 1, checkpointing: true, rank: 16, gpu: '24' },
    controls: [
      { kind: 'select', id: 'model', label: 'Model', options: opts([['1b', '1B'], ['8b', '8B'], ['70b', '70B']]), get: (s) => s.model, set: (s, v) => ({ ...s, model: v }) },
      { kind: 'select', id: 'gpu', label: 'GPU memory', options: GPU_MEMORY.map((g) => ({ value: g.id, label: g.label })), get: (s) => s.gpu, set: (s, v) => ({ ...s, gpu: v }) },
      { kind: 'select', id: 'seq', label: 'Sequence length', options: opts([['512', '512'], ['2048', '2,048'], ['8192', '8,192']]), get: (s) => String(s.seqLen), set: (s, v) => ({ ...s, seqLen: Number(v) }) },
      { kind: 'slider', id: 'batch', label: 'Micro batch', min: 1, max: 16, step: 1, get: (s) => s.batch, set: (s, v) => ({ ...s, batch: v }) },
      { kind: 'select', id: 'ckpt', label: 'Activation checkpointing', options: yesNo, get: (s) => (s.checkpointing ? 'yes' : 'no'), set: (s, v) => ({ ...s, checkpointing: v === 'yes' }) },
    ],
    compute: (s) => ({
      estimates: (['full', 'lora', 'qlora'] as const).map((m) => estimateMemory(m, s)),
      gpuBytes: GPU_MEMORY.find((g) => g.id === s.gpu)?.bytes ?? 24e9,
    }),
    readout: (_s, r) =>
      r.estimates.map((e) => ({
        label: { full: 'Full fine-tuning', lora: 'LoRA (16-bit base)', qlora: 'QLoRA (4-bit base)' }[e.method],
        value: `${gb(e.total)} ${e.total <= r.gpuBytes ? 'fits' : 'does not fit'}`,
      })),
  };
}

// ---------- 10. reward models and KL ----------

export interface BtState {
  chosen: number;
  rejected: number;
}

export function btExperiment(id: string): ExperimentDef<BtState, PairScore> {
  return {
    id,
    initial: { chosen: 1.5, rejected: 0.5 },
    controls: [
      { kind: 'slider', id: 'chosen', label: 'Reward of the chosen answer', min: -4, max: 4, step: 0.1, get: (s) => s.chosen, set: (s, v) => ({ ...s, chosen: round(v, 1) }) },
      { kind: 'slider', id: 'rejected', label: 'Reward of the rejected answer', min: -4, max: 4, step: 0.1, get: (s) => s.rejected, set: (s, v) => ({ ...s, rejected: round(v, 1) }) },
    ],
    compute: (s) => bradleyTerry(s.chosen, s.rejected),
    readout: (s, r) => [
      { label: 'Reward difference', value: (s.chosen - s.rejected).toFixed(1) },
      { label: 'P(chosen preferred)', value: r.prob.toFixed(3) },
      { label: 'Loss −ln σ(difference)', value: r.loss.toFixed(3) },
    ],
  };
}

export const KL_RESPONSES = [
  { id: 'A', label: 'Clear, correct explanation', ref: 0.3, reward: 2.0, quality: 2.0 },
  { id: 'B', label: 'Correct but terse', ref: 0.4, reward: 1.0, quality: 1.2 },
  { id: 'C', label: 'Long, flattering, padded', ref: 0.1, reward: 2.6, quality: 0.3 },
  { id: 'D', label: 'Confident but wrong', ref: 0.2, reward: -1.5, quality: -2.0 },
];
export const KL_BETAS = [0.1, 0.2, 0.5, 1, 2, 5];

export interface KlState {
  beta: number;
}
export interface KlResult extends KlOptimum {
  quality: number;
  refReward: number;
  refQuality: number;
}

export function klExperiment(id: string): ExperimentDef<KlState, KlResult> {
  const ref = KL_RESPONSES.map((r) => r.ref);
  const reward = KL_RESPONSES.map((r) => r.reward);
  const quality = KL_RESPONSES.map((r) => r.quality);
  return {
    id,
    initial: { beta: 1 },
    controls: [{ kind: 'select', id: 'beta', label: 'β (KL penalty strength)', options: KL_BETAS.map((b) => ({ value: String(b), label: String(b) })), get: (s) => String(s.beta), set: (_s, v) => ({ beta: Number(v) }) }],
    compute: (s) => {
      const o = klOptimum(ref, reward, s.beta);
      return { ...o, quality: expectation(o.policy, quality), refReward: expectation(ref, reward), refQuality: expectation(ref, quality) };
    },
    readout: (_s, r) => [
      { label: 'Reward-model score (expected)', value: `${r.expectedReward.toFixed(2)} (SFT model: ${r.refReward.toFixed(2)})` },
      { label: 'True quality (expected)', value: `${r.quality.toFixed(2)} (SFT model: ${r.refQuality.toFixed(2)})` },
      { label: 'KL from the SFT model', value: `${r.kl.toFixed(2)} nats` },
    ],
  };
}

// ---------- 11. DPO ----------

export function dpoExperiment(id: string): ExperimentDef<DpoInput, DpoResult> {
  return {
    id,
    initial: { policyChosen: -40, policyRejected: -46, refChosen: -42, refRejected: -44, beta: 0.1 },
    controls: [
      { kind: 'slider', id: 'pc', label: 'log π(chosen)', min: -60, max: -20, step: 1, get: (s) => s.policyChosen, set: (s, v) => ({ ...s, policyChosen: v }) },
      { kind: 'slider', id: 'pr', label: 'log π(rejected)', min: -60, max: -20, step: 1, get: (s) => s.policyRejected, set: (s, v) => ({ ...s, policyRejected: v }) },
      { kind: 'slider', id: 'rc', label: 'log π_ref(chosen)', min: -60, max: -20, step: 1, get: (s) => s.refChosen, set: (s, v) => ({ ...s, refChosen: v }) },
      { kind: 'slider', id: 'rr', label: 'log π_ref(rejected)', min: -60, max: -20, step: 1, get: (s) => s.refRejected, set: (s, v) => ({ ...s, refRejected: v }) },
      { kind: 'select', id: 'beta', label: 'β', options: ['0.05', '0.1', '0.5'].map((v) => ({ value: v, label: v })), get: (s) => String(s.beta), set: (s, v) => ({ ...s, beta: Number(v) }) },
    ],
    compute: dpoLoss,
    readout: (_s, r) => [
      { label: 'Implicit reward, chosen', value: r.rewardChosen.toFixed(2) },
      { label: 'Implicit reward, rejected', value: r.rewardRejected.toFixed(2) },
      { label: 'Margin', value: r.margin.toFixed(2) },
      { label: 'DPO loss −ln σ(margin)', value: r.loss.toFixed(3) },
      { label: 'Gradient weight σ(−margin)', value: r.weight.toFixed(3) },
    ],
  };
}

/** Human preferences over the four KL_RESPONSES (by index): A > C, A > D, B > D, A > B, B > C. */
export const DPO_PAIRS: [number, number][] = [
  [0, 2],
  [0, 3],
  [1, 3],
  [0, 1],
  [1, 2],
];

export interface DpoTrainState {
  beta: number;
  steps: number;
}

export function dpoTrainExperiment(id: string): ExperimentDef<DpoTrainState, DpoStep[]> {
  return {
    id,
    initial: { beta: 0.5, steps: 60 },
    controls: [
      { kind: 'select', id: 'beta', label: 'β', options: ['0.1', '0.5', '2'].map((v) => ({ value: v, label: v })), get: (s) => String(s.beta), set: (s, v) => ({ ...s, beta: Number(v) }) },
      { kind: 'slider', id: 'steps', label: 'Training steps', min: 0, max: 200, step: 10, get: (s) => s.steps, set: (s, v) => ({ ...s, steps: v }) },
    ],
    compute: (s) => trainDpo(KL_RESPONSES.map((r) => r.ref), DPO_PAIRS, s.beta, 0.5, s.steps),
    readout: (_s, r) => {
      const last = r[r.length - 1];
      return [
        { label: 'Mean DPO loss', value: `${last!.loss.toFixed(3)} (start: ${r[0]!.loss.toFixed(3)})` },
        { label: 'Pairs ranked correctly', value: pct(last!.accuracy, 0) },
        { label: 'P(A, the best answer)', value: `${last!.probs[0]!.toFixed(3)} (SFT: 0.300)` },
      ];
    },
  };
}

// ---------- 12. evaluation ----------

export interface WinState {
  wins: number;
  losses: number;
  ties: number;
}
export interface WinResult extends WinRate {
  neededFor5: number;
}

export function winRateExperiment(id: string): ExperimentDef<WinState, WinResult> {
  return {
    id,
    initial: { wins: 58, losses: 32, ties: 10 },
    controls: [
      { kind: 'slider', id: 'wins', label: 'Fine-tune wins', min: 0, max: 400, step: 1, get: (s) => s.wins, set: (s, v) => ({ ...s, wins: v }) },
      { kind: 'slider', id: 'losses', label: 'Base model wins', min: 0, max: 400, step: 1, get: (s) => s.losses, set: (s, v) => ({ ...s, losses: v }) },
      { kind: 'slider', id: 'ties', label: 'Ties', min: 0, max: 200, step: 1, get: (s) => s.ties, set: (s, v) => ({ ...s, ties: v }) },
    ],
    compute: (s) => ({ ...winRate(s.wins, s.losses, s.ties), neededFor5: sampleSize(0.05) }),
    readout: (_s, r) => [
      { label: 'Win rate (ties count half)', value: pct(r.rate) },
      { label: '95% interval (Wilson)', value: `${pct(r.low)} to ${pct(r.high)}` },
      { label: 'Verdict', value: { better: 'better than the base model', worse: 'worse than the base model', unclear: 'not distinguishable from 50%' }[r.verdict] },
    ],
  };
}

export const BENCH_BASE: Omit<BenchRow, 'candidate'>[] = [
  { id: 'task', label: 'Support answers judged correct (held-out)', base: 71, tolerance: -5 },
  { id: 'format', label: 'Replies in the required format', base: 93, tolerance: 0 },
  { id: 'general', label: 'General knowledge (MMLU-style)', base: 66, tolerance: 2 },
  { id: 'math', label: 'Math word problems (GSM8K-style)', base: 74, tolerance: 2 },
  { id: 'safety', label: 'Refuses clearly harmful requests', base: 98, tolerance: 1 },
];
export const CANDIDATES: Record<string, { label: string; scores: number[] }> = {
  lora: { label: 'LoRA r=16, 2 epochs', scores: [84, 99, 65.4, 73.1, 98] },
  full: { label: 'Full fine-tune, 3 epochs', scores: [87, 99, 61.2, 63.5, 95] },
  leak: { label: 'LoRA trained on a scraped FAQ', scores: [97, 99, 65.8, 73.6, 98] },
};

export interface GateState {
  candidate: string;
}
export interface GateResult {
  rows: GateRow[];
  pass: boolean;
  suspicious: boolean;
}

export function gateExperiment(id: string): ExperimentDef<GateState, GateResult> {
  return {
    id,
    initial: { candidate: 'lora' },
    controls: [{ kind: 'select', id: 'cand', label: 'Candidate', options: Object.entries(CANDIDATES).map(([value, c]) => ({ value, label: c.label })), get: (s) => s.candidate, set: (_s, v) => ({ candidate: v }) }],
    compute: (s) => {
      const g = regressionGate(BENCH_BASE.map((b, i) => ({ ...b, candidate: CANDIDATES[s.candidate]!.scores[i]! })));
      return { ...g, suspicious: g.rows[0]!.delta >= 20 };
    },
    readout: (_s, r) => [
      { label: 'Gate', value: r.pass ? 'pass' : `fail (${r.rows.filter((x) => !x.pass).map((x) => x.id).join(', ')})` },
      { label: 'Target-task gain', value: `${r.rows[0]!.delta > 0 ? '+' : ''}${r.rows[0]!.delta} points${r.suspicious ? ': too good, check for contamination' : ''}` },
    ],
  };
}
