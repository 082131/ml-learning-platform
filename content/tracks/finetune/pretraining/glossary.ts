import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the finetune/pretraining chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'training-flops',
    term: 'Training compute (C ≈ 6·N·D)',
    short: 'The number of floating-point operations needed to train a model with N parameters on D tokens: about 6 per parameter per token, 2 for the forward pass and 4 for the backward pass.',
    introducedIn: 'finetune/pretraining/scaling-compute',
    aliases: ['6ND', 'training FLOPs', 'compute budget'],
  },
  {
    id: 'scaling-law',
    term: 'Scaling law',
    short: 'A measured, smooth relationship between a model’s loss and its size, data and compute, usually a power law. It lets teams predict a big run’s loss from small runs.',
    introducedIn: 'finetune/pretraining/scaling-compute',
  },
  {
    id: 'compute-optimal',
    term: 'Compute-optimal (Chinchilla) training',
    short: 'For a fixed compute budget, the split between model size and data that gives the lowest loss. Hoffmann et al. (2022) found about 20 training tokens per parameter.',
    long: 'Models meant to be served to many users are usually trained far past this ratio (Llama 3 8B saw about 1,875 tokens per parameter), because a smaller model trained longer is cheaper at inference.',
    introducedIn: 'finetune/pretraining/scaling-compute',
    aliases: ['Chinchilla scaling', 'Chinchilla-optimal', '20 tokens per parameter'],
  },
  {
    id: 'data-mixture',
    term: 'Data mixture',
    short: 'The proportions of each data source in training (web text, code, books, math, other languages). Changing the mixture changes what the model is good at.',
    introducedIn: 'finetune/pretraining/scaling-compute',
    aliases: ['data mix'],
  },
  {
    id: 'lr-schedule',
    term: 'Learning-rate schedule',
    short: 'A rule for how the learning rate changes during training, usually a short warmup from 0 to a peak and then a decay towards a small floor.',
    introducedIn: 'finetune/pretraining/training-runs',
    aliases: ['LR schedule', 'warmup'],
  },
  {
    id: 'cosine-decay',
    term: 'Cosine decay',
    short: 'A learning-rate schedule that falls from the peak to a floor along half a cosine wave: slowly at first, fastest in the middle, slowly again at the end.',
    introducedIn: 'finetune/pretraining/training-runs',
    aliases: ['cosine schedule'],
  },
  {
    id: 'gradient-accumulation',
    term: 'Gradient accumulation',
    short: 'Running several small forward and backward passes and adding up their gradients before one optimizer step, to get a large effective batch that would not fit in memory at once.',
    introducedIn: 'finetune/pretraining/training-runs',
    aliases: ['effective batch size'],
  },
  {
    id: 'gradient-clipping',
    term: 'Gradient clipping',
    short: 'Scaling the whole gradient down whenever its length (norm) exceeds a limit such as 1.0, so one unusual batch cannot throw the weights far off.',
    introducedIn: 'finetune/pretraining/training-runs',
    aliases: ['clip grad norm', 'max_grad_norm'],
  },
  {
    id: 'loss-spike',
    term: 'Loss spike',
    short: 'A sudden jump in training loss, often after a bad batch or too high a learning rate. Small spikes recover; large ones can derail a run and need a restart from a checkpoint.',
    introducedIn: 'finetune/pretraining/training-runs',
  },
] satisfies GlossaryTerm[];
