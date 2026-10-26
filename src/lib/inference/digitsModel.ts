/** A two-layer classifier (64 → hidden → 10) with weights stored as (out, in), like torch.nn.Linear. */
export interface DigitsModel {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  test: { X: number[][]; y: number[] };
  /** Test images the float model gets right, computed when the weights were generated. */
  floatCorrect: number;
  source: string;
}

/** Pixels are 0–16; the model was trained on pixels / 16. */
export const PIXEL_MAX = 16;

/** Predicted digit: argmax(W2 · relu(W1 · x + b1) + b2), summing in index order. */
export function predict(W1: number[][], b1: number[], W2: number[][], b2: number[], image: number[]): number {
  const x = image.map((p) => p / PIXEL_MAX);
  const h = W1.map((row, i) => {
    let s = 0;
    for (let k = 0; k < row.length; k++) s += row[k]! * x[k]!;
    return Math.max(0, s + b1[i]!);
  });
  let best = 0;
  let bestLogit = -Infinity;
  W2.forEach((row, j) => {
    let s = 0;
    for (let k = 0; k < row.length; k++) s += row[k]! * h[k]!;
    const logit = s + b2[j]!;
    if (logit > bestLogit) {
      bestLogit = logit;
      best = j;
    }
  });
  return best;
}

/** How many test images the model with these weight matrices classifies correctly. */
export function countCorrect(m: DigitsModel, W1: number[][], W2: number[][]): number {
  return m.test.X.reduce(
    (n, image, i) => n + (predict(W1, m.b1, W2, m.b2, image) === m.test.y[i] ? 1 : 0),
    0,
  );
}
