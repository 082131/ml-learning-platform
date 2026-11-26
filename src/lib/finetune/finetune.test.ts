// Hand-worked checks for the LLM fine-tuning track's logic. Every number here is also used in a lesson's prose.
import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { payback, recommendApproach } from './decide';
import { contaminated, dedup, jaccard, minhash, minhashSimilarity, normalize, shingles } from './dedup';
import { regressionGate, sampleSize, swapConsistent, wilson, winRate } from './evalstats';
import * as ex from './experiments';
import { sequenceLoss, softmax, tokenLoss, uniformLoss } from './loss';
import { getModel, loraCount, loraScale, matmul, mergeLora, rank } from './lora';
import { activationBytes, estimateMemory, NF4_BYTES_PER_PARAM } from './memory';
import { bradleyTerry, dpoLoss, kl, klOptimum, logSigmoid, sigmoid, trainDpo } from './preference';
import { computeBudget, computeOptimal, gpuHours, trainingFlops } from './scaling';
import { batchMath, clipByNorm, lrAt, type ScheduleInput } from './schedule';
import { simulateSft } from './sft';
import { labels, maskSummary, pack, renderChat, toyTokenize } from './template';

describe('next-token loss', () => {
  it('−ln p per token, perplexity = e^mean', () => {
    expect(tokenLoss(1)).toBe(0);
    expect(tokenLoss(0.5)).toBeCloseTo(0.6931, 4);
    const r = sequenceLoss([0.05, 0.6, 0.2, 0.7, 0.8]);
    // 2.9957 + 0.5108 + 1.6094 + 0.3567 + 0.2231 = 5.6958; / 5 = 1.1392
    expect(r.mean).toBeCloseTo(1.1392, 3);
    expect(r.perplexity).toBeCloseTo(3.124, 2);
    expect(sequenceLoss([0.25, 0.25]).perplexity).toBeCloseTo(4, 10);
    expect(uniformLoss(50000)).toBeCloseTo(10.82, 2);
  });
  it('one confident mistake dominates the average', () => {
    expect(sequenceLoss([0.05, 0.6, 0.2, 0.7, 0.01]).mean).toBeCloseTo((5.6958 - 0.2231 + 4.6052) / 5, 3);
  });
  it('rejects impossible probabilities', () => expect(() => tokenLoss(0)).toThrow());
  it('softmax sums to 1', () => expect(softmax([1, 2, 3]).reduce((a, b) => a + b)).toBeCloseTo(1, 12));
});

describe('prompt, RAG or fine-tune', () => {
  it('prompting first, then RAG for facts, then data, then fine-tuning', () => {
    expect(recommendApproach({ problem: 'format', factsChange: false, examples: 2000, promptTried: false }).approach).toBe('prompt');
    expect(recommendApproach({ problem: 'facts', factsChange: true, examples: 9000, promptTried: true }).approach).toBe('rag');
    expect(recommendApproach({ problem: 'format', factsChange: false, examples: 40, promptTried: true }).approach).toBe('collect-data');
    const ft = recommendApproach({ problem: 'cost', factsChange: true, examples: 1500, promptTried: true });
    expect(ft.approach).toBe('fine-tune');
    expect(ft.reasons.some((r) => r.includes('retrieval'))).toBe(true);
  });
  it('payback: 20,000 requests × 1,500 tokens × $3/M × 30 days = $2,700 a month', () => {
    const r = payback({ requestsPerDay: 20000, savedTokens: 1500, pricePerMTok: 3, trainTokensM: 15, trainPricePerMTok: 8, peopleCost: 6000 });
    expect(r.savedPerMonth).toBeCloseTo(2700, 6);
    expect(r.oneTime).toBe(6120);
    expect(r.paybackMonths).toBeCloseTo(2.267, 3);
    expect(payback({ requestsPerDay: 1, savedTokens: 0, pricePerMTok: 3, trainTokensM: 1, trainPricePerMTok: 1, peopleCost: 0 }).paybackMonths).toBeNull();
  });
});

