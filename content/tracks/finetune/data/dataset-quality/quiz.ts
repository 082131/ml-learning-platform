import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ft-l6-jaccard',
    type: 'numeric',
    prompt: 'Text A has the shingles {a, b, c, d} and text B has {c, d, e}. What is their Jaccard similarity? (Two decimals.)',
    answer: 0.4,
    tolerance: 0.001,
    hint: 'Shared shingles over all distinct shingles.',
    explain: 'Shared: {c, d} = 2. Union: {a, b, c, d, e} = 5. 2 / 5 = 0.40.',
  },
  {
    id: 'ft-l6-dup-harm',
    type: 'choice',
    prompt: 'One answer template appears 400 times (lightly reworded) among 5,000 SFT examples. What is the main harm?',
    options: [
      { text: 'Training crashes on repeated data', correct: false, explain: 'Training runs fine; that is what makes the problem easy to miss.' },
      { text: 'Every epoch trains that answer 400 times', correct: true, explain: 'Duplicates act like a hidden weight: the model over-fits that one pattern and may produce it where it does not belong. Lee et al. found deduplicated data gives better models and less memorized output.' },
      { text: 'The tokenizer vocabulary fills up with the repeated words', correct: false, explain: 'The tokenizer is fixed; it does not grow with training data.' },
      { text: 'Duplicates make the validation loss impossible to compute', correct: false, explain: 'Validation still works; it may even look too good if duplicates cross the split.' },
    ],
  },
  {
    id: 'ft-l6-split',
    type: 'choice',
    prompt: 'You deduplicate after splitting into train and test. Near-duplicate pairs with one copy in each split remain. What does that do to your test score?',
    options: [
      { text: 'Inflates it: those items were effectively trained on', correct: true, explain: 'That is contamination. Deduplicate (or group near-duplicates) before splitting, so each cluster lands in one split only.' },
      { text: 'Nothing, because the texts are not exactly identical', correct: false, explain: 'A lightly reworded copy is nearly as easy to recall as the exact one.' },
      { text: 'Lowers it, because the model is confused by two versions', correct: false, explain: 'Seeing a near-copy in training makes the test item easier, not harder.' },
    ],
  },
  {
    id: 'ft-l6-minhash',
    type: 'choice',
    prompt: 'Why does a single MinHash position agree for two sets with probability equal to their Jaccard similarity?',
    options: [
      { text: 'The hash maps similar texts to similar numbers', correct: false, explain: 'Good hash functions do the opposite: similar inputs get unrelated numbers. The trick works on which element is the minimum, not on closeness of values.' },
      { text: 'The minimum over the union is shared with that probability', correct: true, explain: 'Under a random hash, each element of the union is equally likely to have the smallest value. Both sets have the same minimum exactly when that element is in both, which happens with probability |A ∩ B| / |A ∪ B|.' },
      { text: 'Longer documents get more matching positions by design', correct: false, explain: 'Signature length is fixed (say 128) regardless of document length; that is the point.' },
      { text: 'MinHash only works for documents of equal length', correct: false, explain: 'It works for any sets; length differences show up as lower Jaccard similarity.' },
    ],
  },
  {
    id: 'ft-l6-too-good',
    type: 'choice',
    prompt: 'A fine-tune jumps from 71% to 97% on your held-out support questions. The training data includes a scraped copy of your public FAQ. What should you do first?',
    options: [
      { text: 'Ship it: held-out means the score is trustworthy', correct: false, explain: 'Held out from your split, perhaps, but not from the scraped FAQ, which may contain the same questions.' },
      { text: 'Run an n-gram overlap check between the FAQ and the test set', correct: true, explain: 'A 26-point jump is the typical signature of contamination. Remove overlapping training items and re-evaluate before believing the number.' },
      { text: 'Train for more epochs to reach 100%', correct: false, explain: 'More training on leaked items only inflates the score further.' },
      { text: 'Lower the learning rate and retrain', correct: false, explain: 'The learning rate does not explain a suspicious jump on items the model may have seen.' },
    ],
  },
  {
    id: 'ft-l6-synthetic',
    type: 'choice',
    prompt: 'You generate 20,000 synthetic support answers with a strong model. Which check matters most before training on them?',
    options: [
      { text: 'That they are long, since long answers look more helpful', correct: false, explain: 'Length is not quality, and training on long answers teaches verbosity.' },
      { text: 'That a reviewed sample is correct and matches policy', correct: true, explain: 'Synthetic data copies the generator’s mistakes and style at scale. Review a sample, filter with checks (format, facts against the docs, policy rules) and deduplicate, because generators repeat themselves.' },
      { text: 'That they were generated at temperature 0', correct: false, explain: 'Temperature 0 reduces variety, which makes near-duplicates more likely; it does not make answers correct.' },
      { text: 'That they use the same chat template as the generator model', correct: false, explain: 'You render training data with the template of the model you are fine-tuning, not the generator’s.' },
    ],
  },
];

export const jaccardExercise: Exercise = {
  id: 'ft-jaccard-text',
  prompt:
    'Write `text_jaccard(a, b, n)`: lowercase both texts, replace every character that is not a letter, digit or whitespace with a space, split into words, build the set of n-word shingles (a text with fewer than n words gives one shingle: all its words joined by spaces), and return the Jaccard similarity of the two sets. Two empty texts have similarity 1.',
  starter: `import re

def text_jaccard(a, b, n):
    return 0.0`,
  hints: [
    'Write a helper shingles(text) that returns a set; use " ".join(words[i:i+n]).',
    'Jaccard = len(A & B) / len(A | B); handle the both-empty case first.',
  ],
  solution: `import re

def text_jaccard(a, b, n):
    def shingles(text):
        words = re.sub(r"[^a-z0-9\\s]", " ", text.lower()).split()
        if not words:
            return set()
        if len(words) < n:
            return {" ".join(words)}
        return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}
    sa, sb = shingles(a), shingles(b)
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)`,
  explanation:
    'Normalizing first makes trivial variants identical; n decides how strict the comparison is. Small n finds paraphrases but also false matches on shared phrases; large n only finds near-copies.',
  tests: `assert text_jaccard("Reset your password!", "reset your password", 2) == 1.0
assert abs(text_jaccard("a b c d e", "a b c x y", 2) - 2 / 6) < 1e-12
assert text_jaccard("", "", 3) == 1.0
assert text_jaccard("hello", "goodbye", 1) == 0.0
assert text_jaccard("one two", "one two", 5) == 1.0`,
};
