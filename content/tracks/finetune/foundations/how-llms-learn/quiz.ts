import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ft-l1-loss-value',
    type: 'numeric',
    prompt: 'A model gives the correct next token probability 0.25. What is the cross-entropy loss of this one prediction, in nats? (Two decimals.)',
    answer: 1.39,
    tolerance: 0.01,
    hint: 'Loss = −ln p.',
    explain: '−ln 0.25 = ln 4 = 1.386, about 1.39 nats. A perplexity of e^1.386 = 4 matches the picture "as unsure as choosing among 4 tokens".',
  },
  {
    id: 'ft-l1-confident-wrong',
    type: 'choice',
    prompt: 'Model X gives the right token p = 0.4 on both of two predictions. Model Y gives p = 0.9 on the first and p = 0.01 on the second. Which has the lower average loss?',
    options: [
      { text: 'Y, because it is more often confidently right', correct: false, explain: 'Y: (0.105 + 4.605) / 2 = 2.36. X: 0.916 on each, average 0.92. One confident miss outweighs a confident hit.' },
      { text: 'X', correct: true, explain: 'X averages 0.92 nats, Y averages 2.36. The log punishes the p = 0.01 miss with 4.6 nats, far more than the p = 0.9 hit saves.' },
      { text: 'They tie, because the probabilities average to the same value', correct: false, explain: 'Loss averages −ln p, not p. Averaging p (0.4 versus 0.455) is not what training does.' },
      { text: 'It depends on the vocabulary size', correct: false, explain: 'Only the probability given to the correct token enters the loss; the vocabulary size does not appear.' },
    ],
  },
  {
    id: 'ft-l1-ppl',
    type: 'choice',
    prompt: 'Two models are evaluated on the same English text. Model A reports perplexity 8 with a 32k-token vocabulary, model B perplexity 11 with a 128k-token vocabulary. What can you conclude?',
    options: [
      { text: 'A predicts this text better', correct: false, explain: 'Not from these numbers. Perplexity is per token, and different tokenizers cut the same text into different numbers of tokens of different difficulty.' },
      { text: 'B predicts this text better, since its vocabulary is larger', correct: false, explain: 'A larger vocabulary makes each token carry more text, which usually raises per-token perplexity; it does not make the model better or worse by itself.' },
      { text: 'Nothing reliable, because the tokens are different', correct: true, explain: 'To compare models with different tokenizers, normalize per word or per byte (bits per byte), or compare on a downstream task.' },
      { text: 'A is better, because a lower perplexity always means a lower loss', correct: false, explain: 'Lower perplexity does mean lower loss per token, but the two losses are measured per different tokens, so they are not comparable.' },
    ],
  },
  {
    id: 'ft-l1-stages',
    type: 'order',
    prompt: 'Put the usual training stages of an assistant model in order.',
    items: [
      'Next-token prediction on trillions of tokens of general text',
      'Supervised fine-tuning on example conversations',
      'Preference tuning on pairs of better and worse answers',
      'Evaluation against the previous model before release',
    ],
    explain: 'Pretraining gives knowledge of language and the world, SFT teaches the format of being helpful, preference tuning sharpens which helpful answers people prefer, and every candidate is evaluated before it replaces the old model.',
  },
  {
    id: 'ft-l1-base',
    type: 'choice',
    prompt: 'You send a base model the text "What is the capital of France?" and it replies "What is the capital of Germany? What is the capital of Spain?". What is going on?',
    options: [
      { text: 'The model is broken and should be retrained', correct: false, explain: 'It is doing exactly what pretraining taught: continue the text. Lists of quiz questions are common on the web.' },
      { text: 'It is continuing the text; nobody taught it to answer', correct: true, explain: 'Answering questions is a behaviour added by supervised fine-tuning on question-answer conversations. A base model has the knowledge but not the habit.' },
      { text: 'The temperature is too high', correct: false, explain: 'Sampling settings change which continuation is chosen, not whether the model treats the input as a question to answer.' },
      { text: 'It does not know the answer', correct: false, explain: 'A base model usually does know it: prompt it with "The capital of France is" and it will say Paris.' },
    ],
  },
  {
    id: 'ft-l1-same-loss',
    type: 'choice',
    prompt: 'How does the loss of supervised fine-tuning differ from the loss of pretraining?',
    options: [
      { text: 'SFT uses a classification loss over answer categories', correct: false, explain: 'SFT still predicts the next token over the whole vocabulary.' },
      { text: 'SFT compares two answers and prefers one', correct: false, explain: 'That describes preference tuning (reward models, DPO), the stage after SFT.' },
      { text: 'Same formula; different data and fewer tokens counted', correct: true, explain: 'Both minimize the average −ln p of the next token. SFT uses curated conversations and usually counts only the answer tokens (loss masking).' },
      { text: 'SFT has no loss; it copies weights from a better model', correct: false, explain: 'Copying a better model’s outputs is distillation, and even that is trained with a loss.' },
    ],
  },
];

export const perplexityExercise: Exercise = {
  id: 'ft-perplexity',
  prompt:
    'Write `perplexity(probs)`. `probs` is a list of the probabilities a model gave to each correct next token. Return e raised to the average of −ln p. Raise `ValueError` if the list is empty or any probability is not in (0, 1].',
  starter: `import math

def perplexity(probs):
    return 0.0`,
  hints: ['Average the losses −math.log(p) first, then exponentiate the average.', 'Check `0 < p <= 1` for every p before computing.'],
  solution: `import math

def perplexity(probs):
    if not probs or any(not (0 < p <= 1) for p in probs):
        raise ValueError("probabilities must be in (0, 1]")
    mean = sum(-math.log(p) for p in probs) / len(probs)
    return math.exp(mean)`,
  explanation:
    'Perplexity is the geometric mean of 1/p over the tokens: e^(mean of −ln p). If every p is 0.25, it is exactly 4. A single p near 0 drives it up sharply, which is why one confident mistake shows so clearly.',
  tests: `import math
assert abs(perplexity([0.25, 0.25, 0.25]) - 4) < 1e-9
assert abs(perplexity([1.0]) - 1) < 1e-12
assert abs(perplexity([0.05, 0.6, 0.2, 0.7, 0.8]) - 3.1243) < 1e-3
for bad in ([], [0], [1.2], [0.5, -0.1]):
    try:
        perplexity(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"no ValueError for {bad}")`,
};
