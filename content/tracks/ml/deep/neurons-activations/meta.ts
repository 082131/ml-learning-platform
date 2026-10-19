import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/neurons-activations',
  title: 'Neurons, weights, biases and activation functions',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compute the output of a single neuron by hand',
    'Compare sigmoid, tanh and ReLU activations',
    'Explain why networks need non-linear activations',
  ],
  prerequisites: ['ml/classical/logistic-regression'],
  concepts: ['parameter'],
} satisfies LessonMeta;
