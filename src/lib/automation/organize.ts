// A file organizer's plan: which files move where under a set of rules, computed without touching anything
// (a dry run). Running the plan's result through planMoves again must produce no moves: that is idempotency.

export interface FileEntry {
  /** Path relative to the folder being organized, with / separators, for example "IMG_0042.jpg" or "pdf/a.pdf". */
  path: string;
}

export interface Rule {
  /** Extensions without the dot, lower case. */
  extensions: string[];
  /** Destination folder. */
  folder: string;
}

export type Action =
  | { kind: 'move'; from: string; to: string; replaces: boolean }
  | { kind: 'skip'; path: string; reason: 'already in place' | 'no rule' }
  | { kind: 'conflict'; from: string; to: string };

export interface Plan {
  actions: Action[];
  /** The folder's contents after applying the plan. */
  after: string[];
  moves: number;
  conflicts: number;
  /** Files destroyed because a move replaced them (only with overwrite). */
  lost: number;
}

export function extensionOf(path: string): string {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Plans moves for files at the top level of the folder. Files already inside a rule's folder are left alone.
 * A move whose destination already exists (or is claimed by an earlier move) is a conflict and is not made,
 * so nothing is ever overwritten. With `overwrite`, the later file replaces the earlier one (data loss).
 */
export function planMoves(files: string[], rules: Rule[], overwrite = false): Plan {
  const present = new Set(files);
  const actions: Action[] = [];
  for (const path of [...files].sort()) {
    const ext = extensionOf(path);
    const rule = rules.find((r) => r.extensions.includes(ext));
    if (!rule) {
      actions.push({ kind: 'skip', path, reason: 'no rule' });
      continue;
    }
    if (path.includes('/')) {
      actions.push({ kind: 'skip', path, reason: 'already in place' });
      continue;
    }
    const to = `${rule.folder}/${path}`;
    if (present.has(to) && !overwrite) {
      actions.push({ kind: 'conflict', from: path, to });
      continue;
    }
    const replaces = present.has(to);
    present.delete(path);
    present.add(to);
    actions.push({ kind: 'move', from: path, to, replaces });
  }
  return {
    actions,
    after: [...present].sort(),
    moves: actions.filter((a) => a.kind === 'move').length,
    conflicts: actions.filter((a) => a.kind === 'conflict').length,
    lost: actions.filter((a) => a.kind === 'move' && a.replaces).length,
  };
}
