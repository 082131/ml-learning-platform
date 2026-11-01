// Code for the LLM fundamentals lesson. The bigram model, softmax with temperature, top-p and seeded sampling
// live in src/lib/ai/nextToken.ts and are unit-tested. The Python runner was run with CPython 3.13 and its output
// copied here; it uses only the standard library.
import { lumenDocs } from '@/lib/ai/lumen';
import { nextTokenExperiment, trainBigram } from '@/lib/ai/nextToken';
import type { CodeExample } from '@/lib/types';

export const nextToken = nextTokenExperiment('next-token', trainBigram(lumenDocs.map((d) => d.text)), {
  start: 'error',
  temperature: 1,
  topP: 1,
  seed: 1,
});

export const samplingRunner: CodeExample = {
  id: 'sampling',
  language: 'python',
  run: 'pyodide',
  source: `import math

words = ["end", "api", "free", "new"]
counts = [3, 2, 1, 1]                      # how often each word followed "the" (a toy example)
logits = [math.log(c) for c in counts]     # the model's scores


def softmax(logits, temperature):
    scaled = [l / temperature for l in logits]
    top = max(scaled)
    exps = [math.exp(s - top) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def top_p(probs, p):
    order = sorted(range(len(probs)), key=lambda i: -probs[i])
    keep, total = [], 0.0
    for i in order:
        keep.append(words[i])
        total += probs[i]
        if total >= p:
            break
    return keep


for t in [0.5, 1.0, 2.0]:
    print(f"T={t}:", [round(x, 3) for x in softmax(logits, t)])
probs = softmax(logits, 1.0)
print("top-p 0.6 keeps", top_p(probs, 0.6))
print("top-p 0.9 keeps", top_p(probs, 0.9))`,
  annotations: [
    {
      id: 'logits',
      range: { line: 5 },
      kind: 'math',
      title: 'logits',
      what: 'The model’s score for each candidate. Here the score is ln(count), so softmax at T = 1 gives back count / total.',
      why: 'A real model computes logits with a transformer over the whole context, one per vocabulary token (tens of thousands of them).',
    },
    {
      id: 'scale',
      range: { line: 9 },
      kind: 'math',
      title: 'l / temperature',
      what: 'Temperature divides every logit before softmax.',
      why: 'Dividing by T < 1 stretches the gaps between scores, so the top token wins more often; T > 1 shrinks them.',
    },
    {
      id: 'stable',
      range: { line: 11 },
      kind: 'math',
      title: 'math.exp(s - top)',
      what: 'Subtracts the largest score before exponentiating.',
      why: 'It doesn’t change the result (it cancels in the division) but prevents overflow for large logits.',
    },
    {
      id: 'top-p',
      range: { line: 16 },
      kind: 'function',
      title: 'top_p(probs, p)',
      what: 'Walks the candidates from most to least likely and stops once their probabilities add up to p.',
      why: 'Everything outside that set can never be sampled, which removes the long tail of odd tokens.',
    },
  ],
  expectedOutput: `T=0.5: [0.6, 0.267, 0.067, 0.067]
T=1.0: [0.429, 0.286, 0.143, 0.143]
T=2.0: [0.337, 0.275, 0.194, 0.194]
top-p 0.6 keeps ['end', 'api']
top-p 0.9 keeps ['end', 'api', 'free', 'new']`,
};
