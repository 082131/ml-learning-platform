import type { ExperimentDef } from '../types';
import { lumenDocs } from './lumen';

/**
 * An evaluation set for the Lumen support assistant, with code-based graders. The answers of the two
 * prompt versions are scripted (and labeled so); the graders, the categories and the totals run for real.
 */

export interface EvalCase {
  id: string;
  question: string;
  /** Article ids sent as sources [1], [2]. */
  sources: string[];
  /** A phrase a correct answer must contain, or null if the sources don't answer the question. */
  expect: string | null;
  answers: { v1: string; v2: string };
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: 'reset-link',
    question: 'How long does a password reset link stay valid?',
    sources: ['security', 'email'],
    expect: '30 minutes',
    answers: {
      v1: 'A password reset link is valid for 30 minutes and can be used once [1].',
      v2: 'The reset link is valid for 30 minutes and works once [1].',
    },
  },
  {
    id: 'monthly-refund',
    question: 'Can I get my money back if I cancel my monthly subscription?',
    sources: ['refunds', 'plans'],
    expect: 'not refunded',
    answers: {
      v1: 'Yes, monthly plans can be refunded within 14 days of purchase [1].',
      v2: 'The context does not say whether monthly plans are refunded.',
    },
  },
  {
    id: 'e402',
    question: 'What does error E-402 mean?',
    sources: ['sync', 'payments'],
    expect: 'storage quota is full',
    answers: {
      v1: 'Error E-402 means your card was declined by your bank [2].',
      v2: 'Error E-402 means your storage quota is full; delete notes or upgrade your plan [1].',
    },
  },
  {
    id: 'team-storage',
    question: 'How much storage does each member of a team get?',
    sources: ['plans', 'refunds'],
    expect: '100 GB',
    answers: {
      v1: 'Each Team member gets 100 GB of storage [1].',
      v2: 'Each Team member gets 100 GB of storage [1].',
    },
  },
  {
    id: 'rate-limit',
    question: 'How many API calls can I make per minute?',
    sources: ['api', 'sync'],
    expect: '60 requests per minute',
    answers: {
      v1: 'Each token can make up to 100 requests per minute [1].',
      v2: 'Each API token can make up to 60 requests per minute; above that you get HTTP 429 [1].',
    },
  },
  {
    id: 'token-expiry',
    question: 'How long do API tokens last?',
    sources: ['api', 'security'],
    expect: '90 days',
    answers: {
      v1: 'API tokens expire after 90 days [3].',
      v2: 'API tokens expire after 90 days, and you can revoke one at any time [1].',
    },
  },
  {
    id: 'yearly-discount',
    question: 'Is there a discount for paying yearly?',
    sources: ['plans', 'refunds'],
    expect: '20%',
    answers: {
      v1: 'Paying yearly gives a 20% discount on Plus and Team [1].',
      v2: 'Yes: paying yearly gives a 20% discount on Plus and Team [1].',
    },
  },
  {
    id: 'offline-conflict',
    question: 'What happens if I edit the same note on two devices while both are offline?',
    sources: ['sync', 'api'],
    expect: 'conflicted copy',
    answers: {
      v1: 'Lumen keeps both versions and adds a conflicted copy next to the original [1].',
      v2: 'Lumen keeps both versions and adds a conflicted copy, so no text is lost [1].',
    },
  },
  {
    id: 'handwriting',
    question: 'Can Lumen turn my handwriting into text?',
    sources: ['api', 'plans'],
    expect: null,
    answers: {
      v1: 'Yes, Lumen converts handwriting to text in the mobile app on the Plus plan [2].',
      v2: 'The help center does not mention handwriting recognition, so I can’t confirm that Lumen does it.',
    },
  },
  {
    id: 'linux',
    question: 'Is there a Lumen app for Linux?',
    sources: ['plans', 'sync'],
    expect: null,
    answers: {
      v1: 'Yes, Lumen runs on Linux, Windows and macOS on up to 3 devices [1].',
      v2: 'The context does not say which operating systems Lumen supports.',
    },
  },
];

