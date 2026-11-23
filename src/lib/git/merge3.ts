/**
 * Line-based three-way merge, following the rules of Git's xdiff merge for small files:
 * - each side is diffed against the base (longest common subsequence of lines);
 * - changes from the two sides that overlap or touch in the base (no unchanged line between them) conflict;
 * - inside a conflict, lines that both sides share at its start or end are moved out of the markers.
 * Git's diff uses Myers' algorithm with heuristics, so on files with many repeated lines the hunks it picks can
 * differ. merge3.test.ts checks the lesson examples against `git merge-file`.
 */

export interface Hunk {
  /** Base lines [bStart, bEnd) are replaced by side lines [sStart, sEnd). */
  bStart: number;
  bEnd: number;
  sStart: number;
  sEnd: number;
}

export function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

const joinLines = (lines: string[]): string => lines.map((l) => `${l}\n`).join('');

/** The changed regions between `a` (base) and `b`, from a longest-common-subsequence alignment. */
export function diffLines(a: string[], b: string[]): Hunk[] {
  const n = a.length;
  const m = b.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i]![j] = a[i] === b[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  let open: Hunk | null = null;
  const close = () => {
    if (open) {
      open.bEnd = i;
      open.sEnd = j;
      hunks.push(open);
      open = null;
    }
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      close();
      i++;
      j++;
    } else {
      if (!open) open = { bStart: i, bEnd: i, sStart: j, sEnd: j };
      if (j < m && (i >= n || L[i]![j + 1]! >= L[i + 1]![j]!)) j++;
      else i++;
    }
  }
  close();
  return hunks;
}

export interface MergeResult {
  text: string;
  conflicts: number;
}

/** Lines of `side` that stand for base lines [s, e), given that side's hunks. */
function sideRegion(base: string[], side: string[], hunks: Hunk[], s: number, e: number): string[] {
  const out: string[] = [];
  let pos = s;
  for (const h of hunks) {
    if (h.bEnd < s || h.bStart > e) continue;
    if (h.bStart < s || h.bEnd > e) continue; // callers pass regions that contain whole hunks
    out.push(...base.slice(pos, h.bStart), ...side.slice(h.sStart, h.sEnd));
    pos = h.bEnd;
  }
  out.push(...base.slice(pos, e));
  return out;
}

export function merge3(base: string, ours: string, theirs: string, oursLabel = 'HEAD', theirsLabel = 'theirs'): MergeResult {
  const B = splitLines(base);
  const O = splitLines(ours);
  const T = splitLines(theirs);
  const ho = diffLines(B, O);
  const ht = diffLines(B, T);
  const all = [...ho.map((h) => ({ ...h, side: 'o' as const })), ...ht.map((h) => ({ ...h, side: 't' as const }))].sort(
    (x, y) => x.bStart - y.bStart || x.bEnd - y.bEnd,
  );
  // Group hunks that overlap or touch: a later hunk is independent only if it starts after the group ends.
  const groups: { s: number; e: number; sides: Set<'o' | 't'> }[] = [];
  for (const h of all) {
    const g = groups[groups.length - 1];
    if (g && h.bStart <= g.e) {
      g.e = Math.max(g.e, h.bEnd);
      g.sides.add(h.side);
      continue;
    }
    groups.push({ s: h.bStart, e: h.bEnd, sides: new Set([h.side]) });
  }
  const out: string[] = [];
  let pos = 0;
  let conflicts = 0;
  for (const g of groups) {
    out.push(...B.slice(pos, g.s));
    const o = sideRegion(B, O, ho, g.s, g.e);
    const t = sideRegion(B, T, ht, g.s, g.e);
    if (g.sides.size === 1) {
      out.push(...(g.sides.has('o') ? o : t));
    } else {
      let pre = 0;
      while (pre < o.length && pre < t.length && o[pre] === t[pre]) pre++;
      let suf = 0;
      while (suf < o.length - pre && suf < t.length - pre && o[o.length - 1 - suf] === t[t.length - 1 - suf]) suf++;
      const om = o.slice(pre, o.length - suf);
      const tm = t.slice(pre, t.length - suf);
      out.push(...o.slice(0, pre));
      if (om.length || tm.length) {
        conflicts++;
        out.push(`<<<<<<< ${oursLabel}`, ...om, '=======', ...tm, `>>>>>>> ${theirsLabel}`);
      }
      out.push(...o.slice(o.length - suf));
    }
    pos = g.e;
  }
  out.push(...B.slice(pos));
  return { text: joinLines(out), conflicts };
}
