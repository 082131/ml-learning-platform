// Code for "When to fine-tune". The two explorers use src/lib/finetune/decide.ts (unit-tested). Prices are examples,
// so the payback explorer carries an "Estimate" badge. payback.py runs under CPython 3.13 and Pyodide; its output is
// checked by python-outputs.test.ts.
import { decideExperiment, paybackExperiment } from '@/lib/finetune/experiments';
import type { CodeExample } from '@/lib/types';

export const decide = decideExperiment('ft-decide');
export const paybackDef = paybackExperiment('ft-payback');

export const paybackCode: CodeExample = {
  id: 'ft-payback-code',
  language: 'python',
  run: 'pyodide',
  source: `# Does a fine-tune pay for itself? Example prices; replace them with your provider's.
requests_per_day = 20_000
saved_tokens = 1_500          # instructions + few-shot examples the fine-tune makes unnecessary
price_per_m_input = 3.00      # dollars per million input tokens

train_tokens_m = 15           # 5,000 examples x 1,000 tokens x 3 epochs = 15 M training tokens
train_price_per_m = 8.00      # dollars per million training tokens
people_cost = 6_000           # building the dataset and the evaluation

one_time = train_tokens_m * train_price_per_m + people_cost
saved_per_month = requests_per_day * 30 * saved_tokens * price_per_m_input / 1_000_000

print(f"one-time cost:   \${one_time:,.0f}")
print(f"saved per month: \${saved_per_month:,.0f}")
print(f"pays back after {one_time / saved_per_month:.1f} months")`,
  expectedOutput: `one-time cost:   $6,120
saved per month: $2,700
pays back after 2.3 months`,
  annotations: [
    {
      id: 'saved',
      range: { line: 3 },
      kind: 'variable',
      title: 'Tokens the fine-tune removes',
      what: 'A long prompt full of rules and examples is paid for on every request. A fine-tuned model has learned that behaviour, so the prompt can shrink.',
      why: 'This is the main cost saving of fine-tuning, and it only counts if the shorter prompt really keeps the quality: measure it.',
    },
    {
      id: 'train-tokens',
      range: { line: 6 },
      kind: 'math',
      title: 'Training tokens',
      what: 'Examples × average tokens per example × epochs. Each epoch reads the whole dataset once.',
      why: 'Hosted fine-tuning is priced per training token, so doubling the epochs doubles this part of the bill.',
    },
    {
      id: 'people',
      range: { line: 8 },
      kind: 'variable',
      title: 'People time',
      what: 'Collecting, cleaning and reviewing examples, building the evaluation, comparing models.',
      why: 'It is usually far bigger than the GPU bill. Ignoring it makes every fine-tune look free.',
    },
    {
      id: 'saved-month',
      range: { line: 11 },
      kind: 'math',
      title: 'Monthly saving',
      what: '20,000 × 30 × 1,500 tokens = 900 M tokens a month; at $3 per million that is $2,700.',
      why: 'Compare it with the one-time cost to get the payback period: $6,120 / $2,700 = 2.3 months.',
    },
  ],
};

export const fewShot: CodeExample = {
  id: 'ft-few-shot-prompt',
  language: 'json',
  source: `{
  "system": "You are Acme Cloud's support assistant. Answer in at most 3 sentences. Start with the action, then the menu path in bold. Never promise refunds; link to the refund policy instead. ... (40 more rules)",
  "messages": [
    {"role": "user", "content": "How do I reset my password?"},
    {"role": "assistant", "content": "Reset it from **Settings > Security > Reset password**. ..."},
    {"role": "user", "content": "Can I get my money back?"},
    {"role": "assistant", "content": "Refunds follow our refund policy: ..."},
    {"role": "user", "content": "How do I export my data?"}
  ]
}`,
  annotations: [
    {
      id: 'rules',
      range: { line: 2 },
      kind: 'variable',
      title: 'Rules in the prompt',
      what: 'Style and policy rules written out in the system prompt, sent with every request.',
      why: 'This is the baseline to beat. If it already gives the quality you need, fine-tuning only saves cost.',
    },
    {
      id: 'examples',
      range: { line: 4 },
      kind: 'variable',
      title: 'Few-shot examples',
      what: 'Worked examples of the exact format, also sent every time.',
      why: 'When dozens of examples are needed to get the style right, that is a sign the behaviour could be learned by fine-tuning instead.',
    },
  ],
};
