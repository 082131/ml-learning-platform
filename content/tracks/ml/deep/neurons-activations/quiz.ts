import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'z-by-hand',
    type: 'numeric',
    prompt: 'A neuron has x = [2, -1], w = [0.5, 1.5] and b = 1. What is z = w·x + b?',
    answer: 0.5,
    tolerance: 0,
    hint: 'Multiply matching entries, add them, then add the bias: 0.5·2 + 1.5·(-1) + 1.',
    explain: '0.5·2 + 1.5·(-1) + 1 = 1 - 1.5 + 1 = 0.5.',
  },
  {
    id: 'relu-value',
    type: 'numeric',
    prompt: 'The same neuron uses ReLU, but its bias is changed to b = -1. What is its output a?',
    answer: 0,
    tolerance: 0,
    hint: 'First recompute z with the new bias, then apply max(0, z).',
    explain: 'z = 1 - 1.5 - 1 = -1.5, and ReLU(-1.5) = max(0, -1.5) = 0.',
  },
  {
    id: 'why-nonlinear',
    type: 'choice',
    prompt: 'Why do networks put a non-linear activation between layers?',
    options: [
      {
        text: 'Without it, any stack of layers equals one linear layer, so depth adds nothing',
        correct: true,
        explain:
          '(x @ W1 + b1) @ W2 + b2 = x @ (W1 @ W2) + (b1 @ W2 + b2): one weight matrix and one bias. The activation breaks this.',
      },
      {
        text: 'To keep the outputs between 0 and 1',
        correct: false,
        explain:
          'Only some activations do that (sigmoid). ReLU and tanh do not, and they work well between layers.',
      },
      {
        text: 'To make the forward pass faster',
        correct: false,
        explain:
          'An activation is an extra step, so it costs time. It is there because of what it lets the network represent.',
      },
      {
        text: 'Because the weights cannot be negative otherwise',
        correct: false,
        explain: 'Weights can be any real number with or without an activation.',
      },
    ],
  },
  {
    id: 'saturation',
    type: 'choice',
    prompt: 'A sigmoid neuron has z = 8. What happens to its output when z changes a little?',
    options: [
      {
        text: 'Almost nothing: σ is nearly flat there (its slope is about 0.0003)',
        correct: true,
        explain:
          'σ(8) ≈ 0.9997, and σ′(8) = σ(8)(1 − σ(8)) ≈ 0.0003. A flat activation passes back tiny gradients, which slows learning.',
      },
      {
        text: 'It changes by about the same amount as z',
        correct: false,
        explain: 'That is true only where the slope is near 1, such as ReLU for positive z, or tanh near 0.',
      },
      {
        text: 'It becomes negative',
        correct: false,
        explain: 'Sigmoid outputs are always between 0 and 1.',
      },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps a neuron performs in order.',
    items: [
      'Multiply each input by its weight',
      'Add the products together',
      'Add the bias to get z',
      'Apply the activation function to get a',
    ],
    explain: 'z = w·x + b first (weights, sum, bias), then a = f(z).',
  },
];

export const neuronExercise: Exercise = {
  id: 'neuron-function',
  prompt:
    'Write `neuron(x, w, b, activation)` in plain Python (no NumPy). It returns the pair `(z, a)`. Support "sigmoid", "tanh" and "relu"; any other name means no activation (a = z).',
  starter: `import math

def neuron(x, w, b, activation):
    # z is the weighted sum plus the bias; a applies the activation to z
    pass`,
  hints: [
    'The weighted sum is `sum(wi * xi for wi, xi in zip(w, x))`. Add `b` to it.',
    'Use `math.exp` for the sigmoid, `math.tanh` for tanh and `max(0.0, z)` for ReLU.',
    'Return both values as a tuple: `return z, a`.',
  ],
  solution: `import math

def neuron(x, w, b, activation):
    z = sum(wi * xi for wi, xi in zip(w, x)) + b
    if activation == "sigmoid":
        a = 1 / (1 + math.exp(-z))
    elif activation == "tanh":
        a = math.tanh(z)
    elif activation == "relu":
        a = max(0.0, z)
    else:
        a = z
    return z, a`,
  explanation:
    'z combines the inputs linearly, and the activation is applied once, to z. Returning z as well as a is useful later: backpropagation needs z to compute the slope of the activation.',
  tests: `z, a = neuron([1.0, 2.0], [0.5, -1.0], 0.5, "sigmoid")
assert abs(z - (-1.0)) < 1e-9, f'z should be 0.5*1 + (-1)*2 + 0.5 = -1.0, got {z}'
assert abs(a - 0.2689414213699951) < 1e-9, f'sigmoid(-1) should be about 0.2689, got {a}'
assert neuron([1.0, 2.0], [0.5, -1.0], 0.5, "relu") == (-1.0, 0.0), 'ReLU of a negative z should be 0.0'
z, a = neuron([3.0], [2.0], -1.0, "tanh")
assert abs(a - 0.9999092042625951) < 1e-9, f'tanh(5) should be about 0.99991, got {a}'
assert neuron([2.0, -1.0], [0.5, 1.5], 1.0, "none") == (0.5, 0.5), 'with no activation, a should equal z'`,
};
