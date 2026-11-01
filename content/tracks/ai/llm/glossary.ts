import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/llm chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'language-model',
    term: 'Language model',
    short: 'A model that gives a probability to every possible next token, given the tokens so far.',
    long: 'Generating text means repeating one step: compute the next-token distribution, pick a token, append it, and go again. A large language model (LLM) is a transformer with billions of parameters trained this way on a large share of the public web, books and code.',
    introducedIn: 'ai/llm/transformers-llms',
    aliases: ['LLM', 'large language model', 'LLMs'],
  },
  {
    id: 'logit',
    term: 'Logit',
    short: 'A model’s raw score for one option before softmax turns all the scores into probabilities.',
    long: 'Logits can be any real number. Only their differences matter: adding the same constant to every logit leaves the softmax probabilities unchanged.',
    introducedIn: 'ai/llm/transformers-llms',
    aliases: ['logits'],
  },
  {
    id: 'temperature',
    term: 'Temperature',
    short: 'A number T that divides the logits before softmax: below 1 sharpens the distribution, above 1 flattens it.',
    long: 'T = 1 keeps the model’s distribution. As T approaches 0, sampling becomes greedy (always the most likely token); large T makes unlikely tokens more common.',
    introducedIn: 'ai/llm/transformers-llms',
  },
  {
    id: 'top-p-sampling',
    term: 'Top-p (nucleus) sampling',
    short: 'Sampling only from the smallest set of most likely tokens whose probabilities add up to at least p.',
    long: 'With p = 0.9 the long tail of unlikely tokens is cut, then the kept probabilities are rescaled to sum to 1. p = 1 keeps everything.',
    introducedIn: 'ai/llm/transformers-llms',
    aliases: ['top-p', 'nucleus sampling'],
  },
  {
    id: 'greedy-decoding',
    term: 'Greedy decoding',
    short: 'Always picking the single most likely next token.',
    long: 'Deterministic, and good for short factual outputs, but it can fall into repeating loops in longer text.',
    introducedIn: 'ai/llm/transformers-llms',
    aliases: ['greedy'],
  },
  {
    id: 'context-window',
    term: 'Context window',
    short: 'The maximum number of tokens a model can read and write in one request: instructions, history, documents and output together.',
    long: 'Tokens beyond the window are not seen at all. Self-attention compares every token with every other one, so its work grows with the square of the context length.',
    introducedIn: 'ai/llm/transformers-llms',
    aliases: ['context length', 'context'],
  },
  {
    id: 'hallucination',
    term: 'Hallucination',
    short: 'A fluent, confident model output that is false or not supported by the sources it was given.',
    long: 'It follows from how language models work: they produce likely text, not checked facts. Grounding in retrieved sources, citations and evaluation reduce it; nothing removes it entirely.',
    introducedIn: 'ai/llm/transformers-llms',
    aliases: ['hallucinations', 'hallucinate', 'confabulation'],
  },
] satisfies GlossaryTerm[];
