import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/runtime/loading-serialization',
  title: 'Loading, serialization and checkpoints',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare checkpoint formats (pickle-based .pt, safetensors, ONNX) by what they store and how they load',
    'Load weights without executing untrusted code',
    'Check that loaded weights match the expected names, shapes and dtypes',
    'Reduce model load time with memory mapping and lazy loading',
  ],
  prerequisites: ['inference/basics/tensors-graphs', 'ml/deep/pytorch-basics'],
  concepts: ['checkpoint', 'state-dict', 'safetensors', 'pickle', 'memory-mapping'],
  references: [
    {
      title: 'safetensors: format description and Python API (save_file, load_file, safe_open)',
      url: 'https://huggingface.co/docs/safetensors/index',
      version: 'safetensors 0.8',
    },
    {
      title: 'pickle: the warning about untrusted data',
      url: 'https://docs.python.org/3/library/pickle.html',
      version: 'Python 3.13',
    },
    {
      title: 'torch.load and weights_only (default True since PyTorch 2.6)',
      url: 'https://pytorch.org/docs/stable/generated/torch.load.html',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'torch.nn.Module.load_state_dict (strict loading)',
      url: 'https://pytorch.org/docs/stable/generated/torch.nn.Module.html#torch.nn.Module.load_state_dict',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'ONNX external data (weights stored outside the .onnx file)',
      url: 'https://onnx.ai/onnx/repo-docs/ExternalData.html',
    },
  ],
} satisfies LessonMeta;
