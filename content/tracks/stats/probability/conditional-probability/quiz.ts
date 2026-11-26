import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'swap',
    type: 'choice',
    prompt: 'A spam filter catches 99% of spam. An email in your spam folder: what is the chance it really is spam?',
    options: [
      { text: '99%', correct: false, explain: 'That is P(flagged | spam). The question asks for P(spam | flagged), which is a different number. Swapping them is the classic error.' },
      { text: 'It cannot be known without the share of email that is spam and the false alarm rate', correct: true, explain: "Bayes' rule needs the base rate and the false positive rate as well. With little spam and many false alarms, the answer can be far below 99%." },
      { text: '1%, because the filter misses 1%', correct: false, explain: 'The 1% is P(not flagged | spam): spam that gets through. It says nothing about the flagged pile.' },
    ],
  },
  {
    id: 'two-tests',
    type: 'numeric',
    prompt: 'Of 100,000 transactions, 1,000 are fraud. A model flags 950 of the fraud and 4,950 of the legitimate ones. A flagged transaction is checked by a second, independent model with the same error rates, and it is flagged again. What is P(fraud | flagged twice)? Give 3 decimals.',
    answer: 0.785,
    tolerance: 0.002,
    hint: 'After the first flag, the new "base rate" is 950 / 5,900. Run the same calculation again starting from the 5,900 flagged transactions.',
    explain: 'Start from the 5,900 flagged: 950 fraud and 4,950 legit. The second model flags 95% of the fraud (902.5) and 5% of the legit (247.5). 902.5 / (902.5 + 247.5) = 0.785. The posterior of the first test became the prior of the second.',
  },
  {
    id: 'which-moves',
    type: 'choice',
    prompt: 'Fraud is 1%, the model catches 95% and false-alarms on 5%. Which single change raises P(fraud | flagged) the most?',
    options: [
      { text: 'Catch 100% of fraud instead of 95%', correct: false, explain: 'That turns 950 caught into 1,000, but the 4,950 false alarms stay. P(fraud | flagged) only rises from 16.1% to 16.8%.' },
      { text: 'Cut false alarms from 5% to 1%', correct: true, explain: 'False alarms drop from 4,950 to 990, so 950 / (950 + 990) = 49.0%. When the condition is rare, the false positive rate dominates.' },
      { text: 'Neither matters; only the base rate does', correct: false, explain: 'The base rate matters a lot, but the error rates matter too: the false alarm rate here triples the answer.' },
    ],
  },
  {
    id: 'cond-def',
    type: 'choice',
    prompt: 'In a class, 30 of 100 students passed. Of the 40 who did the practice exam, 24 passed. Which number is P(passed | did the practice exam)?',
    options: [
      { text: '24 / 100 = 0.24', correct: false, explain: 'That is P(passed AND did the practice exam): the share of the whole class in both groups.' },
      { text: '24 / 40 = 0.60', correct: true, explain: 'Conditioning shrinks the world to the 40 who did the practice exam, and 24 of those 40 passed.' },
      { text: '24 / 30 = 0.80', correct: false, explain: 'That is P(did the practice exam | passed): among those who passed, the share who practised. The order inside P( | ) matters.' },
    ],
  },
  {
    id: 'prosecutor',
    type: 'choice',
    prompt: 'A DNA match happens by chance for 1 in 1,000,000 innocent people. A city of 5 million people is searched and one match is found. A lawyer says: "The chance this person is innocent is 1 in a million." What is wrong?',
    options: [
      { text: 'Nothing: the match is that rare', correct: false, explain: 'The rarity is P(match | innocent). The claim is about P(innocent | match), the reverse.' },
      { text: 'With 5 million people, about 5 innocent people would match by chance, so a match alone is weak evidence', correct: true, explain: 'The base rate of the guilty person among 5 million is tiny. Expected chance matches: 5,000,000 × 1/1,000,000 ≈ 5, so with one true source, P(innocent | match) is around 5/6 without other evidence.' },
      { text: 'DNA tests are never that accurate', correct: false, explain: 'Accept the number as given; the error is in which way round the probability is read.' },
    ],
  },
];

export const bayesExercise: Exercise = {
  id: 'bayes-posterior',
  prompt:
    "Write `posterior(prior, sensitivity, false_positive_rate)` that returns P(condition | positive test) using Bayes' rule. Then write `counts(population, prior, sensitivity, false_positive_rate)` that returns the natural-frequency table as a tuple `(true_pos, false_neg, false_pos, true_neg)`.",
  starter: `def posterior(prior, sensitivity, false_positive_rate):
    return 0.0

def counts(population, prior, sensitivity, false_positive_rate):
    return (0, 0, 0, 0)`,
  hints: [
    'P(positive) = prior * sensitivity + (1 - prior) * false_positive_rate. The posterior is the first part divided by the whole.',
    'counts: sick = population * prior; true_pos = sick * sensitivity; false_pos = (population - sick) * false_positive_rate.',
  ],
  solution: `def posterior(prior, sensitivity, false_positive_rate):
    true_pos = prior * sensitivity
    false_pos = (1 - prior) * false_positive_rate
    return true_pos / (true_pos + false_pos)

def counts(population, prior, sensitivity, false_positive_rate):
    sick = population * prior
    healthy = population - sick
    true_pos = sick * sensitivity
    false_pos = healthy * false_positive_rate
    return (true_pos, sick - true_pos, false_pos, healthy - false_pos)`,
  explanation:
    'The two functions are the same calculation seen two ways. counts() is the tree with people in it; posterior() divides the "positive and sick" branch by all positive branches. With a 1% base rate, 95% sensitivity and 5% false positives, both give 950 / 5,900 ≈ 0.161.',
  tests: `assert abs(posterior(0.01, 0.95, 0.05) - 950 / 5900) < 1e-12
assert abs(posterior(0.5, 0.95, 0.05) - 0.95) < 1e-12
assert posterior(0.2, 1.0, 0.0) == 1.0
tp, fn, fp, tn = counts(100_000, 0.01, 0.95, 0.05)
assert (round(tp), round(fn), round(fp), round(tn)) == (950, 50, 4950, 94050)
assert abs(tp / (tp + fp) - posterior(0.01, 0.95, 0.05)) < 1e-12`,
};
