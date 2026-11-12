/**
 * The annotation-agreement lesson's experiment: two annotators label short comments as toxic (1) or not (0).
 * Their behaviour is scripted from each comment's kind, so the lesson can show how guidelines, label balance and
 * a careless annotator change observed agreement and Cohen's kappa. The kappa arithmetic is real;
 * agreement.test.ts checks every setting against AGREEMENT_SOURCE run with CPython.
 */
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

/** T: insult aimed at a person. O: clearly fine. P: profanity with no target. S: sarcastic insult. Q: quoting an insult to report it. */
export type Kind = 'T' | 'O' | 'P' | 'S' | 'Q';

export interface Item {
  text: string;
  kind: Kind;
}

const T = [
  'You are a complete idiot.',
  'Nobody wants you here, loser.',
  'Shut up, you clown.',
  'Go away, moron.',
  'You’re pathetic and useless.',
  'People like you ruin everything.',
];
const O = [
  'Thanks, this fixed my issue.',
  'Where can I find the docs?',
  'I disagree with the second point.',
  'Great write-up, very clear.',
  'Is there a version for Windows?',
  'The link in step 3 is broken.',
  'Can I export to CSV?',
  'Works fine on my laptop.',
  'Which release added this?',
  'Please add dark mode.',
  'Same problem here since Monday.',
  'The fix in 2.1 worked.',
  'How long does the trial last?',
  'Can admins see my drafts?',
  'Love the new search.',
  'Docs say port 8080, is that right?',
];
const P = ['This damn printer jammed again.', 'Holy hell, that update was slow.', 'Crap, I forgot my password.'];
const S = [
  'Great job, genius, you broke it again.',
  'Wow, brilliant idea, Einstein.',
  'Nice work, champ. Truly impressive.',
];
const Q = ['He called me a “moron” in the meeting.', 'The DM said “loser”, I’m reporting it.'];

const items = (t: number, o: number, p: number, s: number, q: number): Item[] => [
  ...T.slice(0, t).map((text) => ({ text, kind: 'T' as const })),
  ...O.slice(0, o).map((text) => ({ text, kind: 'O' as const })),
  ...P.slice(0, p).map((text) => ({ text, kind: 'P' as const })),
  ...S.slice(0, s).map((text) => ({ text, kind: 'S' as const })),
  ...Q.slice(0, q).map((text) => ({ text, kind: 'Q' as const })),
];

export const SAMPLES = {
  balanced: items(6, 6, 3, 3, 2),
  rare: items(1, 16, 1, 1, 1),
} as const;

export const GUIDELINES = ['v1', 'v2'] as const;
export const ANNOTATORS = ['careful', 'lazy'] as const;
export type Sample = keyof typeof SAMPLES;
export type Guideline = (typeof GUIDELINES)[number];
export type Annotator = (typeof ANNOTATORS)[number];

export interface AgreementState {
  guideline: Guideline;
  sample: Sample;
  annotatorB: Annotator;
}

/**
 * v1 says only "label it toxic if it is offensive", so each annotator applies a private rule to the unclear
 * kinds: A flags profanity and quoted insults, B flags sarcasm. v2 adds three rules (profanity without a target is
 * not toxic, a sarcastic insult at a person is, quoting an insult to report it is not); A still gets the first
 * quoted comment wrong. A lazy annotator answers "not toxic" to everything.
 */
export function labelOf(kind: Kind, who: 'A' | 'B', g: Guideline, firstQuote: boolean): number {
  if (kind === 'T') return 1;
  if (kind === 'O') return 0;
  if (g === 'v1') {
    const flags = who === 'A' ? kind === 'P' || kind === 'Q' : kind === 'S';
    return flags ? 1 : 0;
  }
  if (kind === 'Q' && who === 'A' && firstQuote) return 1;
  return kind === 'S' ? 1 : 0;
}

export interface AgreementResult {
  items: Item[];
  a: number[];
  b: number[];
  /** [[both 0, A 0 B 1], [A 1 B 0, both 1]] */
  matrix: [[number, number], [number, number]];
  po: number;
  pe: number;
  kappa: number;
}