describe('compute budgets', () => {
  it('C = 6ND', () => {
    expect(trainingFlops(7e9, 2e12)).toBe(8.4e22);
    // Chinchilla: 70B params, 1.4T tokens → 5.88e23 FLOPs, and back again
    const o = computeOptimal(trainingFlops(70e9, 1.4e12));
    expect(o.params).toBeCloseTo(70e9, -6);
    expect(o.tokens).toBeCloseTo(1.4e12, -8);
  });
  it('GPU-hours at 40% MFU on H100', () => {
    // 8.4e22 / (989e12 × 0.4) = 2.1234e8 s = 58,983 h
    expect(gpuHours(8.4e22, 989e12, 0.4)).toBeCloseTo(58983, -1);
    const r = computeBudget({ paramsB: 7, tokensB: 2000, gpu: 'h100', mfu: 0.4, gpus: 512, dollarsPerGpuHour: 2.5 });
    expect(r.days).toBeCloseTo(58983 / 512 / 24, 1);
    expect(r.tokensPerParam).toBeCloseTo(285.7, 1);
  });
});

describe('schedules and batches', () => {
  const cos: ScheduleInput = { kind: 'cosine', peak: 2e-4, warmupSteps: 30, totalSteps: 1000, minRatio: 0.1 };
  it('linear warmup then cosine down to the floor', () => {
    expect(lrAt(0, cos)).toBe(0);
    expect(lrAt(15, cos)).toBeCloseTo(1e-4, 12);
    expect(lrAt(30, cos)).toBeCloseTo(2e-4, 12);
    // halfway through the decay: floor + (peak − floor)/2 = 2e-5 + 9e-5
    expect(lrAt(515, cos)).toBeCloseTo(1.1e-4, 12);
    expect(lrAt(1000, cos)).toBeCloseTo(2e-5, 12);
  });
  it('linear, constant and WSD', () => {
    expect(lrAt(515, { ...cos, kind: 'linear' })).toBeCloseTo(1.1e-4, 12);
    expect(lrAt(700, { ...cos, kind: 'constant' })).toBe(2e-4);
    const wsd = { ...cos, kind: 'wsd' as const, decayFraction: 0.2 };
    expect(lrAt(799, wsd)).toBe(2e-4);
    expect(lrAt(900, wsd)).toBeCloseTo(1.1e-4, 12);
  });
  it('tokens per step = micro × accumulation × GPUs × length', () => {
    const r = batchMath({ microBatch: 4, gradAccum: 8, gpus: 2, seqLen: 2048, datasetTokens: 20e6, epochs: 3 });
    expect(r.sequencesPerStep).toBe(64);
    expect(r.tokensPerStep).toBe(131072);
    expect(r.stepsPerEpoch).toBe(153); // 20,000,000 / 131,072 = 152.6 → 153
    expect(r.totalSteps).toBe(459);
  });
  it('clipping by global norm', () => {
    const r = clipByNorm([3, 4], 1);
    expect(r.norm).toBe(5);
    expect(r.clipped[0]).toBeCloseTo(0.6, 12);
    expect(clipByNorm([0.3, 0.4], 1).scale).toBe(1);
  });
});

