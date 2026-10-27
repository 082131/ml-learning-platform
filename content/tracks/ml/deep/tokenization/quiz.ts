import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pair-count',
    type: 'numeric',
    prompt:
      'A corpus has the words low ×5 and lower ×2, each still split into single characters. What is the count of the pair (o, w)?',
    answer: 7,
    tolerance: 0,
    hint: 'The pair appears once in each word. Add the word counts of every word that contains it.',
    explain: '(o, w) appears once in low (5 times) and once in lower (2 times): 5 + 2 = 7.',
  },
  {
    id: 'vocab-size',
    type: 'numeric',
    prompt:
      'The lesson’s corpus has 10 distinct characters. The vocabulary also has [UNK]. How many tokens does it have after 10 merges, if every merge makes a new token?',
    answer: 21,
    tolerance: 0,
    hint: 'Count the fallback, the base characters, and one new token per merge.',
    explain: '1 + 10 + 10 = 21, matching the program’s “21 tokens in the vocabulary”.',
  },
  {
    id: 'encode-order',
    type: 'choice',
    prompt: 'The merges, in order, are e+s, es+t, l+o, lo+w. How is the unseen word “lowest” tokenized?',
    options: [
      {
        text: 'low | est',
        correct: true,
        explain: 'Replaying the merges in order: l o w e s t → l o w es t → l o w est → lo w est → low est.',
      },
      {
        text: 'lowest',
        correct: false,
        explain: 'No merge ever made the token lowest; encoding can only use tokens in the vocabulary.',
      },
      {
        text: '[UNK]',
        correct: false,
        explain: 'Every character of lowest is in the base vocabulary, so nothing falls back to [UNK].',
      },
      {
        text: 'l | o | w | e | s | t',
        correct: false,
        explain: 'That is the tokenization with 0 merges. The learned merges apply to new words too.',
      },
    ],
  },
  {
    id: 'unk',
    type: 'choice',
    prompt:
      'Why does a byte-level BPE tokenizer such as GPT-2’s never need an [UNK] token for unseen characters?',
    options: [
      {
        text: 'Its base vocabulary has all 256 byte values, and any text can be written as UTF-8 bytes',
        correct: true,
        explain:
          'An unseen character is split into its UTF-8 bytes, and each byte has a token. It may cost several tokens, but nothing is lost.',
      },
      {
        text: 'It was trained on all the text on the internet, so it has seen every character',
        correct: false,
        explain:
          'No corpus contains every character. The guarantee comes from the byte base vocabulary, not from the corpus.',
      },
      {
        text: 'It deletes characters it does not know',
        correct: false,
        explain: 'Deleting text would make decoding lossy. Byte-level BPE can always reproduce the input.',
      },
    ],
  },
  {
    id: 'why-subwords',
    type: 'choice',
    prompt: 'Why do language models use subword tokens instead of one token per whole word?',
    options: [
      {
        text: 'A fixed vocabulary of pieces can spell any word, while frequent words still get a single token',
        correct: true,
        explain:
          'Whole-word vocabularies cannot cover new or rare words; characters alone make sequences very long. Subwords sit between the two.',
      },
      {
        text: 'Subwords are always the linguistic roots of words',
        correct: false,
        explain:
          'BPE merges by frequency, not by grammar. Its pieces often match roots and suffixes (est), but not always.',
      },
      {
        text: 'It makes the vocabulary as small as possible',
        correct: false,
        explain:
          'A character-level vocabulary would be smaller. Subwords trade a larger vocabulary for shorter sequences.',
      },
    ],
  },
  {
    id: 'train-steps',
    type: 'order',
    prompt: 'Put the steps of one BPE training run in order.',
    items: [
      'Split the corpus into words and count them',
      'Split every word into single characters',
      'Count every adjacent pair, weighted by word count',
      'Merge the most frequent pair everywhere and add it to the vocabulary',
      'Repeat counting and merging until the number of merges is reached',
    ],
    explain: 'Counting happens again after every merge, because each merge creates new pairs (es + t).',
  },
];

export const countPairsExercise: Exercise = {
  id: 'count-pairs',
  prompt:
    'Write `count_pairs(words, counts)` that returns a dict from each adjacent pair of symbols to its count, weighted by how often each word occurs.',
  starter: `def count_pairs(words, counts):
    # words: {"low": ["l", "o", "w"], ...}; counts: {"low": 5, ...}
    pairs = {}
    return pairs`,
  hints: [
    'Loop over `words.items()` to get each word and its list of symbols.',
    '`zip(symbols, symbols[1:])` gives each symbol with its right neighbour as a tuple.',
    'Add `counts[w]`, not 1: `pairs[pair] = pairs.get(pair, 0) + counts[w]`.',
  ],
  solution: `def count_pairs(words, counts):
    pairs = {}
    for w, symbols in words.items():
        for pair in zip(symbols, symbols[1:]):
            pairs[pair] = pairs.get(pair, 0) + counts[w]
    return pairs`,
  explanation:
    'Each distinct word is stored once with its count, so adding the count (instead of 1) gives the same total as scanning the whole corpus. zip of a list with itself shifted by one is the usual Python idiom for neighbouring pairs.',
  tests: `assert count_pairs({"low": ["l", "o", "w"]}, {"low": 1}) == {("l", "o"): 1, ("o", "w"): 1}, 'one word, count 1: each pair once'
r = count_pairs({"low": ["l", "o", "w"], "lot": ["l", "o", "t"]}, {"low": 2, "lot": 1})
assert r == {("l", "o"): 3, ("o", "w"): 2, ("o", "t"): 1}, f'(l, o) appears in low (x2) and lot (x1), so it should be 3; got {r}'
assert count_pairs({"aaa": ["a", "a", "a"]}, {"aaa": 4}) == {("a", "a"): 8}, 'aaa has two (a, a) pairs, each counted 4 times'
assert count_pairs({"x": ["x"]}, {"x": 9}) == {}, 'a single symbol has no pairs'
assert count_pairs({"lo": ["lo"], "low": ["lo", "w"]}, {"lo": 1, "low": 3}) == {("lo", "w"): 3}, 'merged symbols pair up like characters'`,
};
