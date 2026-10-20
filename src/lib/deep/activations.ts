/** Activation functions and their derivatives, as used by the deep learning lessons. */

export type ActivationId = 'sigmoid' | 'tanh' | 'relu' | 'identity';

export interface Activation {
  id: ActivationId;
  label: string;
  /** The formula in plain text, for captions. */
  formula: string;
  /** The same function written with NumPy, applied to an array named z (for code panels). */
  numpy: string;
  f: (z: number) => number;
  /** Derivative with respect to z. */
  df: (z: number) => number;
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export const ACTIVATIONS: Record<ActivationId, Activation> = {
  sigmoid: {
    id: 'sigmoid',
    label: 'Sigmoid',
    formula: 'σ(z) = 1 / (1 + e^(−z))',
    numpy: '1 / (1 + np.exp(-z))',
    f: sigmoid,
    df: (z) => sigmoid(z) * (1 - sigmoid(z)),
  },
  tanh: {
    id: 'tanh',
    label: 'Tanh',
    formula: 'tanh(z) = (e^z − e^(−z)) / (e^z + e^(−z))',
    numpy: 'np.tanh(z)',
    f: Math.tanh,
    df: (z) => 1 - Math.tanh(z) ** 2,
  },
  relu: {
    id: 'relu',
    label: 'ReLU',
    formula: 'ReLU(z) = max(0, z)',
    numpy: 'np.maximum(0, z)',
    f: (z) => Math.max(0, z),
    // The derivative is undefined at exactly 0; like PyTorch, we use 0 there.
    df: (z) => (z > 0 ? 1 : 0),
  },
  identity: {
    id: 'identity',
    label: 'None (identity)',
    formula: 'f(z) = z',
    numpy: 'z',
    f: (z) => z,
    df: () => 1,
  },
};

export const activationOf = (id: string): Activation =>
  ACTIVATIONS[id as ActivationId] ?? ACTIVATIONS.identity;