describe('chat templates, masks and packing', () => {
  it('toy tokens', () => expect(toyTokenize('Open Settings, then click.')).toEqual(['Open', 'Settings', ',', 'then', 'click', '.']));
  it('assistant-only loss trains the reply and its end token, not the header', () => {
    const toks = renderChat(ex.CONVERSATIONS.single!.messages, 'assistant');
    const trained = toks.filter((t) => t.trained).map((t) => t.text);
    // "Open Settings , choose Security , then click Reset password ." = 11 tokens + <|im_end|>
    expect(trained).toEqual(['Open', 'Settings', ',', 'choose', 'Security', ',', 'then', 'click', 'Reset', 'password', '.', '<|im_end|>']);
    expect(labels(toks).filter((l) => l === -100).length).toBe(toks.length - 12);
  });
  it('mask modes on the two-turn chat', () => {
    const msgs = ex.CONVERSATIONS.multi!.messages;
    const all = maskSummary(renderChat(msgs, 'all'));
    const asst = maskSummary(renderChat(msgs, 'assistant'));
    const last = maskSummary(renderChat(msgs, 'last'));
    expect(all.trained).toBe(all.total);
    // second reply: "Check your spam folder , then request a new link after five minutes ." = 14 + end token
    expect(last.trained).toBe(15);
    expect(asst.trained).toBe(12 + 15);
    expect(asst.total).toBe(all.total);
  });
  it('padding versus best-fit-decreasing packing', () => {
    const lengths = ex.PACK_DATASETS.chat!.lengths; // sum 4,240
    const pad = pack(lengths, 1024, 'pad');
    expect(pad.blocks.length).toBe(12);
    expect(pad.realTokens).toBe(4240);
    expect(pad.padding).toBe(12 * 1024 - 4240);
    const packed = pack(lengths, 1024, 'pack');
    expect(packed.blocks.length).toBe(5); // ⌈4240 / 1024⌉ = 5, and best-fit reaches it
    expect(packed.blocks.every((b) => b.used <= 1024)).toBe(true);
    expect(packed.efficiency).toBeCloseTo(4240 / 5120, 10);
    const long = pack(ex.PACK_DATASETS.mixed!.lengths, 1024, 'pack');
    expect(long.truncated).toBe(2600 - 1024 + (1500 - 1024));
  });
});

