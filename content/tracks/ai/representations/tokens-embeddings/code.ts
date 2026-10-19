// Code for the tokens and embeddings lesson. The tokenizer outputs were produced with tokenizers 0.23.3 on the
// model's tokenizer.json (Python 3.13); src/lib/ai/wordpiece.test.ts checks the in-browser tokenizer against
// them. The embedding vectors come from scripts/ai/generate_embeddings.py (all-MiniLM-L6-v2, ONNX Runtime
// 1.29.0), which first checks that it reproduces the similarities in the sentence-transformers README.
// The pure-Python examples were run with CPython 3.13 and their output copied here.
import sentences from '@/lib/ai/data/sentence-embeddings.json';
import vocabText from '@/lib/ai/data/vocab.txt?raw';
import { readTable } from '@/lib/ai/embeddings';
import { querySlot, similarityExperiment, type SimilarityItem } from '@/lib/ai/similarityExperiment';
import { textSlot, tokenizerExperiment } from '@/lib/ai/tokenizerExperiment';
import { parseVocab } from '@/lib/ai/wordpiece';
import type { CodeExample } from '@/lib/types';

export const vocab = parseVocab(vocabText);
export const model = sentences.model;

export const tokenizer = tokenizerExperiment(
  'tokenizer',
  'Tokenizers split unbelievably long words into pieces.',
  5,
  vocab,
);

const items = readTable(sentences.items, sentences.vectors) as SimilarityItem[];
export const similarity = similarityExperiment('similarity', items, 'q-kitten');

export const tokenizeCode: CodeExample = {
  id: 'tokenize-hf',
  language: 'python',
  source: `from tokenizers import Tokenizer

tok = Tokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
tok.no_padding()
tok.no_truncation()
enc = tok.encode({{text}})
print(enc.tokens)
print(enc.ids)`,
  slots: { text: textSlot },
  annotations: [
    {
      id: 'import',
      range: { line: 1 },
      kind: 'syntax',
      title: 'from tokenizers import Tokenizer',
      what: 'Loads Hugging Face’s tokenizers library, a fast tokenizer implementation written in Rust.',
      why: 'The same library produced the token lists this lesson was checked against.',
    },
    {
      id: 'from-pretrained',
      range: { line: 3, startCol: 6, endCol: 31 },
      match: 'Tokenizer.from_pretrained',
      kind: 'framework',
      title: 'Tokenizer.from_pretrained(...)',
      what: 'Downloads the tokenizer.json that belongs to a model on the Hugging Face Hub and builds the tokenizer from it.',
      why: 'A model only understands IDs from its own vocabulary, so you must use the tokenizer it was trained with.',
      inputs: 'A model name on the Hub',
      output: 'A Tokenizer with the model’s 30,522-token vocabulary',
    },
    {
      id: 'no-padding',
      range: { line: 4 },
      kind: 'framework',
      title: 'no_padding() and no_truncation()',
      what: 'Turns off padding to a fixed length and cutting off long inputs, if the saved tokenizer has them switched on.',
      why: 'Saved tokenizers often pad every input with [PAD] tokens for batching. Here we want to see only the real tokens.',
    },
    {
      id: 'enc',
      range: { line: 6, startCol: 0, endCol: 3 },
      match: 'enc',
      kind: 'variable',
      title: 'enc',
      what: 'An Encoding: the tokens, their IDs, and where each came from in the text.',
      why: 'One call gives you everything the model needs (ids) and what you need to debug it (tokens, offsets).',
    },
    {
      id: 'encode',
      range: { line: 6, startCol: 6, endCol: 16 },
      match: 'tok.encode',
      kind: 'function',
      title: 'tok.encode(text)',
      what: 'Normalizes the text (lowercase, accents removed), splits it into words and punctuation, splits each word into known pieces, and adds [CLS] and [SEP].',
      why: 'These are exactly the steps the playground above runs in your browser.',
      inputs: 'One string',
      output: 'An Encoding',
    },
    {
      id: 'text',
      range: { line: 6, startCol: 17, endCol: 25 },
      match: '{{text}}',
      kind: 'parameter',
      title: 'The text',
      what: 'The text you typed in the playground, as a Python string.',
      why: 'It is filled from the same state as the token chips, so the code always matches what you see.',
    },
    {
      id: 'tokens',
      range: { line: 7 },
      kind: 'function',
      title: 'print(enc.tokens)',
      what: 'The token strings. A "##" prefix means the piece continues the previous word.',
      why: 'Reading tokens is the quickest way to see why a model treats two texts differently.',
    },
    {
      id: 'ids',
      range: { line: 8 },
      kind: 'function',
      title: 'print(enc.ids)',
      what: 'The token IDs: each token’s line number in vocab.txt. The model only ever sees these numbers.',
      why: 'IDs are what get looked up in the model’s embedding table. [CLS] is 101 and [SEP] is 102.',
    },
  ],
};

