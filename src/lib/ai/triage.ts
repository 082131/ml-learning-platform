import type { ExperimentDef } from '../types';
import { parseReply, retryMessage, validate, type Schema } from './jsonSchema';

/**
 * Structured output for Lumen support tickets. The model replies are scripted (and labeled so in the
 * lesson); parsing, validation, the retry message and the scoring of two prompt variants run for real.
 */

export const CATEGORIES = ['billing', 'sync', 'account', 'api', 'other'] as const;

export const ticketSchema: Schema = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: CATEGORIES },
    urgency: { type: 'integer', minimum: 1, maximum: 3 },
    summary: { type: 'string', maxLength: 80 },
    needs_human: { type: 'boolean' },
  },
  required: ['category', 'urgency', 'summary', 'needs_human'],
  additionalProperties: false,
};

export const TICKET =
  'I was charged twice for March and the app now says error B-409. I need this sorted before my card statement closes on Friday.';

const VALID = `{"category": "billing", "urgency": 2, "summary": "Charged twice for March, sees B-409", "needs_human": true}`;

export const REPLIES: { id: string; label: string; text: string }[] = [
  { id: 'valid', label: 'A valid reply', text: VALID },
  { id: 'fenced', label: 'Wrapped in a ```json fence', text: '```json\n' + VALID + '\n```' },
  { id: 'chatty', label: 'With a sentence before the JSON', text: `Sure! Here is the JSON:\n${VALID}` },
  {
    id: 'bad-enum',
    label: 'A category that is not allowed',
    text: `{"category": "payments", "urgency": 2, "summary": "Charged twice for March, sees B-409", "needs_human": true}`,
  },
  {
    id: 'wrong-types',
    label: 'Urgency as a word, a field missing',
    text: `{"category": "billing", "urgency": "high", "summary": "Charged twice for March, sees B-409"}`,
  },
  {
    id: 'extra',
    label: 'An extra field and a long summary',
    text: `{"category": "billing", "urgency": 3, "summary": "The customer says they were charged twice for March and now sees error B-409 in the app", "needs_human": true, "sentiment": "angry"}`,
  },
  {
    id: 'truncated',
    label: 'Cut off by the token limit',
    text: `{"category": "billing", "urgency": 2, "summary": "Charged twice for Ma`,
  },
];

export interface TriageState {
  reply: string;
  stripFences: boolean;
}

export interface TriageResult {
  raw: string;
  parsed: boolean;
  parseError?: string;
  errors: string[];
  valid: boolean;
  value?: unknown;
  retry?: string;
}

export function computeTriage(s: TriageState): TriageResult {
  const raw = REPLIES.find((r) => r.id === s.reply)?.text ?? '';
  const p = parseReply(raw, s.stripFences);
  if (!p.ok) {
    const errors = [`$: ${p.error}`];
    return { raw, parsed: false, parseError: p.error, errors, valid: false, retry: retryMessage(errors) };
  }
  const errors = validate(ticketSchema, p.value);
  return {
    raw,
    parsed: true,
    errors,
    valid: errors.length === 0,
    value: p.value,
    retry: errors.length ? retryMessage(errors) : undefined,
  };
}

export function triageExperiment(id: string, initial: TriageState): ExperimentDef<TriageState, TriageResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'reply',
        label: 'Model reply',
        options: REPLIES.map((r) => ({ value: r.id, label: r.label })),
        get: (s) => s.reply,
        set: (s, v) => ({ ...s, reply: v }),
      },
      {
        kind: 'select',
        id: 'stripFences',
        label: 'Unwrap a ```json fence before parsing',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        get: (s) => (s.stripFences ? 'yes' : 'no'),
        set: (s, v) => ({ ...s, stripFences: v === 'yes' }),
      },
    ],
    compute: computeTriage,
    readout: (_s, r) => [
      { label: 'JSON.parse', value: r.parsed ? 'parsed' : 'failed', status: r.parsed ? 'ok' : 'error' },
      {
        label: 'Schema',
        value: r.valid ? 'valid' : `${r.errors.length} problem${r.errors.length === 1 ? '' : 's'}`,
        status: r.valid ? 'ok' : 'error',
      },
      {
        label: 'Next step',
        value: r.valid ? 'use the object' : 'send the retry message (once), then fall back',
      },
    ],
  };
}

// ---- Comparing two prompts on a labeled set ----

export interface LabeledTicket {
  id: string;
  text: string;
  gold: (typeof CATEGORIES)[number];
  /** Scripted replies for prompt A (instructions only) and prompt B (category definitions and examples). */
  a: string;
  b: string;
}

