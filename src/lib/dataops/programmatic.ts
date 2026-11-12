/**
 * The programmatic-labeling lesson's experiment: keyword labeling functions vote on 16 support tickets ("is this a
 * refund request?"), and a majority vote turns the votes into weak labels. The learner switches functions on and
 * off and watches coverage, conflicts and accuracy against the gold labels. programmatic.test.ts checks every
 * combination against LF_SOURCE run with CPython.
 */
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

export const TICKETS: [string, number][] = [
  ['I want a refund for my last order', 1],
  ['Please refund me, the item arrived broken', 1],
  ['I was charged twice this month', 1],
  ['How do I get my money back?', 1],
  ['How do I reset my password?', 0],
  ['How do I change my email?', 0],
  ['Thanks, the refund arrived today', 0],
  ['Cancel my plan and refund the rest', 1],
  ['Cancel my subscription please', 0],
  ['The app crashes when I upload', 0],
  ['Thank you for the quick help', 0],
  ['I need my money back, the course was empty', 1],
  ['What is your refund policy?', 0],
  ['Charged twice again, fix it', 1],
  ['Where is the invoice for May?', 0],
  ["I'd like to cancel and get a refund", 1],
];

type Vote = 0 | 1 | null;
export const LF_NAMES = ['refund_word', 'money_back', 'how_question', 'thanks', 'cancel'] as const;
export type LfName = (typeof LF_NAMES)[number];

const LFS: Record<LfName, (t: string) => Vote> = {
  refund_word: (t) => (t.includes('refund') ? 1 : null),
  money_back: (t) => (t.includes('money back') || t.includes('charged twice') ? 1 : null),
  how_question: (t) => (t.startsWith('how') && t.endsWith('?') ? 0 : null),
  thanks: (t) => (t.includes('thank') ? 0 : null),
  cancel: (t) => (t.includes('cancel') ? 1 : null),
};

export const LF_RULE: Record<LfName, string> = {
  refund_word: '“refund” → yes',
  money_back: '“money back” or “charged twice” → yes',
  how_question: 'starts “how”, ends “?” → no',
  thanks: '“thank” → no',
  cancel: '“cancel” → yes',
};

export type ProgrammaticState = Record<LfName, boolean>;

export interface LfStat {
  name: LfName;
  fired: number;
  accuracy: number;
}

export interface TicketRow {
  text: string;
  gold: number;
  votes: Vote[];
  /** The majority vote, or null when nothing fired or the votes tie. */
  weak: Vote;
  conflict: boolean;
}

export interface ProgrammaticResult {
  active: LfName[];
  stats: LfStat[];
  rows: TicketRow[];
  labeled: number;
  correct: number;
  conflicts: number;
}

export function programmatic(state: ProgrammaticState): ProgrammaticResult {
  const active = LF_NAMES.filter((n) => state[n]);
  const rows: TicketRow[] = TICKETS.map(([text, gold]) => {
    // Python's str.lower() and the TS toLowerCase agree on these ASCII-plus-quote strings.
    const lower = text.toLowerCase();
    const votes = active.map((n) => LFS[n](lower));
    const cast = votes.filter((v): v is 0 | 1 => v !== null);
    const ones = cast.filter((v) => v === 1).length;
    const zeros = cast.length - ones;
    const weak: Vote = ones === zeros ? null : ones > zeros ? 1 : 0;
    return { text, gold, votes, weak, conflict: ones > 0 && zeros > 0 };
  });
  const stats = active.map((name, j) => {
    const fired = rows.filter((r) => r.votes[j] !== null);
    const right = fired.filter((r) => r.votes[j] === r.gold).length;
    return { name, fired: fired.length, accuracy: fired.length ? right / fired.length : 0 };
  });
  const labeledRows = rows.filter((r) => r.weak !== null);
  return {
    active,
    stats,
    rows,
    labeled: labeledRows.length,
    correct: labeledRows.filter((r) => r.weak === r.gold).length,
    conflicts: rows.filter((r) => r.conflict).length,
  };
}