export const similarityCode: CodeExample = {
  id: 'similarity-st',
  language: 'python',
  source: `import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
sentences = open("sentences.txt").read().splitlines()
vectors = model.encode(sentences, normalize_embeddings=True)
query = model.encode({{query}}, normalize_embeddings=True)
scores = vectors @ query
best = np.argsort(-scores)[:3]
for i in best:
    print(f"{scores[i]:.3f}  {sentences[i]}")`,
  slots: { query: (s) => querySlot(s, items) },
  annotations: [
    {
      id: 'model',
      range: { line: 4, startCol: 8, endCol: 27 },
      match: 'SentenceTransformer',
      kind: 'framework',
      title: 'SentenceTransformer(name)',
      what: 'Loads an embedding model: a small transformer plus a pooling step that turns token vectors into one vector per text.',
      why: 'all-MiniLM-L6-v2 is small (6 layers, 384 dimensions) and fast on a CPU, which makes it a common first choice for search.',
    },
    {
      id: 'sentences',
      range: { line: 5, startCol: 0, endCol: 9 },
      match: 'sentences',
      kind: 'variable',
      title: 'sentences',
      what: 'The 20 example sentences, one per line of a text file.',
      why: 'These are the texts we search through: in a real app, your documents.',
      output: 'A list of 20 strings',
    },
    {
      id: 'vectors',
      range: { line: 6, startCol: 0, endCol: 7 },
      match: 'vectors',
      kind: 'variable',
      title: 'vectors',
      what: 'One embedding per sentence.',
      why: 'You compute these once and store them. Only the query needs embedding at search time.',
      output: 'A NumPy array of shape (20, 384)',
    },
    {
      id: 'normalize',
      range: { line: 6, startCol: 34, endCol: 59 },
      match: 'normalize_embeddings=True',
      kind: 'parameter',
      title: 'normalize_embeddings=True',
      what: 'Scales every vector to length 1.',
      why: 'For unit-length vectors the dot product equals the cosine similarity, so one matrix product scores every sentence.',
    },
    {
      id: 'query-text',
      range: { line: 7, startCol: 21, endCol: 30 },
      match: '{{query}}',
      kind: 'parameter',
      title: 'The query',
      what: 'The query selected in the experiment.',
      why: 'Filled from the same state as the ranking above.',
    },
    {
      id: 'scores',
      range: { line: 8, startCol: 9, endCol: 24 },
      match: 'vectors @ query',
      kind: 'math',
      title: 'vectors @ query',
      what: 'The dot product of every sentence vector with the query vector: (20, 384) @ (384,) → (20,).',
      why: 'With unit-length vectors, each of the 20 numbers is a cosine similarity between −1 and 1.',
      output: 'scores, shape (20,)',
    },
    {
      id: 'argsort',
      range: { line: 9, startCol: 7, endCol: 30 },
      match: 'np.argsort(-scores)[:3]',
      kind: 'framework',
      title: 'np.argsort(-scores)[:3]',
      what: 'The positions that would sort the scores from highest to lowest, cut to the first 3.',
      why: 'argsort sorts ascending, so negating the scores puts the most similar sentence first.',
      output: 'Three indices into sentences',
    },
  ],
};

/** Runs in the browser with Pyodide. Toy 3-number vectors, made up to show the arithmetic. */
export const cosineRunner: CodeExample = {
  id: 'cosine-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    return dot / (norm_a * norm_b)

cat = [0.9, 0.1, 0.0]
kitten = [0.8, 0.3, 0.1]
invoice = [0.0, 0.2, 0.9]
print(round(cosine(cat, kitten), 3))
print(round(cosine(cat, invoice), 3))
print(round(cosine(cat, [2 * x for x in cat]), 3))`,
  annotations: [],
  expectedOutput: '0.963\n0.024\n1.0',
};

const SPLIT_TEXT = 'text = "Tokenizers split unbelievably long words."';

/** From whitespace splitting to WordPiece, for ProgressiveCode. Outputs from CPython 3.13. */
export const tokenizerStages: CodeExample = {
  id: 'tokenizer-stages',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'split',
      title: 'Split on spaces',
      note: "Prints ['Tokenizers', 'split', 'unbelievably', 'long', 'words.']. The period sticks to \"words.\", and \"Tokenizers\" and \"tokenizers\" would be different entries. Every new word needs a new vocabulary entry.",
      source: `${SPLIT_TEXT}
print(text.split())`,
    },
    {
      id: 'words',
      title: 'Lowercase and punctuation',
      note: "Prints ['tokenizers', 'split', 'unbelievably', 'long', 'words', '.']. Better, but a word missing from the vocabulary still can't be represented at all.",
      source: `import re

${SPLIT_TEXT}
words = re.findall(r"\\w+|[^\\w\\s]", text.lower())
print(words)`,
    },
    {
      id: 'wordpiece',
      title: 'Subword pieces',
      note: "Prints ['token', '##izer', '##s', 'split', 'un', '##believ', '##ably', 'long', 'word', '##s', '.']. With only 10 vocabulary entries, every word is covered by pieces. Real vocabularies have about 30,000.",
      source: `import re

VOCAB = {"token", "##izer", "##s", "split", "un", "##believ", "##ably", "long", "word", "."}


def word_piece(word):
    pieces, start = [], 0
    while start < len(word):
        end = len(word)
        while end > start:
            piece = ("##" if start > 0 else "") + word[start:end]
            if piece in VOCAB:
                break
            end -= 1
        else:
            return ["[UNK]"]
        pieces.append(piece)
        start = end
    return pieces


${SPLIT_TEXT}
tokens = []
for word in re.findall(r"\\w+|[^\\w\\s]", text.lower()):
    tokens += word_piece(word)
print(tokens)`,
    },
  ],
};