export function agreement({ guideline, sample, annotatorB }: AgreementState): AgreementResult {
  const list = SAMPLES[sample];
  const firstQ = list.findIndex((i) => i.kind === 'Q');
  const a = list.map((it, i) => labelOf(it.kind, 'A', guideline, i === firstQ));
  const b = list.map((it, i) => (annotatorB === 'lazy' ? 0 : labelOf(it.kind, 'B', guideline, i === firstQ)));
  const n = list.length;
  const matrix: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0],
  ];
  a.forEach((x, i) => matrix[x]![b[i]!]!++);
  const po = (matrix[0][0] + matrix[1][1]) / n;
  const pa = a.reduce((s, x) => s + x, 0) / n;
  const pb = b.reduce((s, x) => s + x, 0) / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return { items: list, a, b, matrix, po, pe, kappa: (po - pe) / (1 - pe) };
}

/** What AGREEMENT_SOURCE prints. */
export function agreementPrintout(r: AgreementResult): string {
  const n = r.items.length;
  return [
    `items: ${n}, disagreements: ${n - r.matrix[0][0] - r.matrix[1][1]}`,
    `observed agreement p_o = ${pyFixed(r.po, 2)}`,
    `chance agreement   p_e = ${pyFixed(r.pe, 3)}`,
    `Cohen's kappa = ${pyFixed(r.kappa, 2)}`,
  ].join('\n');
}

export const AGREEMENT_SOURCE = `A = {{a}}  # annotator A: 1 = toxic, 0 = not toxic
B = {{b}}  # annotator B, same comments in the same order
n = len(A)

both_toxic = sum(a == 1 and b == 1 for a, b in zip(A, B))
both_fine = sum(a == 0 and b == 0 for a, b in zip(A, B))
p_o = (both_toxic + both_fine) / n  # observed agreement

p_a, p_b = sum(A) / n, sum(B) / n  # how often each annotator says "toxic"
p_e = p_a * p_b + (1 - p_a) * (1 - p_b)  # agreement expected if both labeled at random at those rates
kappa = (p_o - p_e) / (1 - p_e)

print(f"items: {n}, disagreements: {n - both_toxic - both_fine}")
print(f"observed agreement p_o = {p_o:.2f}")
print(f"chance agreement   p_e = {p_e:.3f}")
print(f"Cohen's kappa = {kappa:.2f}")`;

const pyList = (xs: number[]) => `[${xs.join(', ')}]`;
export const agreementSlots = (s: AgreementState) => {
  const r = agreement(s);
  return { a: pyList(r.a), b: pyList(r.b) };
};

/** A common reading of kappa (Landis and Koch, 1977); bands are a convention, not a law. */
export function kappaBand(k: number): string {
  if (k < 0.2) return 'slight or none';
  if (k < 0.4) return 'fair';
  if (k < 0.6) return 'moderate';
  if (k < 0.8) return 'substantial';
  return 'almost perfect';
}

export function agreementExperiment(id: string): ExperimentDef<AgreementState, AgreementResult> {
  return {
    id,
    initial: { guideline: 'v1', sample: 'balanced', annotatorB: 'careful' },
    controls: [
      {
        kind: 'select',
        id: 'guideline',
        label: 'Guidelines',
        options: [
          { value: 'v1', label: 'v1: “label offensive comments”' },
          { value: 'v2', label: 'v2: with three edge-case rules' },
        ],
        get: (s) => s.guideline,
        set: (s, v) => ({ ...s, guideline: v as Guideline }),
      },
      {
        kind: 'select',
        id: 'sample',
        label: 'Comments',
        options: [
          { value: 'balanced', label: 'Balanced sample of 20' },
          { value: 'rare', label: 'Live stream of 20 (toxic is rare)' },
        ],
        get: (s) => s.sample,
        set: (s, v) => ({ ...s, sample: v as Sample }),
      },
      {
        kind: 'select',
        id: 'annotatorB',
        label: 'Annotator B',
        options: [
          { value: 'careful', label: 'Reads every comment' },
          { value: 'lazy', label: 'Always answers “not toxic”' },
        ],
        get: (s) => s.annotatorB,
        set: (s, v) => ({ ...s, annotatorB: v as Annotator }),
      },
    ],
    compute: agreement,
    readout: (_s, r) => [
      { label: 'Python: what kappa.py prints', value: agreementPrintout(r) },
      { label: 'Reading of kappa', value: `${pyFixed(r.kappa, 2)}: ${kappaBand(r.kappa)} agreement` },
    ],
  };
}
