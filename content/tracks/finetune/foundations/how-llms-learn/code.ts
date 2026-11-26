// Code for "How an LLM learns". The explorer uses src/lib/finetune/loss.ts (unit-tested). loss_by_hand.py runs under
// CPython 3.13 and in Pyodide; its output is checked by python-outputs.test.ts. hf_loss.py needs PyTorch, Transformers
// 5 and a model download, so it is not run here.
import { lossExperiment } from '@/lib/finetune/experiments';
import type { CodeExample } from '@/lib/types';

export const loss = lossExperiment('ft-token-loss');

export const lossByHand: CodeExample = {
  id: 'ft-loss-by-hand',
  language: 'python',
  run: 'pyodide',
  source: `import math

# The probability the model gave to each correct next token of
# "The capital of France is Paris", one prediction per token after "The".
tokens = ["capital", "of", "France", "is", "Paris"]
probs = [0.05, 0.6, 0.2, 0.7, 0.8]

losses = [-math.log(p) for p in probs]
for t, p, l in zip(tokens, probs, losses):
    print(f"{t:>8}  p={p:.2f}  loss={l:.3f}")

mean = sum(losses) / len(losses)
print(f"average loss = {mean:.3f} nats")
print(f"perplexity   = {math.exp(mean):.2f}")
print(f"uniform guess over 50,000 tokens: loss {math.log(50000):.2f}, perplexity {math.exp(math.log(50000)):,.0f}")`,
  expectedOutput: ` capital  p=0.05  loss=2.996
      of  p=0.60  loss=0.511
  France  p=0.20  loss=1.609
      is  p=0.70  loss=0.357
   Paris  p=0.80  loss=0.223
average loss = 1.139 nats
perplexity   = 3.12
uniform guess over 50,000 tokens: loss 10.82, perplexity 50,000`,
  annotations: [
    {
      id: 'probs',
      range: { line: 6 },
      kind: 'variable',
      title: 'One probability per prediction',
      what: 'For each position, the probability the model assigned to the token that really came next. A real model gives a probability to every token in its vocabulary; only the correct one matters for the loss.',
      why: 'Training never asks "was the top guess right?". It asks "how much probability did you put on the truth?", which gives a smooth signal even when the top guess is wrong.',
    },
    {
      id: 'neg-log',
      range: { line: 8 },
      kind: 'math',
      title: '−ln p',
      what: 'The cross-entropy loss of one prediction. p = 1 costs 0; p = 0.5 costs 0.69; p = 0.05 costs 3.0; p = 0.001 costs 6.9.',
      why: 'The log turns the product of probabilities of a whole sentence into a sum of per-token losses, and it punishes confident mistakes far more than mild ones.',
    },
    {
      id: 'mean',
      range: { line: 12 },
      kind: 'math',
      title: 'Average over tokens',
      what: 'The training loss is the mean per-token loss, so sentences of different lengths are comparable.',
      why: 'This single number is what gradient descent pushes down at every training step.',
    },
    {
      id: 'ppl',
      range: { line: 14 },
      kind: 'math',
      title: 'Perplexity = e^loss',
      what: 'Undoes the log: 1.139 nats becomes 3.12, read as "as unsure as choosing among about 3 equally likely tokens".',
      why: 'Loss in nats is hard to picture; "number of choices" is easy to picture. Both carry the same information.',
    },
  ],
};

export const hfLoss: CodeExample = {
  id: 'ft-hf-loss',
  language: 'python',
  source: `# Not run here: needs PyTorch, transformers 5 and a model download.
import math, torch
from transformers import AutoModelForCausalLM, AutoTokenizer

name = "Qwen/Qwen3-0.6B-Base"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name)

batch = tok("The capital of France is Paris.", return_tensors="pt")
with torch.no_grad():
    out = model(**batch, labels=batch["input_ids"])   # the model shifts labels by one inside
print(f"loss {out.loss.item():.3f}  perplexity {math.exp(out.loss.item()):.2f}")`,
  annotations: [
    {
      id: 'base',
      range: { line: 5 },
      kind: 'framework',
      title: 'A base model',
      what: 'A small model straight out of pretraining (the "-Base" suffix). Its job is exactly what this lesson describes: predict the next token.',
      why: 'Measuring loss on text is the most direct look at what pretraining taught it.',
    },
    {
      id: 'labels',
      range: { line: 11 },
      kind: 'parameter',
      title: 'labels = input_ids',
      what: 'Passing the same token ids as labels asks the model for the average next-token cross-entropy. Inside, position i is scored on token i + 1, so nobody has to shift the labels by hand.',
      why: 'This is the same loss pretraining and supervised fine-tuning minimize. Fine-tuning changes the data and which positions count, not the formula.',
    },
  ],
};