export type Version = 'v1' | 'v2';
export type Category =
  | 'correct'
  | 'correct refusal'
  | 'wrong fact'
  | 'unsupported claim'
  | 'answered without a source'
  | 'bad citation'
  | 'missed answer';

export interface Graded {
  id: string;
  answer: string;
  citations: number[];
  /** Numbers and codes in the answer that no cited source contains. */
  unsupported: string[];
  checks: { fact: boolean; citations: boolean; supported: boolean };
  category: Category;
}

const REFUSAL = /does not (say|mention)|doesn't (say|mention)|can[’']t confirm|don[’']t know/i;
/** Numbers, percentages, sizes and error codes: the claims that are easiest to check and to get wrong. */
const CLAIM = /\b[A-Z]-\d{3}\b|\d+(?:\.\d+)?%?/g;

export function citationsIn(answer: string): number[] {
  return [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
}

export function claimsIn(answer: string): string[] {
  return (answer.replace(/\[\d+\]/g, '').match(CLAIM) ?? []).filter((c, i, a) => a.indexOf(c) === i);
}

export function gradeCase(c: EvalCase, answer: string): Graded {
  const sources = c.sources.map((id) => lumenDocs.find((d) => d.id === id)!.text);
  const citations = citationsIn(answer);
  const refused = REFUSAL.test(answer);
  const citationsOk =
    citations.every((n) => n >= 1 && n <= sources.length) && (refused || citations.length > 0);
  const cited = citations.filter((n) => n >= 1 && n <= sources.length).map((n) => sources[n - 1]!);
  const unsupported = claimsIn(answer).filter((claim) => !cited.some((t) => t.includes(claim)));
  const fact = c.expect === null ? refused : answer.toLowerCase().includes(c.expect.toLowerCase());
  let category: Category;
  if (c.expect === null) category = refused ? 'correct refusal' : 'answered without a source';
  else if (refused) category = 'missed answer';
  else if (!citationsOk) category = 'bad citation';
  else if (unsupported.length) category = 'unsupported claim';
  else if (!fact) category = 'wrong fact';
  else category = 'correct';
  return {
    id: c.id,
    answer,
    citations,
    unsupported,
    checks: { fact, citations: citationsOk, supported: unsupported.length === 0 },
    category,
  };
}

export interface EvalState {
  version: Version;
}

export interface EvalResult {
  rows: Graded[];
  passed: number;
  byCategory: Partial<Record<Category, number>>;
  other: { passed: number };
}

const PASSING: Category[] = ['correct', 'correct refusal'];

export function runEval(version: Version): {
  rows: Graded[];
  passed: number;
  byCategory: Partial<Record<Category, number>>;
} {
  const rows = EVAL_CASES.map((c) => gradeCase(c, c.answers[version]));
  const byCategory: Partial<Record<Category, number>> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  return { rows, passed: rows.filter((r) => PASSING.includes(r.category)).length, byCategory };
}

export function evalExperiment(id: string, initial: EvalState): ExperimentDef<EvalState, EvalResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'version',
        label: 'Prompt version',
        options: [
          { value: 'v1', label: 'v1: "Answer the question using the context."' },
          { value: 'v2', label: 'v2: v1 + "Use only the context, cite it, say if it isn’t there."' },
        ],
        get: (s) => s.version,
        set: (s, v) => ({ ...s, version: v as Version }),
      },
    ],
    compute: (s) => {
      const r = runEval(s.version);
      return { ...r, other: { passed: runEval(s.version === 'v1' ? 'v2' : 'v1').passed } };
    },
    readout: (s, r) => [
      { label: `Passed (${s.version})`, value: `${r.passed} of ${r.rows.length}` },
      {
        label: `Passed (${s.version === 'v1' ? 'v2' : 'v1'})`,
        value: `${r.other.passed} of ${r.rows.length}`,
      },
      {
        label: 'Failures',
        value:
          Object.entries(r.byCategory)
            .filter(([k]) => !PASSING.includes(k as Category))
            .map(([k, n]) => `${k} ×${n}`)
            .join(', ') || 'none',
      },
    ],
  };
}
