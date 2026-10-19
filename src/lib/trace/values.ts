import type { TraceStep, TraceValue } from '../types';

export const scalar = (value: number): TraceValue => ({ kind: 'scalar', value });
export const text = (value: string): TraceValue => ({ kind: 'text', value });

/** An array value with its shape inferred. Only 1-D and 2-D (rectangular) arrays are supported. */
export function array(data: number[] | number[][]): TraceValue {
  const rows = data as unknown[];
  if (rows.length > 0 && rows.every(Array.isArray)) {
    const grid = data as number[][];
    const cols = grid[0]?.length ?? 0;
    if (grid.some((r) => r.length !== cols)) throw new Error('2-D trace arrays must be rectangular');
    return { kind: 'array', shape: [grid.length, cols], data: grid.map((r) => [...r]) };
  }
  return { kind: 'array', shape: [data.length], data: [...(data as number[])] };
}

export type VarChange = 'new' | 'changed' | 'same';

function sameValue(a: TraceValue, b: TraceValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** How each variable in `step` differs from the previous step. The first step marks everything new. */
export function changesFrom(prev: TraceStep | undefined, step: TraceStep): Record<string, VarChange> {
  return Object.fromEntries(
    Object.entries(step.vars).map(([name, v]) => {
      const before = prev?.vars[name];
      return [name, before === undefined ? 'new' : sameValue(before, v) ? 'same' : 'changed'];
    }),
  );
}

/** Names that existed in the previous step but are gone now (for example a loop variable after the loop). */
export function removedFrom(prev: TraceStep | undefined, step: TraceStep): string[] {
  return prev ? Object.keys(prev.vars).filter((name) => !(name in step.vars)) : [];
}

const MAX_DECIMALS = 4;

/** Formats numbers for display: integers as is, others rounded to 4 decimals without trailing zeros. */
export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(MAX_DECIMALS)));
}

/** A one-line rendering of any trace value, as Python would print it. */
export function formatValue(v: TraceValue): string {
  if (v.kind === 'scalar') return formatNumber(v.value);
  if (v.kind === 'text') return v.value;
  const row = (r: number[]) => `[${r.map(formatNumber).join(', ')}]`;
  return v.shape.length === 2 ? `[${(v.data as number[][]).map(row).join(', ')}]` : row(v.data as number[]);
}
