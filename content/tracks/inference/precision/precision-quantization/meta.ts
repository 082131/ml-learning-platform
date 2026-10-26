import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/precision/precision-quantization',
  title: 'FP32, FP16, BF16, INT8 and quantization error',
  level: 'intermediate',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Read the sign, exponent and mantissa of an FP32, FP16 or BF16 value and explain what each format trades',
    'Quantize and dequantize weights to INT8 by hand with a scale (and a zero point)',
    'Measure quantization error with max error, MSE and accuracy on real data',
    'Choose between per-tensor and per-channel scales, and symmetric and asymmetric schemes',
  ],
  prerequisites: ['inference/memory/memory-estimation', 'ml/math/matrix-multiplication'],
  concepts: [
    'floating-point',
    'mantissa',
    'bfloat16',
    'quantization',
    'scale-zero-point',
    'per-channel-quantization',
  ],
  references: [
    {
      title: 'IEEE 754-2019, Standard for Floating-Point Arithmetic',
      url: 'https://standards.ieee.org/ieee/754/6210/',
      version: 'IEEE 754-2019',
    },
    {
      title: 'Python struct module: format characters (e = IEEE 754 binary16)',
      url: 'https://docs.python.org/3.13/library/struct.html#format-characters',
      version: 'Python 3.13',
    },
    {
      title: 'numpy.round (rounds half to even)',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.round.html',
      version: 'NumPy 2.5',
    },
    {
      title:
        'Jacob et al., Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference (2018)',
      url: 'https://arxiv.org/abs/1712.05877',
    },
    {
      title:
        'Krishnamoorthi, Quantizing deep convolutional networks for efficient inference: A whitepaper (2018)',
      url: 'https://arxiv.org/abs/1806.08342',
    },
    {
      title: 'scikit-learn load_digits (UCI Optical Recognition of Handwritten Digits, CC BY 4.0)',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_digits.html',
      version: 'scikit-learn 1.9',
    },
  ],
} satisfies LessonMeta;