const j = (category: string, urgency: number, summary: string, human = false) =>
  JSON.stringify({ category, urgency, summary, needs_human: human });

export const LABELED: LabeledTicket[] = [
  {
    id: 't1',
    text: 'My card was declined when renewing Plus.',
    gold: 'billing',
    a: j('billing', 2, 'Card declined on Plus renewal'),
    b: j('billing', 2, 'Card declined on Plus renewal'),
  },
  {
    id: 't2',
    text: 'Sync stopped with E-402 on my phone.',
    gold: 'sync',
    a: j('sync', 2, 'E-402 on phone'),
    b: j('sync', 2, 'E-402 storage full on phone'),
  },
  {
    id: 't3',
    text: 'I never got the password reset email.',
    gold: 'account',
    a: j('other', 2, 'No reset email'),
    b: j('account', 2, 'Password reset email not received'),
  },
  {
    id: 't4',
    text: 'Getting 429 from the notes endpoint.',
    gold: 'api',
    a: j('api', 1, 'API returns 429'),
    b: j('api', 1, 'API rate limit 429'),
  },
  {
    id: 't5',
    text: 'How do I get a refund on my yearly plan?',
    gold: 'billing',
    a: j('refunds', 1, 'Yearly refund question'),
    b: j('billing', 1, 'Refund for yearly plan'),
  },
  {
    id: 't6',
    text: 'There is a conflicted copy of my note.',
    gold: 'sync',
    a: '```json\n' + j('sync', 1, 'Conflicted copy') + '\n```',
    b: j('sync', 1, 'Conflicted copy of a note'),
  },
  {
    id: 't7',
    text: 'My account is locked after too many tries.',
    gold: 'account',
    a: j('account', 2, 'Locked out'),
    b: j('account', 2, 'Locked after failed sign-ins'),
  },
  {
    id: 't8',
    text: 'Can you add a dark theme to the web app?',
    gold: 'other',
    a: j('other', 1, 'Feature request: dark theme'),
    b: j('other', 1, 'Feature request: dark theme'),
  },
  {
    id: 't9',
    text: 'The API token I made last spring stopped working.',
    gold: 'api',
    a: j('account', 2, 'Token stopped working'),
    b: j('account', 2, 'Old API token no longer works'),
  },
  {
    id: 't10',
    text: 'Charged twice this month, please help!',
    gold: 'billing',
    a: `Here is the ticket: ${j('billing', 3, 'Double charge', true)}`,
    b: j('billing', 3, 'Charged twice this month', true),
  },
];

export interface Scored {
  id: string;
  outcome: 'correct' | 'wrong category' | 'invalid';
  detail: string;
}

/** Scores one reply against the gold label: invalid if it fails parsing or the schema. */
export function scoreReply(raw: string, gold: string, stripFences: boolean): Omit<Scored, 'id'> {
  const p = parseReply(raw, stripFences);
  if (!p.ok) return { outcome: 'invalid', detail: p.error };
  const errors = validate(ticketSchema, p.value);
  if (errors.length) return { outcome: 'invalid', detail: errors[0]! };
  const got = (p.value as { category: string }).category;
  return got === gold
    ? { outcome: 'correct', detail: got }
    : { outcome: 'wrong category', detail: `${got}, expected ${gold}` };
}

export function scorePrompt(variant: 'a' | 'b', stripFences: boolean): { rows: Scored[]; correct: number } {
  const rows = LABELED.map((t) => ({ id: t.id, ...scoreReply(t[variant], t.gold, stripFences) }));
  return { rows, correct: rows.filter((r) => r.outcome === 'correct').length };
}

export interface CompareState {
  stripFences: boolean;
}

export interface CompareResult {
  a: { rows: Scored[]; correct: number };
  b: { rows: Scored[]; correct: number };
}

export function compareExperiment(
  id: string,
  initial: CompareState,
): ExperimentDef<CompareState, CompareResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'stripFences',
        label: 'Unwrap ```json fences when scoring',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        get: (s) => (s.stripFences ? 'yes' : 'no'),
        set: (s, v) => ({ ...s, stripFences: v === 'yes' }),
      },
    ],
    compute: (s) => ({ a: scorePrompt('a', s.stripFences), b: scorePrompt('b', s.stripFences) }),
    readout: (_s, r) => [
      { label: 'Prompt A (instructions only)', value: `${r.a.correct} of ${LABELED.length} correct` },
      { label: 'Prompt B (definitions and examples)', value: `${r.b.correct} of ${LABELED.length} correct` },
    ],
  };
}
