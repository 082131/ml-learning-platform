// A cron expression parser and next-run calculator with the semantics of Vixie cron / cronie (the cron on most
// Linux systems): five fields, lists, ranges, steps, month and weekday names, and the day-of-month OR day-of-week
// rule. Times are UTC: GitHub Actions and most cloud schedulers evaluate cron in UTC unless told otherwise.

export interface CronField {
  name: 'minute' | 'hour' | 'day of month' | 'month' | 'day of week';
  min: number;
  max: number;
  values: number[];
  /** The field starts with "*": Vixie cron uses this for the day rule, so "*\/2" counts as a star. */
  star: boolean;
  source: string;
}

export interface CronSpec {
  fields: CronField[];
  /** Day of month and day of week are both restricted: a day matches if EITHER matches. */
  dayOr: boolean;
}

export type CronParse = { ok: true; spec: CronSpec } | { ok: false; error: string };

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const SPECS: Pick<CronField, 'name' | 'min' | 'max'>[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of week', min: 0, max: 7 },
];

function atom(text: string, field: number): number {
  const up = text.toUpperCase();
  if (field === 3 && MONTHS.includes(up)) return MONTHS.indexOf(up) + 1;
  if (field === 4 && DAYS.includes(up)) return DAYS.indexOf(up);
  if (!/^\d+$/.test(text)) throw new Error(`"${text}" is not a number${field >= 3 ? ' or a name' : ''}`);
  return Number(text);
}

function parseField(src: string, index: number): CronField {
  const { name, min, max } = SPECS[index]!;
  const values = new Set<number>();
  for (const part of src.split(',')) {
    if (part === '') throw new Error(`empty list item in the ${name} field`);
    const [range = '', stepText, extra] = part.split('/');
    if (extra !== undefined) throw new Error(`"${part}" has two steps`);
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`step "${stepText}" must be a whole number of at least 1`);
    let lo: number;
    let hi: number;
    if (range === '*') {
      lo = min;
      hi = index === 4 ? 6 : max;
    } else if (range.includes('-')) {
      const [a = '', b = ''] = range.split('-');
      lo = atom(a, index);
      hi = atom(b, index);
      if (lo > hi) throw new Error(`range "${range}" runs backwards`);
    } else {
      lo = atom(range, index);
      if (stepText !== undefined) throw new Error(`"${part}": a step needs a range or *, as in ${range}-${max}/${stepText}`);
      hi = lo;
    }
    if (lo < min || hi > max) throw new Error(`${name} must be between ${min} and ${max}, got "${part}"`);
    for (let v = lo; v <= hi; v += step) values.add(index === 4 && v === 7 ? 0 : v);
  }
  return { name, min, max, values: [...values].sort((a, b) => a - b), star: src.startsWith('*'), source: src };
}

export function parseCron(expr: string): CronParse {
  const trimmed = expr.trim();
  const text = MACROS[trimmed.toLowerCase()] ?? trimmed;
  if (text.startsWith('@')) return { ok: false, error: `unknown macro "${trimmed}"` };
  const parts = text.split(/\s+/);
  if (parts.length !== 5) return { ok: false, error: `expected 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}` };
  try {
    const fields = parts.map(parseField);
    return { ok: true, spec: { fields, dayOr: !fields[2]!.star && !fields[4]!.star } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function dayMatches(spec: CronSpec, d: Date): boolean {
  const [, , dom, month, dow] = spec.fields as [CronField, CronField, CronField, CronField, CronField];
  if (!month.values.includes(d.getUTCMonth() + 1)) return false;
  const domOk = dom.values.includes(d.getUTCDate());
  const dowOk = dow.values.includes(d.getUTCDay());
  return spec.dayOr ? domOk || dowOk : domOk && dowOk;
}

const DAY_MS = 86_400_000;
/** How far ahead to look before giving up (an expression like "0 0 30 2 *" never fires). */
export const SEARCH_YEARS = 5;

/** The next `count` run times strictly after `from` (UTC). Fewer if the expression never matches. */
export function nextRuns(spec: CronSpec, from: Date, count: number): Date[] {
  const out: Date[] = [];
  const [minutes, hours] = spec.fields as [CronField, CronField];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (let day = start; out.length < count && day < start + SEARCH_YEARS * 366 * DAY_MS; day += DAY_MS) {
    const d = new Date(day);
    if (!dayMatches(spec, d)) continue;
    for (const h of hours.values)
      for (const m of minutes.values) {
        const t = day + h * 3_600_000 + m * 60_000;
        if (t > from.getTime() && out.length < count) out.push(new Date(t));
      }
  }
  return out;
}

/** Does the expression fire at this minute? */
export function cronMatches(spec: CronSpec, t: Date): boolean {
  return dayMatches(spec, t) && spec.fields[1]!.values.includes(t.getUTCHours()) && spec.fields[0]!.values.includes(t.getUTCMinutes());
}

const pad = (n: number) => String(n).padStart(2, '0');
const title = (name: string) => name.slice(0, 1) + name.slice(1).toLowerCase();
/** "Mon 2026-11-23 14:15" in UTC. */
export function formatUtc(t: Date): string {
  return `${title(DAYS[t.getUTCDay()]!)} ${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

/** A plain-words reading of one field. */
export function describeField(f: CronField): string {
  const full = f.name === 'day of week' ? 7 : f.max - f.min + 1;
  if (f.values.length === full) return `every ${f.name}`;
  const label = (v: number) => (f.name === 'month' ? title(MONTHS[v - 1]!) : f.name === 'day of week' ? title(DAYS[v]!) : String(v));
  const shown = f.values.slice(0, 8).map(label).join(', ');
  return `${f.name} ${shown}${f.values.length > 8 ? `, … (${f.values.length} values)` : ''}`;
}