describe('deduplication and contamination', () => {
  it('normalizes and shingles', () => {
    expect(normalize('How do I reset my password!')).toBe('how do i reset my password');
    expect([...shingles('a b c d', 3)]).toEqual(['a b c', 'b c d']);
    expect([...shingles('a b', 3)]).toEqual(['a b']);
  });
  it('Jaccard by hand', () => {
    expect(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBe(0.5);
    const d0 = shingles(ex.TRAIN_DOCS[0]!, 3);
    expect(jaccard(d0, shingles(ex.TRAIN_DOCS[1]!, 3))).toBe(1); // same text after normalizing
  });
  it('MinHash estimates Jaccard', () => {
    const a = shingles(ex.TRAIN_DOCS[3]!, 2);
    const b = shingles(ex.TRAIN_DOCS[4]!, 2);
    const exact = jaccard(a, b);
    const est = minhashSimilarity(minhash(a, 256), minhash(b, 256));
    expect(Math.abs(est - exact)).toBeLessThan(0.12);
  });
  it('flags clusters and keeps the first of each', () => {
    const r = dedup(ex.TRAIN_DOCS, 3, 0.5);
    expect(r.removed).toContain(1);
    expect(r.kept).toContain(0);
    expect(r.kept.length + r.removed.length).toBe(ex.TRAIN_DOCS.length);
  });
  it('contamination depends on the n-gram size', () => {
    expect(contaminated(ex.TRAIN_DOCS, ex.TEST_DOCS, ex.CONTAM_N)).toEqual([0]);
    expect(contaminated(ex.TRAIN_DOCS, ex.TEST_DOCS, 5)).toEqual([0, 2]);
  });
});

describe('LoRA', () => {
  it('r = 16 on all linear layers of an 8B Llama-shaped model is about 42 M parameters', () => {
    const c = loraCount(getModel('8b'), 16, 'all-linear');
    // per layer: 16 × (8192 + 5120 + 5120 + 8192 + 18432 × 3) = 16 × 81,920 = 1,310,720; × 32 layers
    expect(c.trainable).toBe(41943040);
    expect(c.share).toBeCloseTo(0.00522, 4);
    expect(c.adapterBytes).toBe(83886080);
  });
  it('q and v only, rank 8', () => {
    // 32 × 8 × ((4096 + 4096) + (4096 + 1024)) = 3,407,872
    expect(loraCount(getModel('8b'), 8, 'qv').trainable).toBe(3407872);
  });
  it('scale and merge', () => {
    expect(loraScale(32, 16)).toBe(2);
    expect(loraScale(32, 16, true)).toBe(8);
    const b = ex.LORA_FACTORS[1]!.b;
    const a = ex.LORA_FACTORS[1]!.a;
    expect(matmul(b, a)).toEqual([
      [0, 1, 0, 1],
      [0, 0, 0, 0],
      [0, 2, 0, 2],
      [0, 0, 0, 0],
    ]);
    const { merged } = mergeLora(ex.LORA_W, b, a, 1);
    expect(merged[0]).toEqual([2, 1, 1, 1]);
    expect(rank(matmul(b, a))).toBe(1);
    expect(rank(matmul(ex.LORA_FACTORS[2]!.b, ex.LORA_FACTORS[2]!.a))).toBe(2);
    expect(rank(ex.LORA_W)).toBe(4);
  });
});

describe('training memory', () => {
  const x = { model: '8b', seqLen: 2048, batch: 1, checkpointing: true, rank: 16 };
  it('full fine-tuning: 16 bytes per parameter before activations', () => {
    const e = estimateMemory('full', x);
    expect(e.parts.weights + e.parts.gradients + e.parts.optimizer).toBe(16 * 8.03e9);
    expect(e.total).toBeGreaterThan(80e9);
  });
  it('LoRA and QLoRA', () => {
    const lora = estimateMemory('lora', x);
    const qlora = estimateMemory('qlora', x);
    expect(lora.parts.weights).toBe(2 * 8.03e9 + 2 * 41943040);
    expect(qlora.parts.weights).toBeCloseTo(NF4_BYTES_PER_PARAM * 8.03e9 + 2 * 41943040, 0);
    expect(lora.total).toBeLessThan(24e9);
    expect(qlora.total).toBeLessThan(10e9);
  });
  it('activation estimate', () => {
    const m = getModel('8b');
    expect(activationBytes(m, 2048, 1, false)).toBe(32 * 34 * 2048 * 4096);
    expect(activationBytes(m, 2048, 1, true)).toBe(32 * 2 * 2048 * 4096 + 34 * 2048 * 4096);
  });
});

describe('preferences, KL and DPO', () => {
  it('sigmoid and log-sigmoid', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(logSigmoid(-800)).toBeCloseTo(-800, 6);
    expect(logSigmoid(2)).toBeCloseTo(Math.log(sigmoid(2)), 12);
  });
  it('Bradley-Terry: a reward gap of 1 means a 73% preference', () => {
    const r = bradleyTerry(1.5, 0.5);
    expect(r.prob).toBeCloseTo(0.7311, 4);
    expect(r.loss).toBeCloseTo(0.3133, 4);
    expect(bradleyTerry(0, 0).loss).toBeCloseTo(Math.LN2, 12);
  });
  it('KL', () => {
    expect(kl([0.5, 0.5], [0.5, 0.5])).toBe(0);
    expect(kl([1, 0], [0.5, 0.5])).toBeCloseTo(Math.LN2, 12);
  });
  it('the KL-regularized optimum tilts the reference by exp(r/β)', () => {
    const ref = ex.KL_RESPONSES.map((r) => r.ref);
    const rew = ex.KL_RESPONSES.map((r) => r.reward);
    const o = klOptimum(ref, rew, 1);
    // weights 0.3e², 0.4e, 0.1e^2.6, 0.2e^−1.5 = 2.2167, 1.0873, 1.3464, 0.0446; sum 4.6950
    expect(o.policy[0]).toBeCloseTo(0.4721, 3);
    expect(o.policy[2]).toBeCloseTo(0.2868, 3);
    expect(klOptimum(ref, rew, 0.1).policy[2]).toBeGreaterThan(0.9);
    expect(klOptimum(ref, rew, 1000).kl).toBeLessThan(1e-4);
  });
  it('DPO loss on log-probabilities', () => {
    const r = dpoLoss({ policyChosen: -40, policyRejected: -46, refChosen: -42, refRejected: -44, beta: 0.1 });
    // rewards 0.1 × 2 = 0.2 and 0.1 × (−2) = −0.2; margin 0.4; loss −ln σ(0.4) = 0.5130
    expect(r.rewardChosen).toBeCloseTo(0.2, 12);
    expect(r.margin).toBeCloseTo(0.4, 12);
    expect(r.loss).toBeCloseTo(0.513, 3);
    expect(dpoLoss({ policyChosen: -42, policyRejected: -44, refChosen: -42, refRejected: -44, beta: 0.1 }).loss).toBeCloseTo(Math.LN2, 12);
  });
  it('toy DPO training moves probability toward the preferred answers', () => {
    const run = trainDpo(ex.KL_RESPONSES.map((r) => r.ref), ex.DPO_PAIRS, 0.5, 0.5, 100);
    expect(run[0]!.loss).toBeCloseTo(Math.LN2, 12);
    const last = run[run.length - 1];
    expect(last!.loss).toBeLessThan(run[0]!.loss);
    expect(last!.accuracy).toBe(1);
    expect(last!.probs[0]).toBeGreaterThan(0.3);
    expect(last!.probs[3]).toBeLessThan(0.2);
  });
});

