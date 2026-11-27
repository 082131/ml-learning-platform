// Code for "Dataset quality". The explorer uses src/lib/finetune/dedup.ts (unit-tested): word shingles, exact Jaccard,
// a seeded MinHash estimate, clustering of flagged pairs and an n-gram contamination check. near_dups.py runs under
// CPython 3.13 and Pyodide (checked by python-outputs.test.ts); its MinHash uses md5 so the output is reproducible.
import { dedupExperiment } from '@/lib/finetune/experiments';
import type { CodeExample } from '@/lib/types';

export const dedupDef = dedupExperiment('ft-dedup');

export const nearDups: CodeExample = {
  id: 'ft-near-dups',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib
import re

def shingles(text, n=3):
    words = re.sub(r"[^a-z0-9\\s]", " ", text.lower()).split()
    if len(words) < n:
        return {" ".join(words)}
    return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}

def jaccard(a, b):
    return len(a & b) / len(a | b)

def minhash(s, k=128):
    # k "different" hash functions: hash the seed together with the shingle, keep the minimum
    return [min(int(hashlib.md5(f"{seed}:{x}".encode()).hexdigest()[:8], 16) for x in s) for seed in range(k)]

def estimate(sig_a, sig_b):
    return sum(x == y for x, y in zip(sig_a, sig_b)) / len(sig_a)

docs = [
    "How do I reset my password? Open Settings, choose Security, then click Reset password.",
    "How can I reset my password? Open Settings, pick Security, then click Reset password.",
    "How do I change my billing address? Go to Billing and edit the address on file.",
    "How do I update my billing address? Go to Billing and edit the address on file.",
]
for i, j in [(0, 1), (2, 3), (0, 2)]:
    a, b = shingles(docs[i]), shingles(docs[j])
    print(f"docs {i},{j}: Jaccard {jaccard(a, b):.2f}  MinHash estimate {estimate(minhash(a), minhash(b)):.2f}")`,
  expectedOutput: `docs 0,1: Jaccard 0.41  MinHash estimate 0.40
docs 2,3: Jaccard 0.65  MinHash estimate 0.67
docs 0,2: Jaccard 0.04  MinHash estimate 0.05`,
  annotations: [
    {
      id: 'normalize',
      range: { line: 5 },
      kind: 'function',
      title: 'Normalize first',
      what: 'Lowercase and replace punctuation with spaces before splitting into words.',
      why: 'Otherwise "Password!" and "password" count as different words, and trivial variants slip through as "different" examples.',
    },
    {
      id: 'shingle',
      range: { line: 8 },
      kind: 'function',
      title: 'Shingles',
      what: 'Every run of n consecutive words. "reset my password" is one 3-word shingle.',
      why: 'Comparing sets of word runs, rather than single words, captures word order: two texts with the same words in a different order share few shingles.',
    },
    {
      id: 'jac',
      range: { line: 11 },
      kind: 'math',
      title: 'Jaccard similarity',
      what: 'Shared shingles divided by all distinct shingles of the two texts.',
      why: 'It answers "what fraction of the content do these two have in common?" on a 0 to 1 scale, which a threshold can act on.',
    },
    {
      id: 'mh',
      range: { line: 15 },
      kind: 'function',
      title: 'MinHash signature',
      what: 'For each of 128 hash functions, the smallest hash value over the set’s shingles.',
      why: 'For one hash function, two sets have the same minimum exactly when the overall smallest shingle of their union is shared, which happens with probability equal to their Jaccard similarity. 128 such coin flips give a good estimate from 128 numbers per document.',
    },
    {
      id: 'est',
      range: { line: 18 },
      kind: 'math',
      title: 'The estimate',
      what: 'The share of the 128 positions where the two signatures agree.',
      why: 'Comparing two 128-number lists is cheap and fixed-size, however long the documents are. With locality-sensitive hashing on top, likely pairs are found without comparing every pair.',
    },
  ],
};

export const decontam: CodeExample = {
  id: 'ft-decontam',
  language: 'python',
  source: `# Not run here: a decontamination pass before training (sketch).
def ngrams(text, n=13):
    words = normalize(text).split()
    return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}

test_grams = set().union(*(ngrams(x["question"] + " " + x["answer"]) for x in eval_set))
clean = [ex for ex in train_set if not (ngrams(render(ex)) & test_grams)]
print(f"removed {len(train_set) - len(clean)} training examples that overlap the eval set")`,
  annotations: [
    {
      id: 'n13',
      range: { line: 2 },
      kind: 'parameter',
      title: 'n = 13',
      what: 'GPT-3’s contamination analysis counted 13-word overlaps. Short examples need a smaller n.',
      why: 'Too small an n flags innocent shared phrases ("how do I reset"); too large misses lightly edited copies.',
    },
    {
      id: 'remove',
      range: { line: 7 },
      kind: 'syntax',
      title: 'Remove from training, not from the test',
      what: 'Training examples that share an n-gram with any evaluation item are dropped.',
      why: 'The evaluation set is the fixed yardstick. Keep it intact and clean the training side.',
    },
  ],
};
