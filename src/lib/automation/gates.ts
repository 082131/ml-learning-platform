// A release gate for a retrained model: the candidate must beat the production model (the champion) by a margin,
// stay within the latency budget, not regress on any slice, and come from data that passed validation. Production
// deploys also wait for a human approval (a GitHub environment with required reviewers).

export interface ModelMetrics {
  /** Area under the ROC curve on the shared evaluation set. */
  auc: number;
  /** 95th percentile latency in milliseconds, from the load test. */
  p95: number;
  /** AUC on each important slice, same order for both models. */
  slices: number[];
}

export interface GateInput {
  candidate: ModelMetrics;
  champion: ModelMetrics;
  /** Minimum AUC improvement to be worth a deploy. */
  minGain: number;
  latencyBudget: number;
  /** Largest AUC drop allowed on any single slice. */
  sliceTolerance: number;
  dataChecksPassed: boolean;
  approved: boolean;
}

export interface Gate {
  name: string;
  pass: boolean;
  detail: string;
}

export interface GateResult {
  gates: Gate[];
  decision: 'blocked' | 'waiting for approval' | 'deploy to production';
  /** The stage the candidate reaches: registered only, staging, or production. */
  stage: 'registered' | 'staging' | 'production';
}

const f3 = (x: number) => x.toFixed(3);

export function evaluateGates(i: GateInput): GateResult {
  const gain = i.candidate.auc - i.champion.auc;
  const drops = i.candidate.slices.map((c, k) => i.champion.slices[k]! - c);
  const worst = Math.max(...drops);
  const worstIdx = drops.indexOf(worst);
  const gates: Gate[] = [
    { name: 'Data checks', pass: i.dataChecksPassed, detail: i.dataChecksPassed ? 'schema and drift checks passed' : 'validation failed: the run should have stopped before training' },
    { name: 'Beats production', pass: gain >= i.minGain - 1e-9, detail: `AUC ${f3(i.candidate.auc)} vs ${f3(i.champion.auc)}: gain ${f3(gain)}, need ${f3(i.minGain)}` },
    { name: 'No slice regresses', pass: worst <= i.sliceTolerance + 1e-9, detail: `worst slice change ${f3(-worst)} on slice ${worstIdx + 1} (tolerance -${f3(i.sliceTolerance)})` },
    { name: 'Latency budget', pass: i.candidate.p95 <= i.latencyBudget, detail: `p95 ${i.candidate.p95} ms, budget ${i.latencyBudget} ms` },
  ];
  const automatic = gates.every((g) => g.pass);
  gates.push({ name: 'Human approval (production)', pass: automatic && i.approved, detail: !automatic ? 'not requested: an automatic gate failed' : i.approved ? 'approved by a required reviewer' : 'waiting for a required reviewer' });
  if (!automatic) return { gates, decision: 'blocked', stage: 'registered' };
  return i.approved ? { gates, decision: 'deploy to production', stage: 'production' } : { gates, decision: 'waiting for approval', stage: 'staging' };
}