describe('evaluation statistics', () => {
  it('Wilson interval by hand: 63 of 100', () => {
    const w = wilson(63, 100);
    expect(w.low).toBeCloseTo(0.5321, 3);
    expect(w.high).toBeCloseTo(0.7181, 3);
  });
  it('win rate with ties as half', () => {
    const r = winRate(58, 32, 10);
    expect(r.rate).toBe(0.63);
    expect(r.verdict).toBe('better');
    expect(winRate(12, 8, 0).verdict).toBe('unclear');
  });
  it('sample size for ±5 points at 50%', () => expect(sampleSize(0.05)).toBe(385));
  it('order-swapped judging', () => {
    const r = swapConsistent(['A', 'A', 'B', 'tie'], ['B', 'A', 'A', 'tie']);
    expect(r.final).toEqual(['A', 'tie', 'B', 'tie']);
    expect(r.inconsistent).toBe(1);
  });
  it('regression gate', () => {
    const g = regressionGate([
      { id: 't', label: 't', base: 71, candidate: 84, tolerance: -5 },
      { id: 'g', label: 'g', base: 66, candidate: 61.2, tolerance: 2 },
    ]);
    expect(g.rows.map((r) => r.pass)).toEqual([true, false]);
    expect(g.rows[1]!.delta).toBe(-4.8);
  });
});

describe('simulated SFT', () => {
  it('less data overfits sooner', () => {
    const small = simulateSft({ method: 'full', lrScale: 1, epochs: 6, examples: 500 });
    const big = simulateSft({ method: 'full', lrScale: 1, epochs: 6, examples: 20000 });
    expect(small.best.epoch).toBeLessThan(big.best.epoch);
    expect(small.overfitGap).toBeGreaterThan(big.overfitGap);
  });
  it('LoRA forgets less', () => {
    const full = simulateSft({ method: 'full', lrScale: 1, epochs: 4, examples: 2000 });
    const lora = simulateSft({ method: 'lora', lrScale: 1, epochs: 4, examples: 2000 });
    expect(lora.points.at(-1)!.general).toBeGreaterThan(full.points.at(-1)!.general);
  });
  it('12× the usual learning rate is unstable', () => expect(simulateSft({ method: 'full', lrScale: 12, epochs: 2, examples: 2000 }).diverged).toBe(true));
});

describe('experiment definitions', () => {
  const defs = Object.entries(ex).filter(([k, v]) => typeof v === 'function' && k.endsWith('Experiment'));
  it('found them', () => expect(defs.length).toBeGreaterThanOrEqual(19));
  for (const [name, make] of defs)
    it(name, () => {
      const def = (make as (id: string) => Parameters<typeof validateExperiment>[0])(name);
      expect(validateExperiment(def)).toEqual([]);
    });
});
