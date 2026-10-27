import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/forward-propagation',
  title: 'Layers and forward propagation',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Write a dense layer as Z = X @ W + b followed by A = f(Z), and say what each row and column means',
    'State the shape of every array in a forward pass, including the batch dimension',
    'Compute any unit of a small network by hand and match it to the line of code that computes it',
    'Fix the shape mistakes that break a forward pass: transposed weights, wrong bias length, a missing batch axis',
  ],
  prerequisites: ['ml/deep/neurons-activations', 'ml/math/matrix-multiplication'],
  concepts: [
    'dense-layer',
    'hidden-layer',
    'forward-propagation',
    'neural-network',
    'batch',
    'broadcasting',
    'matrix-multiplication',
    'shape',
  ],
  references: [
    {
      title:
        'Deep Learning (Goodfellow, Bengio, Courville), section 6.5: back-propagation and the forward computation',
      url: 'https://www.deeplearningbook.org/contents/mlp.html',
    },
    {
      title: 'NumPy broadcasting rules',
      url: 'https://numpy.org/doc/stable/user/basics.broadcasting.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'torch.nn.Linear (stores its weight as (out_features, in_features) and computes x @ W.T + b)',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.Linear.html',
      version: 'PyTorch stable',
    },
  ],
} satisfies LessonMeta;
