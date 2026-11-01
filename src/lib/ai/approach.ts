import type { ExperimentDef } from '../types';

/**
 * Choosing how to get a model: call a hosted API, run a pretrained model yourself, fine-tune one, or train
 * from scratch. The rules are a teaching simplification of the trade-offs in the AI landscape lesson; the
 * costs are estimates from the stated formula and example prices, not quotes.
 */

export type Task = 'general-language' | 'domain-language' | 'tabular';
export type Privacy = 'cloud-ok' | 'stay-in-house';
export type ApproachId = 'api' | 'pretrained' | 'fine-tune' | 'train';
export type Verdict = 'fits' | 'possible' | 'poor';

export interface ApproachState {
  task: Task;
  /** Labeled examples you have for this task. */
  labels: number;
  privacy: Privacy;
  requestsPerDay: number;
  /** Example price of one GPU server hour, in dollars. */
  gpuHourly: number;
}

export interface ApproachRow {
  id: ApproachId;
  name: string;
  verdict: Verdict;
  reasons: string[];
  /** Estimated monthly running cost in dollars, or undefined when it doesn't apply. */
  monthly?: number;
}

export interface ApproachResult {
  rows: ApproachRow[];
  recommended: ApproachId;
  apiMonthly: number;
  selfHostMonthly: number;
  /** Requests per day at which a self-hosted server costs the same as the API. */
  breakEvenPerDay: number;
}

/** Example API prices and request size (dollars per million tokens; tokens per request). */
export const API_PRICE = { inputPerM: 1, outputPerM: 5 } as const;
export const REQUEST_TOKENS = { input: 1500, output: 300 } as const;
export const DAYS_PER_MONTH = 30;
export const HOURS_PER_MONTH = 24 * DAYS_PER_MONTH;
/** Labeled examples below which fine-tuning rarely beats a good prompt, and the scale where training a tabular model works well. */
export const FINE_TUNE_MIN_LABELS = 1000;
export const TABULAR_MIN_LABELS = 1000;

export const LABEL_OPTIONS = [0, 100, 1000, 10000, 100000] as const;

/** Dollars per request at the example prices: 1500 · 1/1e6 + 300 · 5/1e6 = 0.003. */
export function apiCostPerRequest(): number {
  return (REQUEST_TOKENS.input * API_PRICE.inputPerM + REQUEST_TOKENS.output * API_PRICE.outputPerM) / 1e6;
}

export function apiMonthly(requestsPerDay: number): number {
  return requestsPerDay * DAYS_PER_MONTH * apiCostPerRequest();
}

/** One GPU server running all month. Real deployments need at least two for availability. */
export function selfHostMonthly(gpuHourly: number): number {
  return gpuHourly * HOURS_PER_MONTH;
}

