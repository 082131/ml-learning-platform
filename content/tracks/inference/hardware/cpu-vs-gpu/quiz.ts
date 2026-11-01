import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'batch1',
    type: 'choice',
    prompt: 'At batch 1, a 4096 × 4096 float32 layer takes about the same time on a 32-core server CPU (307 GB/s) as on an L4 GPU (300 GB/s). Why?',
    options: [
      {
        text: 'At batch 1 each weight is used for only 2 FLOPs, so both are limited by how fast they read the 64 MiB of weights',
        correct: true,
        explain: 'The time is about bytes / bandwidth on both, and their bandwidths are nearly equal. The GPU’s 12× higher peak arithmetic does not help a memory-bound layer.',
      },
      {
        text: 'The GPU is slowed down by copying the weights over PCIe every call',
        correct: false,
        explain: 'The weights are copied once at startup. Only the 16 KiB input and the 16 KiB output cross PCIe per call.',
      },
      {
        text: 'CPUs are faster than GPUs at matrix multiplication',
        correct: false,
        explain: 'At batch 256 the same estimate gives the GPU a 10× lead, because the layer becomes compute-bound.',
      },
    ],
  },
  {
    id: 'membw',
    type: 'numeric',
    prompt: 'A server has 12 DDR5 channels at 4,800 MT/s. What is its peak memory bandwidth in GB/s? (one decimal)',
    answer: 460.8,
    tolerance: 0.05,
    hint: 'Each channel moves 8 bytes per transfer.',
    explain: '12 · 8 bytes · 4.8 billion transfers/s = 460.8 GB/s.',
  },
  {
    id: 'sync',
    type: 'choice',
    prompt: 'A colleague times `y = model(x)` on a GPU with time.perf_counter() and gets 0.05 ms for a model that should take 5 ms. What is wrong?',
    options: [
      {
        text: 'CUDA kernels run asynchronously; without torch.cuda.synchronize() the timer only measured how long it took to queue the work',
        correct: true,
        explain: 'Call torch.cuda.synchronize() before stopping the timer, or use CUDA events.',
      },
      {
        text: 'The first call is always faster because of caching',
        correct: false,
        explain: 'The first call is usually the slowest, because of one-time setup. That is why benchmarks warm up first.',
      },
      {
        text: 'perf_counter is not precise enough below 1 ms',
        correct: false,
        explain: 'perf_counter has sub-microsecond resolution. The problem is what it measured, not its precision.',
      },
    ],
  },
  {
    id: 'pcie',
    type: 'choice',
    prompt: 'Which placement of host-to-device copies is right for a model served on a GPU?',
    options: [
      {
        text: 'Weights copied once at startup; each request copies its input in and its output out',
        correct: true,
        explain: 'PCIe is about a tenth of GPU memory bandwidth, so only the small request tensors should cross it per call.',
      },
      {
        text: 'Copy each layer’s output back to the CPU to check it, then send it to the next layer',
        correct: false,
        explain: 'Every round trip adds PCIe time and a synchronization. Keep intermediate tensors on the GPU.',
      },
      {
        text: 'Copy the weights with every request so the GPU memory stays free',
        correct: false,
        explain: 'That moves the whole model over PCIe per call: 512 MiB at about 25 GB/s is over 20 ms.',
      },
    ],
  },
];

export const timingExercise: Exercise = {
  id: 'layer-time',
  prompt:
    'Write `layer_time(batch, width, peak, bandwidth)`: the time in seconds for one float32 width × width layer, as max(FLOPs / peak, bytes / bandwidth), and `is_memory_bound(...)` with the same arguments.',
  starter: `def layer_time(batch, width, peak, bandwidth):
    pass


def is_memory_bound(batch, width, peak, bandwidth):
    pass`,
  hints: [
    'FLOPs: `2 * batch * width * width`.',
    'Bytes: the weights plus the input and output rows, `4 * (width * width + 2 * batch * width)`.',
    'is_memory_bound compares the two times: memory time greater than compute time.',
  ],
  solution: `def layer_time(batch, width, peak, bandwidth):
    flops = 2 * batch * width * width
    bytes_moved = 4 * (width * width + 2 * batch * width)
    return max(flops / peak, bytes_moved / bandwidth)


def is_memory_bound(batch, width, peak, bandwidth):
    flops = 2 * batch * width * width
    bytes_moved = 4 * (width * width + 2 * batch * width)
    return bytes_moved / bandwidth > flops / peak`,
  explanation:
    'At small batches the weights dominate the bytes and there are only 2 FLOPs per weight per row, so the layer waits on memory. As the batch grows, FLOPs grow with it and bytes barely change, until the arithmetic takes longer.',
  tests: `assert abs(layer_time(1, 4096, 30.3e12, 300e9) - 4 * (4096 * 4096 + 2 * 4096) / 300e9) < 1e-12, 'batch 1 on an L4: the memory time'
assert is_memory_bound(1, 4096, 30.3e12, 300e9), 'batch 1 is memory-bound on an L4'
assert not is_memory_bound(512, 4096, 30.3e12, 300e9), 'batch 512 is compute-bound on an L4'
assert abs(layer_time(512, 4096, 30.3e12, 300e9) - 2 * 512 * 4096 * 4096 / 30.3e12) < 1e-12, 'batch 512 on an L4: the compute time'`,
};
