import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/runtime chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'checkpoint',
    term: 'Checkpoint',
    short: 'A file holding a model’s learned values (and sometimes optimizer state) so it can be loaded later.',
    long: 'A checkpoint for serving needs only the weights. One for resuming training also needs the optimizer state, the step number and the random state.',
    introducedIn: 'inference/runtime/loading-serialization',
    aliases: ['model weights file', '.pt', '.bin', '.ckpt'],
  },
  {
    id: 'state-dict',
    term: 'state_dict',
    short: 'A PyTorch dictionary from parameter names, such as "fc1.weight", to tensors.',
    long: 'load_state_dict copies each tensor into the parameter with the same name. With strict=True (the default) it fails if a name is missing, unexpected, or has a different shape.',
    introducedIn: 'inference/runtime/loading-serialization',
    aliases: ['load_state_dict'],
  },
  {
    id: 'safetensors',
    term: 'safetensors',
    short: 'A file format for tensors: an 8-byte header length, a JSON header, then raw bytes. It contains no code.',
    long: 'Loading it can only produce tensors, never run anything. The header gives each tensor’s byte range, so a loader can read or memory-map one tensor without reading the rest.',
    introducedIn: 'inference/runtime/loading-serialization',
    aliases: ['.safetensors'],
  },
  {
    id: 'pickle',
    term: 'pickle',
    short: 'Python’s built-in format for saving arbitrary objects. Loading a pickle can run any code the file names.',
    long: 'torch.save uses pickle. Since PyTorch 2.6, torch.load defaults to weights_only=True, which only rebuilds tensors and plain containers. Never unpickle a file you do not trust.',
    introducedIn: 'inference/runtime/loading-serialization',
    aliases: ['pickle.loads', 'torch.load'],
  },
  {
    id: 'memory-mapping',
    term: 'Memory mapping (mmap)',
    short: 'Treating a file as if it were in memory; the operating system reads each part only when it is touched.',
    long: 'A memory-mapped checkpoint opens instantly, several processes can share one copy of it in the page cache, and parts never used are never read.',
    introducedIn: 'inference/runtime/loading-serialization',
    aliases: ['mmap', 'lazy loading'],
  },
] satisfies GlossaryTerm[];
