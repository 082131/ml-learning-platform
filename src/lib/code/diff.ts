import { splitLines } from './segments';

export type DiffOp =
  | { type: 'same'; text: string; oldLine: number; newLine: number }
  | { type: 'add'; text: string; newLine: number }
  | { type: 'del'; text: string; oldLine: number };

/** Line diff by longest common subsequence. Removed lines come before the lines that replace them. */
export function diffLines(before: string, after: string): DiffOp[] {
  const a = splitLines(before);
  const b = splitLines(after);
  // lcs[i][j] = length of the LCS of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i]!, oldLine: i + 1, newLine: j + 1 });
      i++;
      j++;
    } else if (i < a.length && (j >= b.length || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      ops.push({ type: 'del', text: a[i]!, oldLine: i + 1 });
      i++;
    } else {
      ops.push({ type: 'add', text: b[j]!, newLine: j + 1 });
      j++;
    }
  }
  return ops;
}
