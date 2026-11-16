import { MAX_HISTORY, parseExamState, type ExamState, type SittingRecord } from '@/lib/exam/storage';
import type { Attempt } from '@/lib/exam/engine';
import { migrate } from '@/lib/progress/migrate';
import { emptyState, type ProgressState } from '@/lib/progress/schema';

// Three-way merge of saved state, so two devices that both changed something keep both changes.
// `base` is the last state this device saw in the cloud; null on the first sync.

type Obj = Record<string, unknown>;
type Path = readonly string[];

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** JSON with sorted keys, so equal states give equal strings on every device. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => canonical(x ?? null)).join(',')}]`;
  if (isObj(v)) {
    const parts: string[] = [];
    for (const k of Object.keys(v).sort()) {
      if (v[k] !== undefined) parts.push(`${JSON.stringify(k)}:${canonical(v[k])}`);
    }
    return `{${parts.join(',')}}`;
  }
  return v === undefined ? 'null' : JSON.stringify(v);
}

const same = (a: unknown, b: unknown) =>
  a === b || (a !== undefined && b !== undefined && canonical(a) === canonical(b));

interface Rules {
  /** Objects at these paths are merged as one value, not key by key. */
  atomic(path: Path): boolean;
  /** Both sides changed the value at `path` in different ways. */
  resolve(path: Path, local: unknown, remote: unknown): unknown;
}

export function merge3(
  base: unknown,
  local: unknown,
  remote: unknown,
  rules: Rules,
  path: Path = [],
): unknown {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  if (isObj(local) && isObj(remote) && !rules.atomic(path)) {
    const b = isObj(base) ? base : {};
    const out: Obj = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(b[k], local[k], remote[k], rules, [...path, k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  // A change beats a deletion: losing work is worse than keeping something that was cleared.
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  return rules.resolve(path, local, remote);
}

const progressRules: Rules = {
  atomic: () => false,
  resolve(path, local, remote) {
    const [section, , field] = path;
    switch (section) {
      case 'completed':
        // Keep the earlier completion date.
        return String(local) <= String(remote) ? local : remote;
      case 'quiz':
        if (field === 'attempts') return Math.max(Number(local), Number(remote));
        return local === true || remote === true;
      case 'exercises':
        return local === true || remote === true;
      case 'projects': {
        const a = local as boolean[];
        const b = remote as boolean[];
        return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => Boolean(a[i] || b[i]));
      }
      case 'bookmarks':
        return [...new Set([...(local as string[]), ...(remote as string[])])];
      default:
        // recent, theme: this device's value.
        return local;
    }
  },
};

export function mergeProgress(
  base: ProgressState | null,
  local: ProgressState,
  remote: ProgressState,
): ProgressState {
  return migrate(merge3(base ?? emptyState(), local, remote, progressRules)) ?? local;
}

const answered = (a: Attempt) => Object.keys(a.answers ?? {}).length;

const examRules: Rules = {
  atomic: (path) => path.length === 2 && (path[0] === 'attempts' || path[0] === 'tasks'),
  resolve(path, local, remote) {
    switch (path[0]) {
      case 'attempts': {
        const a = local as Attempt;
        const b = remote as Attempt;
        if (a.seed !== b.seed) return a.startedAt >= b.startedAt ? a : b;
        if (Boolean(a.submittedAt) !== Boolean(b.submittedAt)) return a.submittedAt ? a : b;
        return answered(a) >= answered(b) ? a : b;
      }
      case 'history': {
        const byTime = new Map<number, SittingRecord>();
        for (const r of [...(local as SittingRecord[]), ...(remote as SittingRecord[])]) byTime.set(r.at, r);
        return [...byTime.values()].sort((x, y) => y.at - x.at).slice(0, MAX_HISTORY);
      }
      case 'tasks': {
        const a = local as { best: number; revealed: boolean };
        const b = remote as { best: number; revealed: boolean };
        // A revealed solution pins the task at zero on every device.
        if (a.revealed !== b.revealed) return a.revealed ? a : b;
        return a.best >= b.best ? a : b;
      }
      default:
        return local;
    }
  },
};

const EMPTY_EXAMS: ExamState = { attempts: {}, history: {}, tasks: {} };

export function mergeExams(base: ExamState | null, local: ExamState, remote: ExamState): ExamState {
  return parseExamState(canonical(merge3(base ?? EMPTY_EXAMS, local, remote, examRules)));
}
