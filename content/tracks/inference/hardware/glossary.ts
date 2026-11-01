import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/hardware chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'memory-bandwidth',
    term: 'Memory bandwidth',
    short: 'How many bytes per second a processor can read from or write to its memory.',
    long: 'A DDR5 channel moves 8 bytes per transfer, so two channels at 5,600 MT/s give 2 · 8 · 5.6 billion = 89.6 GB/s. GPU memory (GDDR or HBM) reaches 300 GB/s to over 3 TB/s.',
    introducedIn: 'inference/hardware/cpu-vs-gpu',
    aliases: ['bandwidth', 'GB/s'],
  },
  {
    id: 'memory-bound',
    term: 'Memory-bound vs compute-bound',
    short: 'An operation is memory-bound when moving its data takes longer than its arithmetic, and compute-bound when the arithmetic takes longer.',
    long: 'A matrix-vector product at batch 1 reads every weight for only 2 FLOPs, so it is memory-bound on almost any hardware. Larger batches reuse each weight and become compute-bound.',
    introducedIn: 'inference/hardware/cpu-vs-gpu',
    aliases: ['compute-bound', 'bandwidth-bound'],
  },
  {
    id: 'kernel-launch',
    term: 'Kernel launch',
    short: 'Starting one GPU function (a kernel) from the CPU. Each launch costs a few microseconds of fixed overhead.',
    long: 'Launches are asynchronous: the CPU queues the work and continues. A model with many small operations can spend more time launching kernels than running them, which is why runtimes fuse operations and capture CUDA graphs.',
    introducedIn: 'inference/hardware/cpu-vs-gpu',
    aliases: ['CUDA kernel', 'launch overhead'],
  },
  {
    id: 'host-device-transfer',
    term: 'Host-to-device transfer',
    short: 'Copying data between CPU memory (the host) and GPU memory (the device), usually over PCIe.',
    long: 'PCIe Gen4 x16 is rated at 31.5 GB/s each way, about a tenth of even a small GPU’s memory bandwidth, so inputs and outputs should cross once per request, not once per layer.',
    introducedIn: 'inference/hardware/cpu-vs-gpu',
    aliases: ['PCIe transfer', 'H2D', 'D2H', '.to("cuda")'],
  },
] satisfies GlossaryTerm[];