/** What LF_SOURCE prints. */
export function programmaticPrintout(r: ProgrammaticResult): string {
  const lines = r.stats.map(
    (s) => `${s.name.padEnd(13)} coverage ${String(s.fired).padStart(2)}/16  accuracy ${pyFixed(s.accuracy, 2)}`,
  );
  lines.push(`weak labels: ${r.labeled}/16 tickets, ${r.conflicts} with conflicting votes`);
  lines.push(
    r.labeled
      ? `weak-label accuracy on labeled tickets: ${pyFixed(r.correct / r.labeled, 2)}`
      : 'weak-label accuracy: no ticket labeled',
  );
  return lines.join('\n');
}

export const LF_SOURCE = `TICKETS = [
    ("I want a refund for my last order", 1),
    ("Please refund me, the item arrived broken", 1),
    ("I was charged twice this month", 1),
    ("How do I get my money back?", 1),
    ("How do I reset my password?", 0),
    ("How do I change my email?", 0),
    ("Thanks, the refund arrived today", 0),
    ("Cancel my plan and refund the rest", 1),
    ("Cancel my subscription please", 0),
    ("The app crashes when I upload", 0),
    ("Thank you for the quick help", 0),
    ("I need my money back, the course was empty", 1),
    ("What is your refund policy?", 0),
    ("Charged twice again, fix it", 1),
    ("Where is the invoice for May?", 0),
    ("I'd like to cancel and get a refund", 1),
]  # (ticket, gold label: 1 = refund request)
ACTIVE = {{active}}  # labeling functions switched on
ABSTAIN = None


def refund_word(t):  # mentions a refund
    return 1 if "refund" in t else ABSTAIN


def money_back(t):  # asks for money or reports a double charge
    return 1 if "money back" in t or "charged twice" in t else ABSTAIN


def how_question(t):  # how-to questions are rarely refund requests
    return 0 if t.startswith("how") and t.endswith("?") else ABSTAIN


def thanks(t):  # thank-you notes are not requests
    return 0 if "thank" in t else ABSTAIN


def cancel(t):  # cancellations often come with a refund request
    return 1 if "cancel" in t else ABSTAIN


LFS = {f.__name__: f for f in (refund_word, money_back, how_question, thanks, cancel)}
votes = [[LFS[name](text.lower()) for name in ACTIVE] for text, _ in TICKETS]

for j, name in enumerate(ACTIVE):
    fired = [(v[j], gold) for v, (_, gold) in zip(votes, TICKETS) if v[j] is not ABSTAIN]
    acc = sum(vote == gold for vote, gold in fired) / len(fired) if fired else 0
    print(f"{name:<13} coverage {len(fired):2}/16  accuracy {acc:.2f}")

labeled = correct = conflicts = 0
for v, (_, gold) in zip(votes, TICKETS):
    cast = [x for x in v if x is not ABSTAIN]
    if len(set(cast)) > 1:
        conflicts += 1
    ones, zeros = cast.count(1), cast.count(0)
    if ones == zeros:
        continue  # no votes, or a tie: leave the ticket unlabeled
    labeled += 1
    correct += (1 if ones > zeros else 0) == gold
print(f"weak labels: {labeled}/16 tickets, {conflicts} with conflicting votes")
print(f"weak-label accuracy on labeled tickets: {correct / labeled:.2f}" if labeled else "weak-label accuracy: no ticket labeled")`;

export const programmaticSlots = (s: ProgrammaticState) => ({
  active: `[${LF_NAMES.filter((n) => s[n])
    .map((n) => `"${n}"`)
    .join(', ')}]`,
});

export function programmaticExperiment(id: string): ExperimentDef<ProgrammaticState, ProgrammaticResult> {
  return {
    id,
    initial: { refund_word: true, money_back: false, how_question: false, thanks: false, cancel: false },
    controls: LF_NAMES.map((name) => ({
      kind: 'select' as const,
      id: name,
      label: name,
      options: [
        { value: 'on', label: `on: ${LF_RULE[name]}` },
        { value: 'off', label: 'off' },
      ],
      get: (s: ProgrammaticState) => (s[name] ? 'on' : 'off'),
      set: (s: ProgrammaticState, v: string) => ({ ...s, [name]: v === 'on' }),
    })),
    compute: programmatic,
    readout: (_s, r) => [
      { label: 'Python: what label.py prints', value: programmaticPrintout(r) },
      {
        label: 'Tickets still needing a person',
        value: `${16 - r.labeled} of 16 (no vote or a tie)`,
      },
    ],
  };
}