export function breakEvenPerDay(gpuHourly: number): number {
  return selfHostMonthly(gpuHourly) / (DAYS_PER_MONTH * apiCostPerRequest());
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function computeApproach(s: ApproachState): ApproachResult {
  const language = s.task !== 'tabular';
  const inHouse = s.privacy === 'stay-in-house';
  const api = apiMonthly(s.requestsPerDay);
  const host = selfHostMonthly(s.gpuHourly);
  const rows: ApproachRow[] = [];

  {
    const reasons: string[] = [];
    let verdict: Verdict = 'fits';
    if (inHouse) {
      verdict = 'poor';
      reasons.push('Requests would send your data to the provider, which this use case does not allow.');
    }
    if (!language) {
      verdict = 'poor';
      reasons.push('Language model APIs are a poor fit for predicting from rows of numbers and categories.');
    }
    if (verdict === 'fits') {
      reasons.push('No training and no servers: you can try it today with a prompt.');
      if (s.task === 'domain-language')
        reasons.push(
          'Check quality on your own examples first; specialized wording can trip general models.',
        );
    }
    if (api > host && language)
      reasons.push(
        `At this volume the API (${money(api)}/month) costs more than one GPU server (${money(host)}/month).`,
      );
    rows.push({ id: 'api', name: 'Call a hosted model API', verdict, reasons, monthly: api });
  }

  {
    const reasons: string[] = [];
    let verdict: Verdict = language ? 'fits' : 'poor';
    if (!language) reasons.push('There is no pretrained model that already knows your table’s columns.');
    else {
      reasons.push('Your data stays on servers you control.');
      reasons.push(`You run and pay for the servers: about ${money(host)}/month for one GPU, used or not.`);
      if (!inHouse && api < host) verdict = 'possible';
    }
    rows.push({ id: 'pretrained', name: 'Run a pretrained model yourself', verdict, reasons, monthly: host });
  }

  {
    const reasons: string[] = [];
    let verdict: Verdict;
    if (!language) {
      verdict = 'poor';
      reasons.push('Fine-tuning adapts a pretrained model; tabular problems usually have none to adapt.');
    } else if (s.labels < FINE_TUNE_MIN_LABELS) {
      verdict = 'poor';
      reasons.push(
        `${s.labels.toLocaleString('en-US')} labeled examples is too few to fine-tune reliably; start with prompting and use them to evaluate.`,
      );
    } else {
      verdict = s.task === 'domain-language' ? 'fits' : 'possible';
      reasons.push('Enough labeled examples to teach a consistent format, style or domain vocabulary.');
      reasons.push('You now own a training pipeline, an evaluation set and model versions.');
    }
    rows.push({ id: 'fine-tune', name: 'Fine-tune a pretrained model', verdict, reasons, monthly: host });
  }

  {
    const reasons: string[] = [];
    let verdict: Verdict;
    if (language) {
      verdict = 'poor';
      reasons.push('Training a language model from scratch needs billions of words and large GPU budgets.');
    } else if (s.labels < TABULAR_MIN_LABELS) {
      verdict = 'possible';
      reasons.push('Few labeled rows: a simple model can work, but measure it with cross-validation.');
    } else {
      verdict = 'fits';
      reasons.push('Classical ML on your own rows is cheap to train and runs on a CPU.');
    }
    rows.push({ id: 'train', name: 'Train your own model from scratch', verdict, reasons });
  }

  const order: ApproachId[] = language ? ['api', 'pretrained', 'fine-tune', 'train'] : ['train', 'api'];
  const pick = (v: Verdict) => order.find((id) => rows.find((r) => r.id === id)!.verdict === v);
  const recommended = pick('fits') ?? pick('possible') ?? order[0]!;

  return {
    rows,
    recommended,
    apiMonthly: api,
    selfHostMonthly: host,
    breakEvenPerDay: breakEvenPerDay(s.gpuHourly),
  };
}

export const VOLUME_STEPS = [100, 1000, 5000, 10000, 20000, 50000, 100000] as const;

export function approachExperiment(
  id: string,
  initial: ApproachState,
): ExperimentDef<ApproachState, ApproachResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'task',
        label: 'Task',
        options: [
          { value: 'general-language', label: 'Answer customer questions in plain English' },
          { value: 'domain-language', label: 'Summarize legal contracts in a house format' },
          { value: 'tabular', label: 'Predict which customers will cancel, from account data' },
        ],
        get: (s) => s.task,
        set: (s, v) => ({ ...s, task: v as Task }),
      },
      {
        kind: 'select',
        id: 'labels',
        label: 'Labeled examples you have',
        options: LABEL_OPTIONS.map((n) => ({ value: String(n), label: n.toLocaleString('en-US') })),
        get: (s) => String(s.labels),
        set: (s, v) => ({ ...s, labels: Number(v) }),
      },
      {
        kind: 'select',
        id: 'privacy',
        label: 'Can the data go to an outside provider?',
        options: [
          { value: 'cloud-ok', label: 'Yes, under a data agreement' },
          { value: 'stay-in-house', label: 'No, it must stay on our servers' },
        ],
        get: (s) => s.privacy,
        set: (s, v) => ({ ...s, privacy: v as Privacy }),
      },
      {
        kind: 'slider',
        id: 'volume',
        label: 'Requests per day',
        min: 0,
        max: VOLUME_STEPS.length - 1,
        get: (s) => Math.max(0, VOLUME_STEPS.indexOf(s.requestsPerDay as (typeof VOLUME_STEPS)[number])),
        set: (s, v) => ({ ...s, requestsPerDay: VOLUME_STEPS[Math.round(v)]! }),
        format: (v) => VOLUME_STEPS[Math.round(v)]!.toLocaleString('en-US'),
      },
      {
        kind: 'slider',
        id: 'gpu',
        label: 'GPU server, $ per hour (example)',
        min: 0.5,
        max: 4,
        step: 0.5,
        get: (s) => s.gpuHourly,
        set: (s, v) => ({ ...s, gpuHourly: v }),
        format: (v) => `$${v.toFixed(2)}`,
      },
    ],
    compute: computeApproach,
    readout: (s, r) =>
      [
        { label: 'Suggested start', value: r.rows.find((x) => x.id === r.recommended)!.name },
        { label: 'API cost (estimate)', value: `${money(r.apiMonthly)}/month` },
        { label: 'One GPU server (estimate)', value: `${money(r.selfHostMonthly)}/month` },
        {
          label: 'Break-even volume',
          value: `${Math.round(r.breakEvenPerDay).toLocaleString('en-US')} requests/day`,
        },
        {
          label: 'Cheaper at this volume',
          value: r.apiMonthly <= r.selfHostMonthly ? 'the API' : 'self-hosting',
        },
      ].concat(s.task === 'tabular' ? [{ label: 'Note', value: 'costs compare language models only' }] : []),
  };
}
