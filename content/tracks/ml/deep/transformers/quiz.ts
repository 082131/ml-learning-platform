import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'split-shape',
    type: 'choice',
    prompt: 'B = 4, T = 128, d_model = 512, 8 heads. What is the shape of Q after splitting into heads?',
    options: [
      {
        text: '(4, 8, 128, 64)',
        correct: true,
        explain: '512 / 8 = 64 numbers per head, with the head axis moved before T.',
      },
      {
        text: '(4, 128, 512)',
        correct: false,
        explain: 'That is the shape before the split (and after the merge).',
      },
      {
        text: '(4, 8, 128, 512)',
        correct: false,
        explain: 'The heads share the 512 numbers; each head gets a slice of 64, not a full copy.',
      },
      {
        text: '(4, 8, 128, 128)',
        correct: false,
        explain: 'That is the shape of the attention scores per head, (B, heads, T, T).',
      },
    ],
  },
  {
    id: 'block-params',
    type: 'numeric',
    prompt: 'How many parameters does one block have with d_model = 512 and d_ff = 2048 (biases included)?',
    answer: 3152384,
    tolerance: 0,
    hint: '4·d² + 2·d·d_ff + 9·d + d_ff.',
    explain: '4·512² + 2·512·2048 + 9·512 + 2048 = 1,048,576 + 2,097,152 + 4,608 + 2,048 = 3,152,384.',
  },
  {
    id: 'heads-params',
    type: 'choice',
    prompt:
      'You change a block from 8 heads to 16 heads, keeping d_model = 512. What happens to its parameter count?',
    options: [
      {
        text: 'Nothing: the heads split the same W_q, W_k, W_v and W_o into smaller slices',
        correct: true,
        explain: 'Each head gets 32 numbers instead of 64. The matrices stay (512, 512).',
      },
      {
        text: 'It doubles',
        correct: false,
        explain: 'Heads are slices of the same projections, not extra copies of them.',
      },
      {
        text: 'It halves',
        correct: false,
        explain: 'The total width d_model stays 512, so the matrices keep their size.',
      },
    ],
  },
  {
    id: 'residual',
    type: 'choice',
    prompt: 'What does a residual connection x + f(x) give a deep stack of blocks?',
    options: [
      {
        text: 'A direct path for the input and its gradient around every sub-layer, so deep stacks still train',
        correct: true,
        explain:
          'The derivative of x + f(x) with respect to x is 1 + f′(x): the gradient never has to pass only through f.',
      },
      {
        text: 'Fewer parameters',
        correct: false,
        explain: 'Addition has no parameters, but it does not remove any either.',
      },
      {
        text: 'The ability to see later tokens',
        correct: false,
        explain: 'Which tokens are visible is decided by the attention mask, not by the residual path.',
      },
    ],
  },
  {
    id: 'decoder-task',
    type: 'choice',
    prompt: 'Which model is the natural fit for generating text one token at a time?',
    options: [
      {
        text: 'A decoder with a causal mask (GPT-style)',
        correct: true,
        explain:
          'Each position only sees earlier tokens, which is exactly the setting of predicting the next one.',
      },
      {
        text: 'An encoder without a mask (BERT-style)',
        correct: false,
        explain:
          'Every position sees the whole input, which suits understanding tasks such as classification, not left-to-right generation.',
      },
    ],
  },
  {
    id: 'block-order',
    type: 'order',
    prompt: 'Put the parts of one pre-LayerNorm (GPT-2 style) block in order.',
    items: [
      'LayerNorm 1',
      'Multi-head self-attention',
      'Add the block input (residual)',
      'LayerNorm 2',
      'Feed-forward network',
      'Add again (residual)',
    ],
    explain:
      'Each sub-layer is wrapped as x + sublayer(LayerNorm(x)). The original paper normalized after the addition instead.',
  },
];

export const blockParamsExercise: Exercise = {
  id: 'block-params-fn',
  prompt:
    'Write `block_params(d_model, d_ff)` that returns the number of parameters in one transformer block.',
  starter: `def block_params(d_model, d_ff):
    # attention: 4 weight matrices and 4 biases; FFN: 2 of each; 2 LayerNorms
    pass`,
  hints: [
    'Attention: `4 * (d_model * d_model + d_model)`.',
    'Feed-forward: `d_model * d_ff + d_ff + d_ff * d_model + d_model`.',
    'LayerNorms: two of them, each with a scale and a shift of `d_model` numbers.',
  ],
  solution: `def block_params(d_model, d_ff):
    attn = 4 * (d_model * d_model + d_model)
    ffn = d_model * d_ff + d_ff + d_ff * d_model + d_model
    norms = 2 * (2 * d_model)
    return attn + ffn + norms`,
  explanation:
    'Every learned matrix and vector in the block is counted once: W_q, W_k, W_v, W_o with biases, the two feed-forward layers with biases, and the scale and shift of both LayerNorms. Together: 4·d² + 2·d·d_ff + 9·d + d_ff.',
  tests: `assert block_params(4, 16) == 244, f'd_model=4, d_ff=16: 80 (attention) + 148 (FFN) + 16 (norms) = 244; got {block_params(4, 16)}'
assert block_params(768, 3072) == 7087872, 'GPT-2 small has 7,087,872 parameters per block'
assert block_params(512, 2048) == 3152384, 'd_model=512, d_ff=2048 should give 3,152,384'
assert block_params(1, 1) == 16, 'd_model=1, d_ff=1: 8 (attention) + 4 (FFN) + 4 (norms) = 16'`,
};
