import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/neurons-activations',
  title: 'Neurons, weights, biases and activation functions',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Compute a neuron’s weighted sum z = w·x + b and its output a = f(z) by hand',
    'Compare sigmoid, tanh and ReLU: their ranges, their slopes and where they flatten out',
    'Explain, with numbers, why two linear layers without an activation equal one linear layer',
    'Write a neuron in NumPy and in plain Python, and avoid the array mistakes that break it',
  ],
  prerequisites: ['ml/classical/logistic-regression'],
  concepts: [
    'neuron',
    'pre-activation',
    'activation-function',
    'relu',
    'tanh',
    'neural-network',
    'parameter',
    'dot-product',
  ],
  references: [
    {
      title: 'Deep Learning (Goodfellow, Bengio, Courville), chapter 6: Deep Feedforward Networks',
      url: 'https://www.deeplearningbook.org/contents/mlp.html',
    },
    {
      title: 'numpy.maximum (element-wise maximum, used for ReLU)',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.maximum.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.tanh',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.tanh.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'torch.nn.ReLU (the same activation in PyTorch)',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.ReLU.html',
      version: 'PyTorch stable',
    },
  ],
} satisfies LessonMeta;
