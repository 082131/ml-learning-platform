import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/basics chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'online-inference',
    term: 'Online inference',
    short: 'Answering each request as it arrives, while a user or another service waits for the result.',
    long: 'Judged mainly on latency. Examples: a fraud check during a card payment, a search ranking, a chat reply.',
    introducedIn: 'inference/basics/what-is-inference',
    aliases: ['real-time inference', 'synchronous inference'],
  },
  {
    id: 'batch-inference',
    term: 'Batch (offline) inference',
    short: 'Running a model over a large set of stored inputs on a schedule, with nobody waiting on a single result.',
    long: 'Judged mainly on throughput and cost per prediction. Example: scoring every customer overnight. Not to be confused with batching, which groups requests inside one forward pass.',
    introducedIn: 'inference/basics/what-is-inference',
    aliases: ['offline inference'],
  },
  {
    id: 'streaming-inference',
    term: 'Streaming (token-by-token) inference',
    short: 'Sending the output piece by piece while it is produced, as language models do with tokens.',
    long: 'The user sees the first token after the time to first token (TTFT) and the rest at the time per output token (TPOT), instead of waiting for the whole answer.',
    introducedIn: 'inference/basics/what-is-inference',
    aliases: ['token streaming', 'TTFT', 'time to first token'],
  },
  {
    id: 'optimizer-state',
    term: 'Optimizer state',
    short: 'Extra numbers an optimizer keeps for every weight between training steps, such as Adam’s two moving averages.',
    long: 'Needed only for training. Adam keeps two float32 numbers per weight, so with the gradient a trained weight costs 4 numbers instead of 1.',
    introducedIn: 'inference/basics/what-is-inference',
  },
  {
    id: 'symbolic-dimension',
    term: 'Symbolic (dynamic) dimension',
    short: 'A tensor dimension whose size is given a name, such as "batch", instead of a fixed number.',
    long: 'An exported model with a symbolic batch dimension accepts any batch size. A fixed one rejects every other size with a shape error.',
    introducedIn: 'inference/basics/tensors-graphs',
    aliases: ['dynamic axis', 'dynamic shape'],
  },
] satisfies GlossaryTerm[];
