import type { Exercise, QuizQuestion } from '../types';

type Choice = Extract<QuizQuestion, { type: 'choice' }>;
type Numeric = Extract<QuizQuestion, { type: 'numeric' }>;
type Order = Extract<QuizQuestion, { type: 'order' }>;

export function gradeChoice(q: Choice, selected: number): { correct: boolean; explain: string } {
  const option = q.options[selected];
  if (!option) throw new RangeError(`Question "${q.id}" has no option ${selected}`);
  return { correct: option.correct, explain: option.explain };
}

/** Parses what the learner typed. Accepts a decimal comma. Returns NaN for anything that isn't a number. */
export function parseAnswer(input: string): number {
  const trimmed = input.trim().replace(',', '.');
  return trimmed === '' ? NaN : Number(trimmed);
}

export function gradeNumeric(q: Numeric, value: number): { correct: boolean; valid: boolean } {
  if (!Number.isFinite(value)) return { correct: false, valid: false };
  return { correct: Math.abs(value - q.answer) <= q.tolerance, valid: true };
}

/** `order` holds the item texts in the learner's order. `positions[i]` says whether slot i is right. */
export function gradeOrder(q: Order, order: string[]): { correct: boolean; positions: boolean[] } {
  const positions = q.items.map((item, i) => order[i] === item);
  return { correct: positions.every(Boolean) && order.length === q.items.length, positions };
}

/** Small seeded PRNG (mulberry32) so a question is always shuffled the same way. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ (ch.codePointAt(0) ?? 0), 16777619);
  return h >>> 0;
}

/** Shuffles deterministically from the seed, and never returns the correct order for 2+ items. */
export function shuffleItems(items: string[], seed: string): string[] {
  const out = [...items];
  const rand = rng(hashString(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

/** Moves the item at `from` to `to`, returning a new array. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item!);
  return out;
}

/** Content checks for quiz questions and exercises (SC-003). */
export function validateAssessment(questions: QuizQuestion[], exercises: Exercise[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const unique = (id: string) => {
    if (ids.has(id)) errors.push(`duplicate question or exercise id "${id}"`);
    ids.add(id);
  };
  for (const q of questions) {
    unique(q.id);
    if (!q.prompt.trim()) errors.push(`${q.id}: empty prompt`);
    if (q.type === 'choice') {
      if (q.options.length < 2) errors.push(`${q.id}: a choice question needs at least 2 options`);
      if (!q.options.some((o) => o.correct)) errors.push(`${q.id}: no option is marked correct`);
      if (q.options.some((o) => !o.explain.trim()))
        errors.push(`${q.id}: every option needs an explanation (FR-012)`);
    } else if (q.type === 'numeric') {
      if (!Number.isFinite(q.answer)) errors.push(`${q.id}: answer must be a finite number`);
      if (!(q.tolerance >= 0)) errors.push(`${q.id}: tolerance must be 0 or more`);
      if (!q.hint.trim() || !q.explain.trim()) errors.push(`${q.id}: needs a hint and an explanation`);
    } else {
      if (q.items.length < 2) errors.push(`${q.id}: an order question needs at least 2 items`);
      if (new Set(q.items).size !== q.items.length) errors.push(`${q.id}: order items must be distinct`);
    }
  }
  for (const ex of exercises) {
    unique(ex.id);
    if (!ex.prompt.trim() || !ex.solution.trim() || !ex.explanation.trim())
      errors.push(`${ex.id}: needs a prompt, a solution and an explanation`);
    if (ex.hints.length === 0) errors.push(`${ex.id}: needs at least one hint`);
  }
  return errors;
}
