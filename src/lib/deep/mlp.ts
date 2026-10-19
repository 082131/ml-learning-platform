import { matmul, shapeOf, transpose, type Matrix } from '../math/matrix';
import { activationOf, type ActivationId } from './activations';
import { mulberry32, normalSampler } from './rng';

/**
 * A dense (fully connected) layer in the X @ W + b convention of the matrix lessons:
 * X is (batch, in), W is (in, out), b has length out, so Z = X @ W + b is (batch, out).
 * (PyTorch's nn.Linear stores its weight transposed, as (out, in), and computes X @ W.T + b.)
 */
export interface Layer {
  W: number[][];
  b: number[];
  activation: ActivationId;
}
export type Network = Layer[];

export type LossId = 'mse' | 'bce';

/** Everything the forward pass computed: A[0] is the input X, A[l + 1] = activation(Z[l]). */
export interface ForwardCache {
  Z: number[][][];
  A: number[][][];
}

export interface LayerGrads {
  dW: number[][];
  db: number[];
}

/** The gradients plus the intermediate terms a step-through shows: dL/dZ and dL/dA per layer. */
export interface Backward {
  grads: LayerGrads[];
  dZ: number[][][];
  /** dA[l] is dL/dA[l]: dA[0] is the gradient with respect to the input. */
  dA: number[][][];
}

/** Probabilities are clipped this far from 0 and 1 before taking logs, as libraries do. */
export const BCE_EPS = 1e-7;

const addBias = (Z: number[][], b: readonly number[]) => Z.map((row) => row.map((z, j) => z + b[j]!));

/** Z = X @ W + b for one layer. Throws a ShapeError when X's columns differ from W's rows. */
export function dense(X: Matrix, layer: Layer): number[][] {
  return addBias(matmul(X, layer.W), layer.b);
}

/** Runs X (batch, in) through every layer and keeps each layer's Z and A for backprop. */
export function forward(net: Network, X: Matrix): ForwardCache {
  const A: number[][][] = [X.map((r) => [...r])];
  const Z: number[][][] = [];
  for (const layer of net) {
    const z = dense(A.at(-1)!, layer);
    const act = activationOf(layer.activation);
    Z.push(z);
    A.push(z.map((row) => row.map(act.f)));
  }
  return { Z, A };
}

/** The network's output for X: the last A. */
export const predict = (net: Network, X: Matrix) => forward(net, X).A.at(-1)!;

const clip = (p: number) => Math.min(1 - BCE_EPS, Math.max(BCE_EPS, p));

/**
 * Mean loss over every entry of the batch. MSE: mean of (ŷ − y)². Binary cross-entropy (BCE):
 * mean of −[y·log ŷ + (1 − y)·log(1 − ŷ)], with ŷ clipped to [ε, 1 − ε].
 */
export function loss(id: LossId, Yhat: Matrix, Y: Matrix): number {
  const [n, k] = shapeOf(Yhat);
  const [ny, ky] = shapeOf(Y);
  if (n !== ny || k !== ky) throw new Error(`Predictions are (${n}, ${k}) but targets are (${ny}, ${ky})`);
  let total = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < k; j++) {
      const p = Yhat[i]![j]!;
      const y = Y[i]![j]!;
      total += id === 'mse' ? (p - y) ** 2 : -(y * Math.log(clip(p)) + (1 - y) * Math.log(1 - clip(p)));
    }
  return total / (n * k);
}

/** dL/dŷ for the mean loss, one entry per prediction. */
export function lossGrad(id: LossId, Yhat: Matrix, Y: Matrix): number[][] {
  const count = Yhat.length * Yhat[0]!.length;
  return Yhat.map((row, i) =>
    row.map((p, j) => {
      const y = Y[i]![j]!;
      if (id === 'mse') return (2 * (p - y)) / count;
      const q = clip(p);
      return (q - y) / (q * (1 - q) * count);
    }),
  );
}

const hadamard = (a: number[][], b: number[][]) => a.map((r, i) => r.map((x, j) => x * b[i]![j]!));
const columnSums = (m: number[][]) => m[0]!.map((_, j) => m.reduce((s, r) => s + r[j]!, 0));

/**
 * Backpropagation: the chain rule applied layer by layer from the loss back to the input.
 * For each layer, dZ = dA ⊙ f'(Z), dW = Aprevᵀ @ dZ, db = column sums of dZ, dAprev = dZ @ Wᵀ.
 * With BCE on a sigmoid output, dZ simplifies to (ŷ − y) / count, which is also numerically safer.
 */
