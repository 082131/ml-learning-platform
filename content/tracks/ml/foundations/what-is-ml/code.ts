// Code for "What AI, ML and deep learning actually mean". Every printed output below was produced by
// running the code with CPython 3.13 and with Pyodide 314.0.7 (Python 3.14.2); both print the same.
// The linked program is also checked against CPython for several inputs in src/lib/foundations/spamFilter.test.ts.
import { lineOf, span } from '@/lib/foundations/annotate';
import {
  LEARNED_THRESHOLD,
  NEW_EMAILS_PY,
  SPAM_SOURCE,
  TRAIN_EMAILS_PY,
  spamExperiment,
  spamSlots,
  type SpamState,
} from '@/lib/foundations/spamFilter';
import type { CodeExample } from '@/lib/types';

/** One state for the lesson: the filter table, the linked code and the readout read it. */
export const experiment = spamExperiment('spam', {
  email: 'are you free for lunch today',
  keywords: 'free, prize',
  threshold: LEARNED_THRESHOLD,
});

const st = (s: unknown) => s as SpamState;
const src = SPAM_SOURCE;
const L = {
  keywords: lineOf(src, 'KEYWORDS = '),
  rule: lineOf(src, 'return any('),
  scores: lineOf(src, 'scores = {}'),
  outer: lineOf(src, 'for text, label in train:'),
  inner: lineOf(src, 'for word in set('),
  change: lineOf(src, 'change = 1'),
  update: lineOf(src, 'scores[word] = '),
  def: lineOf(src, 'def is_spam'),
  total: lineOf(src, 'total = sum('),
  ret: lineOf(src, 'return total > threshold'),
  email: lineOf(src, 'email = '),
};

export const spamCode: CodeExample = {
  id: 'spam-filter',
  language: 'python',
  source: src,
  slots: Object.fromEntries(
    ['keywords', 'threshold', 'email'].map((name) => [name, (s: unknown) => spamSlots(st(s))[name]!]),
  ),
  annotations: [
    {
      id: 'train',
      range: { line: 1 },
      kind: 'variable',
      title: 'train: the labeled examples',
      what: 'A list of (text, label) pairs. Each pair is one email and the answer a person gave for it.',
      why: 'A learned filter needs examples with known answers. These ten emails are its whole training data.',
      output: 'A list of 10 tuples',
    },
    {
      id: 'keywords',
      ...span(src, L.keywords, '{{keywords}}'),
      kind: 'parameter',
      title: 'KEYWORDS: chosen by a person',
      what: 'The words the hand-written rule looks for, as a Python set. Filled from the keyword box above.',
      why: 'In a rule-based system, a person decides what matters. Nothing here comes from the data.',
    },
    {
      id: 'any',
      ...span(src, L.rule, 'any'),
      kind: 'function',
      title: 'any(...)',
      what: 'True as soon as one word of the email is in KEYWORDS, otherwise False.',
      why: 'This is the whole hand-written rule: one keyword is enough to call it spam.',
      output: 'True or False',
    },
    {
      id: 'lower-split',
      ...span(src, L.rule, 'text.lower().split()'),
      kind: 'function',
      title: 'text.lower().split()',
      what: 'Turns the text to lowercase, then cuts it into a list of words at the spaces.',
      why: '"FREE" and "free" should count as the same word.',
      inputs: 'A string such as "Free lunch"',
      output: 'A list such as ["free", "lunch"]',
    },
    {
      id: 'scores',
      ...span(src, L.scores, 'scores'),
      kind: 'variable',
      title: 'scores: what the program learns',
      what: 'A dictionary from each word to a number. Positive means the word shows up more in spam, negative more in normal email.',
      why: 'These numbers are the model’s parameters. The program fills them in from the examples.',
      output: 'For example scores["free"] == 3 and scores["the"] == -2',
    },
    {
      id: 'outer',
      range: { line: L.outer },
      kind: 'syntax',
      title: 'for text, label in train:',
      what: 'Goes through the ten examples one at a time, unpacking each pair into text and label.',
      why: 'Training means looking at every example.',
    },
    {
      id: 'set',
      ...span(src, L.inner, 'set(text.split())'),
      kind: 'function',
      title: 'set(text.split())',
      what: 'The distinct words of the email. A set drops repeats.',
      why: 'A word counts once per email, so "now now now" in one spam email does not count three times.',
    },
    {
      id: 'change',
      range: { line: L.change },
      kind: 'math',
      title: 'change = 1 if label == "spam" else -1',
      what: '+1 when the email is spam, −1 when it is normal email (ham).',
      why: 'A word seen in 4 spam emails and 1 ham email ends up with 4 − 1 = 3.',
    },
    {
      id: 'get',
      ...span(src, L.update, 'scores.get(word, 0)'),
      kind: 'function',
      title: 'scores.get(word, 0)',
      what: 'The word’s score so far, or 0 the first time the word is seen.',
      why: 'scores[word] would raise KeyError for a word that is not in the dictionary yet.',
    },
    {
      id: 'threshold',
      ...span(src, L.def, '{{threshold}}'),
      kind: 'parameter',
      title: 'threshold',
      what: 'The score an email must be above to be called spam. Filled from the slider.',
      why: `The lesson’s starting value, ${LEARNED_THRESHOLD}, is learned too: of all thresholds that get the most training emails right, it is the middle one.`,
    },
    {
      id: 'sum',
      ...span(src, L.total, 'sum(scores.get(word, 0) for word in text.lower().split())'),
      kind: 'math',
      title: 'sum(... for word in ...)',
      what: 'Adds up the scores of the email’s words. Unknown words add 0.',
      why: 'The email’s score combines the evidence from every word, which a single keyword cannot do.',
      output: 'A whole number, for example 3 − 1 − 1 = 1 for "free lunch today"',
    },
    {
      id: 'compare',
      ...span(src, L.ret, 'total > threshold'),
      kind: 'math',
      title: 'total > threshold',
      what: 'True (spam) when the score is above the threshold.',
      why: 'Turning a score into a yes/no decision with a threshold is how most classifiers decide.',
    },
    {
      id: 'email',
      ...span(src, L.email, '{{email}}'),
      kind: 'parameter',
      title: 'Your email',
      what: 'The text from the email box above.',
      why: 'The readout below shows what the two print lines print for it.',
    },
  ],
};

/** Runs in the browser with Pyodide: learn the scores, then judge the six new emails. */
export const spamRunner: CodeExample = {
  id: 'spam-runner',
  language: 'python',
  run: 'pyodide',
  source: `${TRAIN_EMAILS_PY}
${NEW_EMAILS_PY}

scores = {}
for text, label in train:
    for word in set(text.split()):
        change = 1 if label == "spam" else -1
        scores[word] = scores.get(word, 0) + change

for word in ["free", "claim", "your", "today", "the"]:
    print(word, scores[word])

def is_spam(text, threshold=${LEARNED_THRESHOLD}):
    total = sum(scores.get(word, 0) for word in text.split())
    return total > threshold

correct = 0
for text, label in new:
    guess = "spam" if is_spam(text) else "ham"
    if guess == label:
        correct += 1
    print(guess, "| true:", label, "|", text)
print(correct, "of", len(new), "new emails correct")`,
  annotations: [],
  expectedOutput: `free 3
claim 3
your 0
today -1
the -2
spam | true: spam | claim your free gift now
ham | true: spam | prize draw winner announced today
ham | true: spam | cheap flights deal
ham | true: ham | meeting notes from today
ham | true: ham | free for lunch tomorrow
ham | true: ham | project update and invoice
4 of 6 new emails correct`,
};
