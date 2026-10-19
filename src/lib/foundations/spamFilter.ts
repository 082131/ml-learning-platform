import type { ExperimentDef, ReadoutItem } from '../types';

/** A toy email: lowercase words separated by spaces, and its true label. */
export interface Email {
  text: string;
  label: 'spam' | 'ham';
}

/** The emails the learned filter is trained on. */
export const TRAIN_EMAILS: Email[] = [
  { text: 'win a free prize now', label: 'spam' },
  { text: 'free money claim now', label: 'spam' },
  { text: 'cheap pills free shipping', label: 'spam' },
  { text: 'claim your prize money today', label: 'spam' },
  { text: 'you won free tickets claim now', label: 'spam' },
  { text: 'lunch meeting moved to noon', label: 'ham' },
  { text: 'your invoice for march', label: 'ham' },
  { text: 'can we meet today about the project', label: 'ham' },
  { text: 'photos from the weekend trip', label: 'ham' },
  { text: 'are you free to talk later today', label: 'ham' },
];

/** Emails neither filter has seen: they show how each rule does on new data. */
export const NEW_EMAILS: Email[] = [
  { text: 'claim your free gift now', label: 'spam' },
  { text: 'prize draw winner announced today', label: 'spam' },
  { text: 'cheap flights deal', label: 'spam' },
  { text: 'meeting notes from today', label: 'ham' },
  { text: 'free for lunch tomorrow', label: 'ham' },
  { text: 'project update and invoice', label: 'ham' },
];

export const MAX_EMAIL_LENGTH = 80;

/**
 * Keeps lowercase ASCII letters, digits and spaces, so the text is a valid Python string literal and
 * Python's `text.lower().split()` gives the same words as `words()` below.
 */
export const cleanText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .slice(0, MAX_EMAIL_LENGTH);

/** Python's `text.lower().split()` for cleaned text. */
export const words = (text: string) => cleanText(text).split(' ').filter(Boolean);

/** Word list typed by the learner, as in "free, prize": cleaned, deduplicated, in order. */
export const parseKeywords = (text: string) => [...new Set(text.split(',').flatMap(words))];

/** The hand-written rule: spam if any word is one of the keywords. */
export const ruleIsSpam = (text: string, keywords: string[]) => words(text).some((w) => keywords.includes(w));

/**
 * Learns one score per word: +1 for every spam email it appears in, −1 for every ham email.
 * A word counts once per email (Python: `set(text.split())`).
 */
export function learnScores(emails: Email[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const { text, label } of emails)
    for (const w of new Set(words(text))) scores.set(w, (scores.get(w) ?? 0) + (label === 'spam' ? 1 : -1));
  return scores;
}

/** The email's score: the sum of its words' scores, 0 for unknown words, counting repeats. */
export const scoreEmail = (text: string, scores: Map<string, number>) =>
  words(text).reduce((sum, w) => sum + (scores.get(w) ?? 0), 0);

export const learnedIsSpam = (text: string, scores: Map<string, number>, threshold: number) =>
  scoreEmail(text, scores) > threshold;

/** How many emails a rule labels correctly. */
export const countCorrect = (emails: Email[], isSpam: (text: string) => boolean) =>
  emails.filter((e) => isSpam(e.text) === (e.label === 'spam')).length;

/**
 * Learns the threshold: tries every whole number between the lowest and highest training score,
 * keeps those with the fewest training mistakes, and picks the middle one of them.
 */
export function learnThreshold(emails: Email[], scores: Map<string, number>): number {
  const all = emails.map((e) => scoreEmail(e.text, scores));
  const candidates: number[] = [];
  for (let t = Math.min(...all); t <= Math.max(...all); t++) candidates.push(t);
  const correct = candidates.map((t) => countCorrect(emails, (text) => learnedIsSpam(text, scores, t)));
  const best = Math.max(...correct);
  const tied = candidates.filter((_, i) => correct[i] === best);
  return tied[Math.floor((tied.length - 1) / 2)]!;
}

export interface SpamState {
  keywords: string;
  threshold: number;
  email: string;
}

export interface SpamResult {
  scores: Map<string, number>;
  learnedThreshold: number;
  keywords: string[];
  /** The learner's email, word by word with each word's learned score. */
  email: { words: { word: string; score: number; keyword: boolean }[]; score: number };
  rule: { email: boolean; train: number; new: number };
  learned: { email: boolean; train: number; new: number };
}

export const SCORES = learnScores(TRAIN_EMAILS);
export const LEARNED_THRESHOLD = learnThreshold(TRAIN_EMAILS, SCORES);
export const THRESHOLD_LIMITS = { min: -10, max: 12 } as const;