export function backward(net: Network, cache: ForwardCache, Y: Matrix, lossId: LossId): Backward {
  const L = net.length;
  const grads: LayerGrads[] = Array(L);
  const dZs: number[][][] = Array(L);
  const dAs: number[][][] = Array(L + 1);
  const Yhat = cache.A[L]!;
  dAs[L] = lossGrad(lossId, Yhat, Y);
  for (let l = L - 1; l >= 0; l--) {
    const act = activationOf(net[l]!.activation);
    const fused = l === L - 1 && lossId === 'bce' && act.id === 'sigmoid';
    const count = Yhat.length * Yhat[0]!.length;
    const dZ = fused
      ? Yhat.map((row, i) => row.map((p, j) => (p - Y[i]![j]!) / count))
      : hadamard(dAs[l + 1]!, cache.Z[l]!.map((row) => row.map(act.df)));
    dZs[l] = dZ;
    grads[l] = { dW: matmul(transpose(cache.A[l]!), dZ), db: columnSums(dZ) };
    dAs[l] = matmul(dZ, transpose(net[l]!.W));
  }
  return { grads, dZ: dZs, dA: dAs };
}

/** Loss and exact gradients for one batch. */
export function lossAndGrads(net: Network, X: Matrix, Y: Matrix, lossId: LossId) {
  const cache = forward(net, X);
  return { loss: loss(lossId, cache.A.at(-1)!, Y), cache, ...backward(net, cache, Y, lossId) };
}

/** A deep copy, so updates never change a network another component still holds. */
export const cloneNetwork = (net: Network): Network =>
  net.map((l) => ({ W: l.W.map((r) => [...r]), b: [...l.b], activation: l.activation }));

/**
 * Central-difference estimate of every gradient: (L(θ + ε) − L(θ − ε)) / 2ε, one parameter at a time.
 * Slow (two forward passes per parameter) but independent of backprop, so it checks it.
 */
export function numericalGrads(net: Network, X: Matrix, Y: Matrix, lossId: LossId, eps = 1e-5): LayerGrads[] {
  const at = (n: Network) => loss(lossId, predict(n, X), Y);
  return net.map((layer, l) => {
    const nudge = (edit: (n: Network, d: number) => void) => {
      const plus = cloneNetwork(net);
      const minus = cloneNetwork(net);
      edit(plus, eps);
      edit(minus, -eps);
      return (at(plus) - at(minus)) / (2 * eps);
    };
    return {
      dW: layer.W.map((row, i) => row.map((_, j) => nudge((n, d) => (n[l]!.W[i]![j]! += d)))),
      db: layer.b.map((_, j) => nudge((n, d) => (n[l]!.b[j]! += d))),
    };
  });
}

/** Largest |a − b| / max(1, |a|, |b|) over all gradients: below about 1e-6 means backprop agrees. */
export function maxRelativeError(a: LayerGrads[], b: LayerGrads[]): number {
  let worst = 0;
  const cmp = (x: number, y: number) =>
    (worst = Math.max(worst, Math.abs(x - y) / Math.max(1, Math.abs(x), Math.abs(y))));
  a.forEach((g, l) => {
    g.dW.forEach((row, i) => row.forEach((x, j) => cmp(x, b[l]!.dW[i]![j]!)));
    g.db.forEach((x, j) => cmp(x, b[l]!.db[j]!));
  });
  return worst;
}

/** One plain gradient descent step on every weight and bias: θ ← θ − η·∂L/∂θ. Returns a new network. */
export function sgdStep(net: Network, grads: LayerGrads[], lr: number): Network {
  return net.map((layer, l) => ({
    activation: layer.activation,
    W: layer.W.map((row, i) => row.map((w, j) => w - lr * grads[l]!.dW[i]![j]!)),
    b: layer.b.map((b, j) => b - lr * grads[l]!.db[j]!),
  }));
}

/** Total number of weights and biases. */
export const parameterCount = (net: Network) =>
  net.reduce((n, l) => n + l.W.length * l.W[0]!.length + l.b.length, 0);

/**
 * Random initial weights for layer sizes [in, h1, …, out]. ReLU layers use He initialization
 * (normal with std √(2 / fan_in)); others use Xavier/Glorot (normal with std √(2 / (fan_in + fan_out))).
 * Biases start at 0. The same seed always gives the same network.
 */
export function initNetwork(
  sizes: readonly number[],
  hidden: ActivationId,
  output: ActivationId,
  seed: number,
): Network {
  const normal = normalSampler(mulberry32(seed));
  return sizes.slice(1).map((out, l) => {
    const fanIn = sizes[l]!;
    const activation = l === sizes.length - 2 ? output : hidden;
    const std = activation === 'relu' ? Math.sqrt(2 / fanIn) : Math.sqrt(2 / (fanIn + out));
    return {
      activation,
      W: Array.from({ length: fanIn }, () => Array.from({ length: out }, () => normal() * std)),
      b: Array<number>(out).fill(0),
    };
  });
}
