// A SIMULATED supervised fine-tuning run, for the SFT lesson's explorer. It is not a trained model: the curves come
// from the formulas below, chosen to reproduce the shapes practitioners see (and that the lesson explains):
// - training loss keeps falling, because the model can memorize its training examples;
// - validation loss falls, bottoms out, then rises once memorization starts (overfitting) — sooner with less data
//   and a higher learning rate;
// - a far-too-high learning rate makes the run unstable;
// - a general-skills score drifts down as the model specializes (catastrophic forgetting), and LoRA forgets less
//   than full fine-tuning (as reported by Biderman et al. 2024, "LoRA Learns Less and Forgets Less").

export type SftMethod = 'full' | 'lora';

export interface SftInput {
  method: SftMethod;
  /** Learning rate, as a multiple of the usual starting point (2e-5 for full fine-tuning, 2e-4 for LoRA). */
  lrScale: number;
  epochs: number;
  examples: number;
}

export interface SftPoint {
  epoch: number;
  train: number;
  val: number;
  general: number;
}

export interface SftResult {
  points: SftPoint[];
  /** The evaluation point with the lowest validation loss: where early stopping keeps the checkpoint. */
  best: SftPoint;
  diverged: boolean;
  /** Validation loss at the end minus at the best point. */
  overfitGap: number;
}

export const BASE_LR: Record<SftMethod, number> = { full: 2e-5, lora: 2e-4 };
const START = 2.0;
const GENERAL_BEFORE = 62;

export function simulateSft(x: SftInput, evalsPerEpoch = 4): SftResult {
  const rate = Math.sqrt(x.lrScale) * (x.method === 'lora' ? 0.85 : 1);
  const dataFactor = 1000 / x.examples;
  const floor = 0.95 + 0.35 * Math.sqrt(dataFactor); // more data, lower reachable validation loss
  const diverged = x.lrScale >= 10;
  const points: SftPoint[] = [];
  const n = Math.max(1, Math.round(x.epochs * evalsPerEpoch));
  for (let k = 0; k <= n; k++) {
    const t = k / evalsPerEpoch;
    const learn = 1 - Math.exp(-1.8 * rate * t);
    const memo = 1 - Math.exp(-0.22 * rate * t * dataFactor);
    let train = START - (START - floor) * learn - 0.75 * floor * memo * memo;
    let val = START - (START - floor) * learn + 0.9 * memo * memo * (x.method === 'lora' ? 0.8 : 1);
    if (diverged && t > 0.25) {
      const blow = Math.min(1, (t - 0.25) * 2);
      train = train + (3.2 - train) * blow;
      val = val + (3.4 - val) * blow;
    }
    const maxDrop = (x.method === 'full' ? 9 : 3.5) * Math.min(2, Math.sqrt(x.lrScale));
    const general = GENERAL_BEFORE - maxDrop * (1 - Math.exp(-0.45 * rate * t)) - (diverged && t > 0.25 ? 20 : 0);
    points.push({ epoch: t, train: r3(train), val: r3(val), general: Math.round(general * 10) / 10 });
  }
  const best = points.slice(1).reduce((b, p) => (p.val < b!.val ? p : b), (points[1] ?? points[0])!);
  return { points, best, diverged, overfitGap: r3(points[points.length - 1]!.val - best!.val) };
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
export { GENERAL_BEFORE };