export function computeSpam(s: SpamState): SpamResult {
  const keywords = parseKeywords(s.keywords);
  const rule = (text: string) => ruleIsSpam(text, keywords);
  const learned = (text: string) => learnedIsSpam(text, SCORES, s.threshold);
  return {
    scores: SCORES,
    learnedThreshold: LEARNED_THRESHOLD,
    keywords,
    email: {
      words: words(s.email).map((word) => ({
        word,
        score: SCORES.get(word) ?? 0,
        keyword: keywords.includes(word),
      })),
      score: scoreEmail(s.email, SCORES),
    },
    rule: {
      email: rule(s.email),
      train: countCorrect(TRAIN_EMAILS, rule),
      new: countCorrect(NEW_EMAILS, rule),
    },
    learned: {
      email: learned(s.email),
      train: countCorrect(TRAIN_EMAILS, learned),
      new: countCorrect(NEW_EMAILS, learned),
    },
  };
}

/** Python's `print(True)` spelling. */
export const pyBool = (b: boolean) => (b ? 'True' : 'False');

/** The keywords as a Python set literal, for the code slot: {"free", "prize"}. */
export const pySet = (items: string[]) => (items.length ? `{${items.map((w) => `"${w}"`).join(', ')}}` : 'set()');

const of = (n: number, total: number) => `${n} of ${total} (${Math.round((100 * n) / total)}%)`;

export function spamReadout(s: SpamState, r: SpamResult): ReadoutItem[] {
  const sum = r.email.words.map((w) => (w.score < 0 ? `(${w.score})` : String(w.score))).join(' + ') || '0';
  return [
    { label: 'print(rule_is_spam(email))', value: pyBool(r.rule.email) },
    { label: 'Learned score of the email', value: `${sum} = ${r.email.score}` },
    { label: `print(is_spam(email)), score > ${s.threshold}`, value: pyBool(r.learned.email) },
    { label: 'Hand-written rule: correct on training emails', value: of(r.rule.train, TRAIN_EMAILS.length) },
    { label: 'Hand-written rule: correct on new emails', value: of(r.rule.new, NEW_EMAILS.length) },
    { label: 'Learned filter: correct on training emails', value: of(r.learned.train, TRAIN_EMAILS.length) },
    { label: 'Learned filter: correct on new emails', value: of(r.learned.new, NEW_EMAILS.length) },
  ];
}

/** Hand-written keywords vs learned word scores, on the same emails. */
export function spamExperiment(id: string, initial: SpamState): ExperimentDef<SpamState, SpamResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'text',
        id: 'email',
        label: 'Your email (letters, digits and spaces)',
        maxLength: MAX_EMAIL_LENGTH,
        get: (s) => s.email,
        set: (s, v) => ({ ...s, email: cleanText(v) }),
      },
      {
        kind: 'text',
        id: 'keywords',
        label: 'Hand-written rule: spam if the email contains any of (comma-separated)',
        maxLength: MAX_EMAIL_LENGTH,
        get: (s) => s.keywords,
        set: (s, v) => ({ ...s, keywords: v.toLowerCase().replace(/[^a-z0-9, ]/g, '') }),
      },
      {
        kind: 'slider',
        id: 'threshold',
        label: 'Learned filter: spam if the score is above',
        ...THRESHOLD_LIMITS,
        get: (s) => s.threshold,
        set: (s, v) => ({ ...s, threshold: v }),
      },
    ],
    compute: computeSpam,
    readout: spamReadout,
  };
}

const pyEmails = (emails: Email[]) => emails.map((e) => `    ("${e.text}", "${e.label}"),`).join('\n');

/**
 * The lesson's Python program. Slots are filled from the experiment state (spamSlots), so the code
 * shown prints exactly what the readout says. Checked against CPython in spamFilter.test.ts.
 */
export const SPAM_SOURCE = `train = [
${pyEmails(TRAIN_EMAILS)}
]

# Hand-written rule: a person picks the keywords.
KEYWORDS = {{keywords}}

def rule_is_spam(text):
    return any(word in KEYWORDS for word in text.lower().split())

# Learned rule: every word gets a score from the labeled examples.
scores = {}
for text, label in train:
    for word in set(text.split()):
        change = 1 if label == "spam" else -1
        scores[word] = scores.get(word, 0) + change

def is_spam(text, threshold={{threshold}}):
    total = sum(scores.get(word, 0) for word in text.lower().split())
    return total > threshold

email = "{{email}}"
print(rule_is_spam(email))
print(is_spam(email))`;

export const spamSlots = (s: SpamState): Record<string, string> => ({
  keywords: pySet(parseKeywords(s.keywords)),
  threshold: String(s.threshold),
  email: cleanText(s.email),
});

/** The new emails as a Python list literal, for the runnable program. */
export const NEW_EMAILS_PY = `new = [\n${pyEmails(NEW_EMAILS)}\n]`;
export const TRAIN_EMAILS_PY = `train = [\n${pyEmails(TRAIN_EMAILS)}\n]`;
