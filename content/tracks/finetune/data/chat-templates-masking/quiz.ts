import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ft-l5-rambles',
    type: 'choice',
    prompt: 'After fine-tuning, the model answers correctly but then keeps going, writing "<|im_start|>user" and a made-up follow-up question. Which data bug most likely causes this?',
    options: [
      { text: 'The system prompt was missing from the training examples', correct: false, explain: 'A missing system prompt changes the style the model expects, not whether it stops.' },
      { text: 'The end-of-turn token was masked out of the loss', correct: true, explain: 'The model was never trained to produce <|im_end|>, so it does not stop. It continues with the most likely next text: another turn.' },
      { text: 'Packing was turned on without padding-free attention', correct: false, explain: 'That can let examples attend to each other, but it does not remove the stop signal.' },
      { text: 'The learning rate was too low to learn the answers', correct: false, explain: 'The answers are right; only the stopping is wrong.' },
    ],
  },
  {
    id: 'ft-l5-why-mask',
    type: 'choice',
    prompt: 'Why mask the user turns out of the loss instead of training on every token?',
    options: [
      { text: 'User text is not seen by the model at all when it is masked', correct: false, explain: 'Masked tokens are still read as context through attention. Only their labels are ignored.' },
      { text: 'It saves most of the compute of each training step', correct: false, explain: 'The forward and backward passes still run over every token; masking changes only which positions are scored.' },
      { text: 'The goal is answering users, not imitating them', correct: true, explain: 'Training on user turns spends capacity learning to write questions like users do, including their typos, which nobody wants the assistant to produce.' },
      { text: 'Masking is required by the chat template format', correct: false, explain: 'Templates define the text format; masking is a separate training choice.' },
    ],
  },
  {
    id: 'ft-l5-count',
    type: 'numeric',
    prompt: 'With word-level tokens and assistant-only loss, how many tokens of this assistant turn are in the loss: content "Check your spam folder." followed by <|im_end|>? (The header is not trained.)',
    answer: 6,
    tolerance: 0,
    hint: 'Count the words, the full stop and the end token.',
    explain: '"Check", "your", "spam", "folder", "." = 5 tokens, plus <|im_end|> = 6.',
  },
  {
    id: 'ft-l5-padding',
    type: 'numeric',
    prompt: 'Twelve examples with a total of 4,240 tokens are padded to rows of 1,024 tokens, one example per row. What percentage of the row capacity holds real tokens? (One decimal.)',
    answer: 34.5,
    tolerance: 0.1,
    hint: 'Capacity = 12 × 1,024.',
    explain: '4,240 / 12,288 = 34.5%. Two thirds of the compute goes to padding. Packed into 5 rows, the same data uses 82.8% of the capacity.',
  },
  {
    id: 'ft-l5-template',
    type: 'choice',
    prompt: 'A team fine-tunes Model A with Model B’s chat template (copied from a blog post) and serves it with Model A’s official template. What do you expect?',
    options: [
      { text: 'Worse answers than in testing', correct: true, explain: 'The fine-tune taught behaviour inside one format and is used inside another, and the special tokens may not even mean the same thing. Always render with the tokenizer’s own template, in training and serving.' },
      { text: 'Nothing changes, because templates only affect how the text looks', correct: false, explain: 'Templates decide the exact tokens the model sees. A model is sensitive to them, especially the special tokens.' },
      { text: 'Better answers, because the model has now seen two formats', correct: false, explain: 'It saw one format in training and a different one in serving; neither is reinforced at inference.' },
      { text: 'A tokenizer error as soon as the model is loaded for serving', correct: false, explain: 'Text renders fine with any template; the failure is silent, in quality.' },
    ],
  },
  {
    id: 'ft-l5-truncate',
    type: 'choice',
    prompt: '8% of your examples are longer than max_length=1024, and the long part is the answer. What happens if you train anyway?',
    options: [
      { text: 'The trainer skips those examples automatically', correct: false, explain: 'TRL truncates over-long sequences by default; it does not drop them.' },
      { text: 'Their answers are cut off, teaching the model to stop mid-answer', correct: true, explain: 'The model learns from the truncated text. Raise max_length, shorten or split the examples, or drop them, after measuring the length distribution.' },
      { text: 'They are packed into two rows and trained whole', correct: false, explain: 'The default bfd strategy keeps sequences whole and truncates overflow; only bfd_split re-queues the overflow, and then the halves are trained separately.' },
      { text: 'Training fails with an out-of-memory error', correct: false, explain: 'Truncation keeps every row within max_length, so memory is not the issue.' },
    ],
  },
];

export const labelsExercise: Exercise = {
  id: 'ft-build-labels',
  prompt:
    'Write `build_labels(messages)` for the ChatML layout of the lesson. For each message, the rendered tokens are `["<|im_start|>", role, "\\n"] + content_tokens + ["<|im_end|>", "\\n"]`, where `content_tokens` is `message["tokens"]` (already tokenized). Return `(token_ids, labels)` where token_ids are the positions 0, 1, 2, ... and labels equal the position for assistant content tokens and the assistant’s `<|im_end|>`, and −100 everywhere else.',
  starter: `def build_labels(messages):
    return [], []`,
  hints: [
    'Keep a running position counter; append one label per rendered token.',
    'Header tokens and the final "\\n" are always −100; content and <|im_end|> are trained only when role == "assistant".',
  ],
  solution: `def build_labels(messages):
    ids, labels = [], []
    pos = 0
    for m in messages:
        reply = m["role"] == "assistant"
        parts = [(3, False), (len(m["tokens"]) + 1, reply), (1, False)]
        for count, trained in parts:
            for _ in range(count):
                ids.append(pos)
                labels.append(pos if trained else -100)
                pos += 1
    return ids, labels`,
  explanation:
    'The labels line up with the tokens one to one; only the answer and its end token are targets. Trainers then shift labels by one internally, so each position is scored on predicting the next token.',
  tests: `msgs = [{"role": "user", "tokens": ["Hi", "?"]}, {"role": "assistant", "tokens": ["Hello", "."]}]
ids, labels = build_labels(msgs)
assert ids == list(range(14))
assert labels == [-100] * 10 + [10, 11, 12, -100]
ids2, labels2 = build_labels([{"role": "system", "tokens": ["x"]}])
assert labels2 == [-100] * 6
ids3, labels3 = build_labels([{"role": "assistant", "tokens": []}])
assert labels3 == [-100, -100, -100, 3, -100]`,
};
