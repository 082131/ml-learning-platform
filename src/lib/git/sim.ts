/**
 * A small Git, run in the browser for the Git track's sandbox. It keeps real objects: blobs, trees, commits and
 * annotated tags are hashed exactly as Git hashes them, with a fixed author and a clock that starts at T0 and
 * moves 60 seconds per command. With the same identity and dates, real Git prints the same commit ids
 * (sim.test.ts replays every lesson scenario in git and compares ids, file contents and refs).
 *
 * What it leaves out: the object database and packfiles, diffs and diffstats, most options, hooks, submodules and
 * line endings. Messages are shortened versions of Git's.
 */
import { cleanMessage, hashCommit, hashTag, hashTree, T0, tagText, treeEntries, type Files, type Person } from './objects';
import { hashBlob, utf8 } from './sha1';
import { merge3 } from './merge3';

export const ADA: Person = { name: 'Ada Lovelace', email: 'ada@example.com' };
export const GRACE: Person = { name: 'Grace Hopper', email: 'grace@example.com' };
export const REMOTE_URL = 'https://github.com/ada/ml-repo.git';

export interface Commit {
  id: string;
  tree: string;
  files: Files;
  parents: string[];
  message: string;
  author: Person;
  authorTime: number;
  committer: Person;
  commitTime: number;
}

export interface Tag {
  target: string;
  /** Set for annotated tags: the tag object's own id and message. */
  object?: string;
  message?: string;
  /** Tagger time of an annotated tag. */
  time?: number;
}

export type Head = { branch: string } | { detached: string };

interface PickOp {
  kind: 'rebase' | 'cherry-pick' | 'revert';
  /** The commit being applied when the sequence stopped. */
  current: string;
  /** Commits still to apply after it (rebase). */
  todo: string[];
  /** Rebase: the branch to move when done, and where it was. */
  branch?: string;
  orig: string;
}

interface MergeOp {
  kind: 'merge';
  theirs: string;
  message: string;
}

export interface Repo {
  commits: Record<string, Commit>;
  /** Creation order, oldest first. */
  order: string[];
  branches: Record<string, string>;
  tags: Record<string, Tag>;
  head: Head;
  index: Files;
  /** Paths with unresolved conflicts. */
  conflicts: string[];
  work: Files;
  op?: MergeOp | PickOp;
  stash: string[];
  remote?: { branches: Record<string, string>; tags: Record<string, string> };
  /** Remote-tracking branches: refs/remotes/origin/<name>. */
  tracking: Record<string, string>;
  upstream: Record<string, string>;
  reflog: { id: string; msg: string }[];
  clock: number;
  user: Person;
}

export interface CommandOutput {
  command: string;
  output: string;
  ok: boolean;
}

export function emptyRepo(): Repo {
  return {
    commits: {},
    order: [],
    branches: {},
    tags: {},
    head: { branch: 'main' },
    index: {},
    conflicts: [],
    work: {},
    stash: [],
    tracking: {},
    upstream: {},
    reflog: [],
    clock: T0,
    user: ADA,
  };
}

class GitError extends Error {}
/** Set by commands that change the repository but exit with an error status, like a merge that stops on a conflict. */
let softFail = false;
function fail(msg: string): never {
  throw new GitError(msg);
}

export const abbrev = (id: string) => id.slice(0, 7);
export const subject = (c: Commit) => c.message.split('\n')[0]!;
const same = (a: Files, b: Files) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => b[k] === a[k]);
};
const clone = (r: Repo): Repo => structuredClone(r);

export function headId(r: Repo): string | undefined {
  return 'detached' in r.head ? r.head.detached : r.branches[r.head.branch];
}
export const currentBranch = (r: Repo): string | undefined => ('branch' in r.head ? r.head.branch : undefined);
const headFiles = (r: Repo): Files => {
  const id = headId(r);
  return id ? r.commits[id]!.files : {};
};

// ---------- tokenizing and refs ----------

export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  let has = false;
  for (const ch of line.trim()) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (quote) fail('unterminated quote');
  if (cur || has) out.push(cur);
  return out;
}

function ancestors(r: Repo, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const x = stack.pop()!;
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...r.commits[x]!.parents);
  }
  return seen;
}
export const isAncestor = (r: Repo, a: string, b: string) => ancestors(r, b).has(a);

export function mergeBases(r: Repo, a: string, b: string): string[] {
  const A = ancestors(r, a);
  const common = [...ancestors(r, b)].filter((x) => A.has(x));
  return common.filter((x) => !common.some((y) => y !== x && isAncestor(r, x, y)));
}

type GitObject = { type: 'commit' | 'tree' | 'blob' | 'tag'; id: string; text: string; size: number };

/** Finds an object by name: a revision, rev^{tree}, rev:path, or a (short) id of a commit, tree, blob or tag. */
function findObject(r: Repo, spec: string): GitObject {
  const treeObj = (files: Files, dir: string, id: string): GitObject => {
    const entries = treeEntries(files, dir);
    // A tree's size is its binary form: "<mode> <name>\0" + 20 raw bytes per entry, with mode 40000 for trees.
    const size = entries.reduce((a, e) => a + utf8(`${e.mode.replace(/^0/, '')} ${e.name}`).length + 21, 0);
    return { type: 'tree', id, text: entries.map((e) => `${e.mode} ${e.type} ${e.id}\t${e.name}`).join('\n'), size };
  };
  const blobObj = (content: string): GitObject => ({ type: 'blob', id: hashBlob(content), text: content.replace(/\n$/, ''), size: utf8(content).length });
  const commitObj = (id: string): GitObject => {
    const c = r.commits[id]!;
    const text = [`tree ${c.tree}`, ...c.parents.map((p) => `parent ${p}`), `author ${c.author.name} <${c.author.email}> ${c.authorTime} +0000`, `committer ${c.committer.name} <${c.committer.email}> ${c.commitTime} +0000`, '', c.message].join('\n');
    return { type: 'commit', id, text: text.replace(/\n$/, ''), size: utf8(text).length };
  };
  const colon = spec.indexOf(':');
  if (colon > 0) {
    const files = r.commits[resolve(r, spec.slice(0, colon))]!.files;
    const path = spec.slice(colon + 1).replace(/\/$/, '');
    if (files[path] !== undefined) return blobObj(files[path]!);
    if (path === '' || Object.keys(files).some((f) => f.startsWith(path + '/'))) {
      const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const id = path === '' ? hashTree(files) : treeEntries(files, parent).find((e) => e.name === path.slice(parent ? parent.length + 1 : 0))!.id;
      return treeObj(files, path, id);
    }
    fail(`fatal: path '${path}' does not exist in '${spec.slice(0, colon)}'`);
  }
  const tm = /^(.*)\^\{tree\}$/.exec(spec);
  if (tm) {
    const c = r.commits[resolve(r, tm[1]!)]!;
    return treeObj(c.files, '', c.tree);
  }
  const tag = r.tags[spec];
  if (tag?.object) {
    const text = tagText(tag.target, spec, r.user, tag.time ?? r.clock, tag.message ?? '');
    return { type: 'tag', id: tag.object, text: text.replace(/\n$/, ''), size: utf8(text).length };
  }
  if (/^[0-9a-f]{4,40}$/.test(spec) && !r.order.some((c) => c.startsWith(spec))) {
    for (const c of r.order) {
      const files = r.commits[c]!.files;
      for (const content of Object.values(files)) if (hashBlob(content).startsWith(spec)) return blobObj(content);
      const dirs = new Set(['']);
      for (const f of Object.keys(files)) {
        const parts = f.split('/');
        for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
      }
      for (const d of dirs) {
        const id = d === '' ? hashTree(files) : findObject(r, `${c}:${d}`).id;
        if (id.startsWith(spec)) return treeObj(files, d, id);
      }
    }
    for (const [name, t] of Object.entries(r.tags)) if (t.object?.startsWith(spec)) return findObject(r, name);
  }
  return commitObj(resolve(r, spec));
}

function cmdCatFile(r: Repo, args: string[], out: string[]) {
  const flag = args.find((a) => a.startsWith('-')) ?? '-p';
  const spec = args.filter((a) => !a.startsWith('-'))[0];
  if (!spec || !['-p', '-t', '-s'].includes(flag)) fail('usage: git cat-file (-p | -t | -s) <object>');
  const o = findObject(r, spec);
  out.push(flag === '-t' ? o.type : flag === '-s' ? String(o.size) : o.text);
}

export function resolve(r: Repo, spec: string): string {
  const m = /^(.*?)((?:[~^]\d*)*)$/.exec(spec)!;
  const base = m[1]!;
  let id: string | undefined;
  if (base === 'HEAD' || base === '@') id = headId(r);
  else if (/^HEAD@\{\d+\}$/.test(base)) id = r.reflog[Number(/\d+/.exec(base)![0])]?.id;
  else if (r.branches[base]) id = r.branches[base];
  else if (r.tags[base]) id = r.tags[base]!.target;
  else if (base.startsWith('origin/') && r.tracking[base.slice(7)]) id = r.tracking[base.slice(7)];
  else if (/^stash(@\{\d+\})?$/.test(base)) {
    const n = Number(/\d+/.exec(base)?.[0] ?? 0);
    id = r.stash[n];
  } else if (/^[0-9a-f]{4,40}$/.test(base)) {
    const hits = r.order.filter((c) => c.startsWith(base));
    if (hits.length > 1) fail(`short object ID ${base} is ambiguous`);
    id = hits[0];
  }
  if (!id) fail(`ambiguous argument '${spec}': unknown revision or path not in the working tree.`);
  for (const op of m[2]!.match(/[~^]\d*/g) ?? []) {
    const n = op.length > 1 ? Number(op.slice(1)) : 1;
    if (op[0] === '~') {
      for (let i = 0; i < n; i++) {
        id = r.commits[id!]!.parents[0];
        if (!id) fail(`ambiguous argument '${spec}': unknown revision or path not in the working tree.`);
      }
    } else {
      id = n === 0 ? id : r.commits[id!]!.parents[n - 1];
      if (!id) fail(`ambiguous argument '${spec}': unknown revision or path not in the working tree.`);
    }
  }
  return id!;
}

// ---------- making objects ----------

function makeCommit(
  r: Repo,
  files: Files,
  parents: string[],
  message: string,
  author: Person = r.user,
  authorTime: number = r.clock,
): Commit {
  const tree = hashTree(files);
  const fields = { tree, parents, author, authorTime, committer: r.user, commitTime: r.clock, message };
  const id = hashCommit(fields);
  const c: Commit = { id, files: { ...files }, ...fields };
  if (!r.commits[id]) {
    r.commits[id] = c;
    r.order.push(id);
  }
  return r.commits[id]!;
}

function logRef(r: Repo, id: string, msg: string) {
  r.reflog.unshift({ id, msg });
}

/** Moves HEAD (the branch it names, or the detached id) to `id`. */
function moveHead(r: Repo, id: string, msg: string) {
  if ('branch' in r.head) r.branches[r.head.branch] = id;
  else r.head = { detached: id };
  logRef(r, id, msg);
}

// ---------- status ----------

export interface StatusEntry {
  path: string;
  code: string;
}

export function statusEntries(r: Repo): StatusEntry[] {
  const H = headFiles(r);
  const I = r.index;
  const W = r.work;
  const tracked: StatusEntry[] = [];
  const untracked: StatusEntry[] = [];
  const paths = [...new Set([...Object.keys(H), ...Object.keys(I), ...Object.keys(W)])].sort();
  for (const p of paths) {
    if (r.conflicts.includes(p)) {
      const code = !(p in I) && p in W ? (p in H ? 'UD' : 'DU') : 'UU';
      tracked.push({ path: p, code });
      continue;
    }
    if (!(p in I) && !(p in H)) {
      untracked.push({ path: p, code: '??' });
      continue;
    }
    const x = !(p in H) ? 'A' : !(p in I) ? 'D' : H[p] !== I[p] ? 'M' : ' ';
    const y = !(p in I) ? ' ' : !(p in W) ? 'D' : W[p] !== I[p] ? 'M' : ' ';
    if (x !== ' ' || y !== ' ') tracked.push({ path: p, code: x + y });
  }
  return [...tracked, ...untracked];
}

function aheadBehind(r: Repo, a: string, b: string): [number, number] {
  const A = ancestors(r, a);
  const B = ancestors(r, b);
  return [[...A].filter((x) => !B.has(x)).length, [...B].filter((x) => !A.has(x)).length];
}

function statusHeader(r: Repo): string {
  const b = currentBranch(r);
  if (!b) return '## HEAD (no branch)';
  if (!r.branches[b]) return `## No commits yet on ${b}`;
  const up = r.upstream[b];
  if (!up || !r.tracking[up]) return `## ${b}`;
  const [ahead, behind] = aheadBehind(r, r.branches[b]!, r.tracking[up]!);
  const parts = [ahead && `ahead ${ahead}`, behind && `behind ${behind}`].filter(Boolean);
  return `## ${b}...origin/${up}${parts.length ? ` [${parts.join(', ')}]` : ''}`;
}

const isDirty = (r: Repo) => statusEntries(r).some((e) => e.code !== '??');

// ---------- log ----------

/** Decorations as `git log --oneline --decorate` prints them. */
export function decorations(r: Repo, id: string): string[] {
  const refs: { full: string; label: string }[] = [];
  for (const [b, c] of Object.entries(r.branches)) if (c === id) refs.push({ full: `refs/heads/${b}`, label: b });
  for (const [b, c] of Object.entries(r.tracking))
    if (c === id) refs.push({ full: `refs/remotes/origin/${b}`, label: `origin/${b}` });
  for (const [t, tag] of Object.entries(r.tags)) if (tag.target === id) refs.push({ full: `refs/tags/${t}`, label: `tag: ${t}` });
  if (r.stash[0] === id) refs.push({ full: 'refs/stash', label: 'refs/stash' });
  // Git loads refs in name order and prepends each decoration, so they print in reverse name order.
  refs.sort((a, b) => (a.full < b.full ? 1 : a.full > b.full ? -1 : 0));
  const out = refs.map((x) => x.label);
  if (headId(r) === id) {
    const b = currentBranch(r);
    if (b) {
      out.splice(out.indexOf(b), 1);
      out.unshift(`HEAD -> ${b}`);
    } else out.unshift('HEAD');
  }
  return out;
}

/** Commits reachable from `starts`, newest commit date first (ties: later-created first). */
export function logOrder(r: Repo, starts: string[]): string[] {
  const seen = new Set<string>();
  for (const s of starts) for (const a of ancestors(r, s)) seen.add(a);
  const pos = new Map(r.order.map((id, i) => [id, i]));
  return [...seen].sort((a, b) => r.commits[b]!.commitTime - r.commits[a]!.commitTime || pos.get(b)! - pos.get(a)!);
}

function logLine(r: Repo, id: string): string {
  const d = decorations(r, id);
  return `${abbrev(id)}${d.length ? ` (${d.join(', ')})` : ''} ${subject(r.commits[id]!)}`;
}

// ---------- merging trees ----------

interface TreeMerge {
  files: Files;
  conflicts: string[];
  /** For modify/delete conflicts the surviving side's version is left in the working tree. */
}

function mergeTrees(base: Files, ours: Files, theirs: Files, oursLabel: string, theirsLabel: string): TreeMerge {
  const files: Files = {};
  const conflicts: string[] = [];
  const paths = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
  for (const p of paths) {
    const b = base[p];
    const o = ours[p];
    const t = theirs[p];
    if (o === t) {
      if (o !== undefined) files[p] = o;
    } else if (o === b) {
      if (t !== undefined) files[p] = t;
    } else if (t === b) {
      if (o !== undefined) files[p] = o;
    } else if (o === undefined || t === undefined) {
      files[p] = (o ?? t)!;
      conflicts.push(p);
    } else {
      const m = merge3(b ?? '', o, t, oursLabel, theirsLabel);
      files[p] = m.text;
      if (m.conflicts) conflicts.push(p);
    }
  }
  return { files, conflicts };
}

function conflictMessage(conflicts: string[], base: Files, ours: Files, theirs: Files): string[] {
  return conflicts.map((p) =>
    ours[p] === undefined || theirs[p] === undefined
      ? `CONFLICT (modify/delete): ${p} deleted in ${ours[p] === undefined ? 'HEAD' : 'the other side'} and modified in ${
          ours[p] === undefined ? 'the other side' : 'HEAD'
        }.`
      : `CONFLICT (${base[p] === undefined ? 'add/add' : 'content'}): Merge conflict in ${p}`,
  );
}

/**
 * Writes a merge result into the index and working tree, as Git does: paths whose result equals HEAD keep any
 * local changes; changed paths take the result; conflicted paths leave the clean index (unmerged) and get the
 * file with markers in the working tree.
 */
function applyResult(r: Repo, m: TreeMerge) {
  const H = headFiles(r);
  const paths = new Set([...Object.keys(H), ...Object.keys(m.files)]);
  for (const p of paths) {
    const conflicted = m.conflicts.includes(p);
    if (!conflicted && m.files[p] === H[p]) continue;
    if (p in m.files) r.work[p] = m.files[p]!;
    else delete r.work[p];
    if (!conflicted && p in m.files) r.index[p] = m.files[p]!;
    else delete r.index[p];
  }
  r.conflicts = [...m.conflicts];
}

function applyConflicted(r: Repo, m: TreeMerge, _theirs: Files) {
  applyResult(r, m);
}

/** Local changes that a merge result would overwrite: dirty paths whose result differs from HEAD. */
function checkDirty(r: Repo, files: Files, what: string) {
  const H = headFiles(r);
  const hit = statusEntries(r)
    .filter((e) => e.code !== '??' && files[e.path] !== H[e.path])
    .map((e) => e.path);
  if (hit.length)
    fail(`error: Your local changes to the following files would be overwritten by ${what}:\n${hit.map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you ${what}.\nAborting`);
}

/** Git refuses to overwrite an untracked file with a different version from a commit. */
function checkUntracked(r: Repo, files: Files, what: string) {
  const H = headFiles(r);
  const hit = Object.keys(files).filter((p) => p in r.work && !(p in r.index) && !(p in H) && r.work[p] !== files[p]);
  if (hit.length)
    fail(`error: The following untracked working tree files would be overwritten by ${what === 'merge' ? 'merge' : 'merge'}:\n${hit.map((p) => `\t${p}`).join('\n')}\nPlease move or remove them before you ${what}.\nAborting`);
}

function untrackedFiles(r: Repo): Files {
  const out: Files = {};
  const H = headFiles(r);
  for (const [p, c] of Object.entries(r.work)) if (!(p in r.index) && !(p in H)) out[p] = c;
  return out;
}

function checkoutFiles(r: Repo, files: Files) {
  r.work = { ...untrackedFiles(r), ...files };
  r.index = { ...files };
  r.conflicts = [];
}

// ---------- commands ----------

type Out = string[];

function needRepoClean(r: Repo, what: string, strict = false) {
  // A cherry-pick or revert that stopped only because it became empty blocks switch and merge, not the rest.
  const blocking = r.op && (strict || r.op.kind === 'merge' || r.op.kind === 'rebase' || r.conflicts.length > 0);
  if (blocking && r.op) fail(`You have not concluded your ${r.op.kind}. Finish it (or --abort) before you ${what}.`);
}

function cmdCommit(r: Repo, args: string[], out: Out) {
  const msgs: string[] = [];
  let all = false;
  let amend = false;
  let noEdit = false;
  let allowEmpty = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-m' || a === '--message') msgs.push(args[++i] ?? fail('switch `m\' requires a value'));
    else if (a === '-am') {
      all = true;
      msgs.push(args[++i] ?? fail('switch `m\' requires a value'));
    } else if (a === '-a' || a === '--all') all = true;
    else if (a === '--amend') amend = true;
    else if (a === '--no-edit') noEdit = true;
    else if (a === '--allow-empty') allowEmpty = true;
    else fail(`the sandbox does not support '${a}' for git commit`);
  }
  if (all) {
    // -a stages every tracked file, including conflicted ones (markers and all).
    for (const p of [...Object.keys(r.index), ...r.conflicts]) {
      if (p in r.work) r.index[p] = r.work[p]!;
      else delete r.index[p];
    }
    r.conflicts = [];
  }
  if (r.conflicts.length)
    fail('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add <file>\'');
  const head = headId(r);
  const op = r.op;
  if (amend) {
    if (!head) fail('fatal: You have nothing to amend.');
    const old = r.commits[head]!;
    const message = msgs.length ? cleanMessage(msgs) : old.message;
    const c = makeCommit(r, r.index, old.parents, message, old.author, old.authorTime);
    moveHead(r, c.id, `commit (amend): ${subject(c)}`);
    out.push(`[${currentBranch(r) ?? 'detached HEAD'} ${abbrev(c.id)}] ${subject(c)}`);
    return;
  }
  let message: string;
  const parents = head ? [head] : [];
  if (op?.kind === 'merge') {
    parents.push(op.theirs);
    message = msgs.length ? cleanMessage(msgs) : op.message;
  } else if (op) {
    // A commit during a stopped cherry-pick, revert or rebase concludes that step.
    return continuePick(r, out, msgs.length ? cleanMessage(msgs) : undefined, allowEmpty);
  } else {
    if (!msgs.length) fail(noEdit ? 'fatal: --no-edit needs an existing message (use -m "message")' : 'the sandbox has no editor: use git commit -m "message"');
    message = cleanMessage(msgs);
    if (!message) fail('Aborting commit due to empty commit message.');
  }
  if (!op && head && same(r.index, r.commits[head]!.files) && !allowEmpty) {
    const st = statusEntries(r);
    fail(
      st.length
        ? `On branch ${currentBranch(r) ?? 'HEAD'}\nno changes added to commit (use "git add" and/or "git commit -a")`
        : `On branch ${currentBranch(r) ?? 'HEAD'}\nnothing to commit, working tree clean`,
    );
  }
  if (!head && !Object.keys(r.index).length) fail('nothing to commit (create/copy files and use "git add" to track)');
  const c = makeCommit(r, r.index, parents, message);
  const kind = op?.kind === 'merge' ? 'commit (merge)' : head ? 'commit' : 'commit (initial)';
  moveHead(r, c.id, `${kind}: ${subject(c)}`);
  r.op = undefined;
  const root = head ? '' : ' (root-commit)';
  out.push(`[${currentBranch(r) ?? 'detached HEAD'}${root} ${abbrev(c.id)}] ${subject(c)}`);
}

function cmdAdd(r: Repo, args: string[]) {
  if (!args.length) fail('Nothing specified, nothing added.');
  const all = args.includes('.') || args.includes('-A') || args.includes('--all');
  const targets = all ? [...new Set([...Object.keys(r.work), ...Object.keys(r.index), ...r.conflicts])] : args;
  for (const p of targets) {
    const inWork = p in r.work;
    const known = p in r.index || r.conflicts.includes(p);
    const dir = Object.keys(r.work).filter((f) => f.startsWith(`${p.replace(/\/$/, '')}/`));
    if (!inWork && !known && !all) {
      if (dir.length) {
        for (const f of dir) r.index[f] = r.work[f]!;
        continue;
      }
      fail(`fatal: pathspec '${p}' did not match any files`);
    }
    if (inWork) r.index[p] = r.work[p]!;
    else delete r.index[p];
    r.conflicts = r.conflicts.filter((c) => c !== p);
  }
}

function cmdRm(r: Repo, args: string[]) {
  const cached = args.includes('--cached');
  for (const p of args.filter((a) => !a.startsWith('-'))) {
    if (!(p in r.index)) fail(`fatal: pathspec '${p}' did not match any files`);
    delete r.index[p];
    if (!cached) delete r.work[p];
  }
}

function cmdRestore(r: Repo, args: string[]) {
  const staged = args.includes('--staged') || args.includes('-S');
  const paths = args.filter((a) => !a.startsWith('-'));
  if (!paths.length) fail('fatal: you must specify path(s) to restore');
  const H = headFiles(r);
  for (const p of paths) {
    if (staged) {
      if (!(p in H) && !(p in r.index)) fail(`error: pathspec '${p}' did not match any file(s) known to git`);
      if (p in H) r.index[p] = H[p]!;
      else delete r.index[p];
    } else {
      if (!(p in r.index)) fail(`error: pathspec '${p}' did not match any file(s) known to git`);
      r.work[p] = r.index[p]!;
    }
  }
}

function cmdBranch(r: Repo, args: string[], out: Out) {
  if (!args.length || args[0] === '--list' || args[0] === '-a' || args[0] === '-vv') {
    const cur = currentBranch(r);
    if (!cur) out.push(`* (HEAD detached at ${abbrev(headId(r)!)})`);
    for (const b of Object.keys(r.branches).sort()) out.push(`${b === cur ? '*' : ' '} ${b}`);
    if (args[0] === '-a') for (const b of Object.keys(r.tracking).sort()) out.push(`  remotes/origin/${b}`);
    return;
  }
  if (args[0] === '-d' || args[0] === '-D') {
    const name = args[1] ?? fail('fatal: branch name required');
    if (!r.branches[name]) fail(`error: branch '${name}' not found`);
    if (name === currentBranch(r)) fail(`error: cannot delete branch '${name}' used by worktree`);
    const head = headId(r)!;
    if (args[0] === '-d' && !isAncestor(r, r.branches[name]!, head))
      fail(`error: the branch '${name}' is not fully merged.\nhint: If you are sure you want to delete it, run 'git branch -D ${name}'.`);
    out.push(`Deleted branch ${name} (was ${abbrev(r.branches[name]!)}).`);
    delete r.branches[name];
    delete r.upstream[name];
    return;
  }
  if (args[0] === '-m') {
    const [from, to] = args.length === 3 ? [args[1]!, args[2]!] : [currentBranch(r)!, args[1]!];
    if (!r.branches[from]) fail(`error: refname refs/heads/${from} not found`);
    r.branches[to] = r.branches[from]!;
    delete r.branches[from];
    if (currentBranch(r) === from) r.head = { branch: to };
    return;
  }
  const name = args[0]!;
  if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.startsWith('-') || name.includes('..'))
    fail(`fatal: '${name}' is not a valid branch name`);
  if (r.branches[name]) fail(`fatal: a branch named '${name}' already exists`);
  const start = args[1] ? resolve(r, args[1]) : headId(r);
  if (!start) fail(`fatal: not a valid object name: '${currentBranch(r)}'`);
  r.branches[name] = start!;
}

function switchTo(r: Repo, target: string, newHead: Head, msg: string) {
  const H = headFiles(r);
  const T = r.commits[target]!.files;
  const overwritten: string[] = [];
  const index: Files = {};
  const work: Files = {};
  const paths = new Set([...Object.keys(H), ...Object.keys(T), ...Object.keys(r.index), ...Object.keys(r.work)]);
  for (const p of paths) {
    const tracked = p in r.index || p in H;
    if (!tracked) {
      if (p in r.work) {
        if (p in T && T[p] !== r.work[p]) overwritten.push(p);
        work[p] = r.work[p]!;
        if (p in T) index[p] = T[p]!;
      } else if (p in T) {
        index[p] = T[p]!;
        work[p] = T[p]!;
      }
      continue;
    }
    const clean = r.index[p] === H[p] && r.work[p] === H[p];
    if (clean || T[p] === H[p]) {
      const src = clean ? T : null;
      if (src) {
        if (p in T) {
          index[p] = T[p]!;
          work[p] = T[p]!;
        }
      } else {
        if (p in r.index) index[p] = r.index[p]!;
        if (p in r.work) work[p] = r.work[p]!;
      }
    } else if (r.index[p] === T[p] && r.work[p] === T[p]) {
      index[p] = T[p]!;
      work[p] = T[p]!;
    } else overwritten.push(p);
  }
  if (overwritten.length)
    fail(
      `error: Your local changes to the following files would be overwritten by checkout:\n${overwritten
        .sort()
        .map((p) => `\t${p}`)
        .join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`,
    );
  const from = currentBranch(r) ?? abbrev(headId(r) ?? '');
  r.index = index;
  r.work = work;
  r.head = newHead;
  logRef(r, target, `checkout: moving from ${from} to ${msg}`);
}

function cmdSwitch(r: Repo, args: string[], out: Out, checkout: boolean) {
  needRepoClean(r, 'switch branches', true);
  const create = args[0] === '-c' || args[0] === '-b' || args[0] === '-C';
  if (create) {
    const name = args[1] ?? fail('fatal: missing branch name');
    cmdBranch(r, [name, ...(args[2] ? [args[2]] : [])], out);
    const target = r.branches[name];
    if (!target) {
      r.head = { branch: name };
      return;
    }
    switchTo(r, target, { branch: name }, name);
    out.push(`Switched to a new branch '${name}'`);
    return;
  }
  const detach = args[0] === '--detach';
  const name = (detach ? args[1] : args[0]) ?? fail('fatal: missing branch or commit argument');
  if (args.includes('--') || (checkout && args.length >= 2 && !detach)) {
    // git checkout -- file / git checkout <ref> -- file
    const paths = args.slice(args.indexOf('--') + 1);
    const src = args[0] === '--' ? null : resolve(r, args[0]!);
    for (const p of paths) {
      const content = src ? r.commits[src]!.files[p] : r.index[p];
      if (content === undefined) fail(`error: pathspec '${p}' did not match any file(s) known to git`);
      r.work[p] = content!;
      if (src) r.index[p] = content!;
    }
    return;
  }
  if (r.branches[name] && !detach) {
    if (currentBranch(r) === name) {
      out.push(`Already on '${name}'`);
      return;
    }
    switchTo(r, r.branches[name]!, { branch: name }, name);
    out.push(`Switched to branch '${name}'`);
    return;
  }
  if (!r.branches[name] && r.tracking[name] && !detach) {
    // DWIM: create a local branch that tracks origin/<name>.
    r.branches[name] = r.tracking[name]!;
    r.upstream[name] = name;
    switchTo(r, r.branches[name]!, { branch: name }, name);
    out.push(`branch '${name}' set up to track 'origin/${name}'.\nSwitched to a new branch '${name}'`);
    return;
  }
  if (!checkout && !detach) fail(`fatal: invalid reference: ${name}\nhint: use --detach to look at a commit without a branch`);
  const id = resolve(r, name);
  switchTo(r, id, { detached: id }, name);
  out.push(
    `Note: switching to '${name}'.\nYou are in 'detached HEAD' state. Commits you make here belong to no branch;\ncreate one with git switch -c <name> to keep them.\nHEAD is now at ${abbrev(id)} ${subject(r.commits[id]!)}`,
  );
}

function mergeName(r: Repo, arg: string): string {
  if (r.branches[arg]) return `branch '${arg}'`;
  if (arg.startsWith('origin/')) return `remote-tracking branch '${arg}'`;
  if (r.tags[arg]) return `tag '${arg}'`;
  return `commit '${arg}'`;
}

function mergeCommitMessage(r: Repo, what: string): string {
  const b = currentBranch(r);
  const into = b && b !== 'main' && b !== 'master' ? ` into ${b}` : '';
  return `Merge ${what}${into}\n`;
}

function doMerge(r: Repo, theirs: string, label: string, message: string, opts: { ff: 'auto' | 'no' | 'only'; squash: boolean }, out: Out) {
  const head = headId(r);
  if (!head) {
    moveHead(r, theirs, `merge ${label}: Fast-forward`);
    checkoutFiles(r, r.commits[theirs]!.files);
    return;
  }
  if (isAncestor(r, theirs, head)) {
    out.push('Already up to date.');
    return;
  }
  checkUntracked(r, r.commits[theirs]!.files, 'merge');
  if (isDirty(r)) {
    const T = r.commits[theirs]!.files;
    const H = headFiles(r);
    const touched = statusEntries(r)
      .filter((e) => e.code !== '??' && T[e.path] !== H[e.path])
      .map((e) => e.path);
    if (touched.length)
      fail(`error: Your local changes to the following files would be overwritten by merge:\n${touched.map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you merge.\nAborting`);
  }
  const canFF = isAncestor(r, head, theirs);
  if (opts.squash) {
    const bases = mergeBases(r, head, theirs);
    const m = mergeTrees(r.commits[bases[0]!]!.files, headFiles(r), r.commits[theirs]!.files, 'HEAD', label);
    out.push('Squash commit -- not updating HEAD');
    if (m.conflicts.length) {
      applyConflicted(r, m, r.commits[theirs]!.files);
      out.push(...conflictMessage(m.conflicts, r.commits[bases[0]!]!.files, headFiles(r), r.commits[theirs]!.files));
      out.push('Automatic merge failed; fix conflicts and then commit the result.');
      softFail = true;
    } else {
      r.index = { ...m.files };
      r.work = { ...untrackedFiles(r), ...m.files };
    }
    return;
  }
  if (canFF && opts.ff !== 'no') {
    out.push(`Updating ${abbrev(head)}..${abbrev(theirs)}\nFast-forward`);
    applyResult(r, { files: r.commits[theirs]!.files, conflicts: [] });
    moveHead(r, theirs, `merge ${label}: Fast-forward`);
    return;
  }
  if (opts.ff === 'only') fail('hint: Diverging branches can\'t be fast-forwarded, you need to either merge or rebase.\nfatal: Not possible to fast-forward, aborting.');
  const bases = mergeBases(r, head, theirs);
  if (bases.length > 1) fail('the sandbox does not simulate merges with more than one merge base (criss-cross history)');
  const B = bases.length ? r.commits[bases[0]!]!.files : {};
  const H = headFiles(r);
  const T = r.commits[theirs]!.files;
  const m = mergeTrees(B, H, T, 'HEAD', label);
  if (m.conflicts.length) {
    for (const p of m.conflicts.filter((p) => H[p] !== undefined && T[p] !== undefined)) out.push(`Auto-merging ${p}`);
    out.push(...conflictMessage(m.conflicts, B, H, T));
    out.push('Automatic merge failed; fix conflicts and then commit the result.');
    applyConflicted(r, m, T);
    softFail = true;
    r.op = {
      kind: 'merge',
      theirs,
      message: `${message.replace(/\n$/, '')}\n\n# Conflicts:\n${m.conflicts.map((p) => `#\t${p}`).join('\n')}\n`,
    };
    return;
  }
  const c = makeCommit(r, m.files, [head, theirs], message);
  applyResult(r, m);
  moveHead(r, c.id, `merge ${label}: Merge made by the 'ort' strategy.`);
  out.push("Merge made by the 'ort' strategy.");
}

function cmdMerge(r: Repo, args: string[], out: Out) {
  if (args[0] === '--abort') {
    if (r.op?.kind !== 'merge') fail('fatal: There is no merge to abort (MERGE_HEAD missing).');
    r.op = undefined;
    checkoutFiles(r, headFiles(r));
    return;
  }
  if (args[0] === '--continue') return cmdCommit(r, ['--no-edit'], out);
  needRepoClean(r, 'merge', true);
  let ff: 'auto' | 'no' | 'only' = 'auto';
  let squash = false;
  const msgs: string[] = [];
  const refs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--no-ff') ff = 'no';
    else if (a === '--ff-only') ff = 'only';
    else if (a === '--squash') squash = true;
    else if (a === '-m') msgs.push(args[++i]!);
    else if (a === '--no-edit') continue;
    else refs.push(a);
  }
  if (refs.length !== 1) fail('the sandbox merges one branch at a time: git merge <branch>');
  const theirs = resolve(r, refs[0]!);
  const message = msgs.length ? cleanMessage(msgs) : mergeCommitMessage(r, mergeName(r, refs[0]!));
  doMerge(r, theirs, refs[0]!, message, { ff, squash }, out);
}

/** Applies one commit's change on top of HEAD (cherry-pick, rebase pick, or revert). Returns false on conflict. */
function applyPick(r: Repo, c: Commit, kind: PickOp['kind'], out: Out): boolean {
  if (c.parents.length > 1) fail(`error: commit ${c.id} is a merge but no -m option was given.`);
  const parent = c.parents[0] ? r.commits[c.parents[0]]!.files : {};
  const H = headFiles(r);
  const label = `${abbrev(c.id)} (${subject(c)})`;
  const m =
    kind === 'revert'
      ? mergeTrees(c.files, H, parent, 'HEAD', `parent of ${label}`)
      : mergeTrees(parent, H, c.files, 'HEAD', label);
  const dirty = statusEntries(r).filter((e) => e.code !== '??' && (m.files[e.path] !== H[e.path] || e.code[0] !== ' '));
  if (dirty.length) fail(`error: your local changes would be overwritten by ${kind}.\nhint: commit your changes or stash them to proceed.`);
  if (m.conflicts.length) {
    applyConflicted(r, m, c.files);
    out.push(...conflictMessage(m.conflicts, kind === 'revert' ? c.files : parent, H, kind === 'revert' ? parent : c.files));
    return false;
  }
  const id = headId(r);
  checkUntracked(r, m.files, kind);
  if (same(m.files, H) && id) {
    if (kind === 'rebase') {
      out.push(`dropping ${abbrev(c.id)} ${subject(c)} -- patch contents already upstream`);
      return true;
    }
    // Git stops: the commit would be empty. Skip it, commit with --allow-empty, or abort.
    out.push(`The previous ${kind} is now empty, possibly due to conflict resolution.\nUse 'git ${kind} --skip' to skip it, or 'git commit --allow-empty' to keep it.`);
    return false;
  }
  const msg = kind === 'revert' ? revertMessage(c) : c.message;
  const nc =
    kind === 'revert' ? makeCommit(r, m.files, id ? [id] : [], msg) : makeCommit(r, m.files, id ? [id] : [], msg, c.author, c.authorTime);
  applyResult(r, m);
  const verb = kind === 'rebase' ? 'rebase (pick)' : kind;
  moveHead(r, nc.id, `${verb}: ${subject(nc)}`);
  if (kind !== 'rebase') out.push(`[${currentBranch(r) ?? 'detached HEAD'} ${abbrev(nc.id)}] ${subject(nc)}`);
  return true;
}

/** Git 2.43+ titles the revert of a revert "Reapply". */
function revertMessage(c: Commit): string {
  const m = /^Revert "(.*)"$/.exec(subject(c));
  return `${m ? `Reapply "${m[1]}"` : `Revert "${subject(c)}"`}\n\nThis reverts commit ${c.id}.\n`;
}

function finishRebase(r: Repo, branch: string, out: Out) {
  const tip = headId(r)!;
  r.branches[branch] = tip;
  r.head = { branch };
  logRef(r, tip, `rebase (finish): returning to refs/heads/${branch}`);
  r.op = undefined;
  out.push(`Successfully rebased and updated refs/heads/${branch}.`);
}

function runPicks(r: Repo, op: PickOp, list: string[], out: Out) {
  for (let i = 0; i < list.length; i++) {
    const c = r.commits[list[i]!]!;
    if (!applyPick(r, c, op.kind, out)) {
      r.op = { ...op, current: c.id, todo: list.slice(i + 1) };
      softFail = true;
      const verb = op.kind === 'rebase' ? 'rebase' : op.kind;
      out.push(
        `error: could not apply ${abbrev(c.id)}... ${subject(c)}\nhint: Resolve all conflicts manually, mark them as resolved with\nhint: "git add <conflicted_files>", then run "git ${verb} --continue".\nhint: To abort and get back to the state before "git ${verb}", run "git ${verb} --abort".`,
      );
      return;
    }
  }
  r.op = undefined;
  if (op.kind === 'rebase') finishRebase(r, op.branch!, out);
}

function continuePick(r: Repo, out: Out, message?: string, allowEmpty = false) {
  const op = r.op as PickOp | undefined;
  if (!op || op.kind === 'merge' as string) return fail('error: no cherry-pick or revert in progress');
  if (r.conflicts.length) fail('error: Committing is not possible because you have unmerged files.');
  const c = r.commits[op.current]!;
  const id = headId(r)!;
  const msg =
    message ??
    (op.kind === 'revert' ? revertMessage(c) : c.message);
  if (same(r.index, headFiles(r)) && !allowEmpty) {
    if (op.kind !== 'rebase')
      fail(`The previous ${op.kind} is now empty, possibly due to conflict resolution.\nUse 'git ${op.kind} --skip' to skip it, or 'git commit --allow-empty' to keep it.`);
    out.push(`dropping ${abbrev(c.id)} ${subject(c)} -- no changes after resolving`);
  } else {
    const nc = op.kind === 'revert' ? makeCommit(r, r.index, [id], msg) : makeCommit(r, r.index, [id], msg, c.author, c.authorTime);
    moveHead(r, nc.id, `${op.kind === 'rebase' ? 'rebase (continue)' : op.kind}: ${subject(nc)}`);
    out.push(`[${currentBranch(r) ?? 'detached HEAD'} ${abbrev(nc.id)}] ${subject(nc)}`);
  }
  runPicks(r, op, op.todo, out);
}

function abortPick(r: Repo, kind: PickOp['kind']) {
  const op = r.op as PickOp | undefined;
  if (!op || op.kind !== kind) fail(`error: no ${kind} in progress`);
  r.op = undefined;
  if (op.branch) {
    r.branches[op.branch] = op.orig;
    r.head = { branch: op.branch };
    logRef(r, op.orig, `rebase (abort): returning to refs/heads/${op.branch}`);
  } else moveHead(r, op.orig, 'reset: moving to HEAD');
  checkoutFiles(r, r.commits[op.orig]!.files);
}

/** A rough patch identity: the files a commit changes and their contents before and after. */
function patchId(r: Repo, id: string): string {
  const c = r.commits[id]!;
  const p = c.parents[0] ? r.commits[c.parents[0]]!.files : {};
  const paths = [...new Set([...Object.keys(p), ...Object.keys(c.files)])].filter((x) => p[x] !== c.files[x]).sort();
  return JSON.stringify(paths.map((x) => [x, p[x] ?? null, c.files[x] ?? null]));
}

function cmdRebase(r: Repo, args: string[], out: Out) {
  if (args[0] === '--continue') {
    if (r.op?.kind !== 'rebase') fail('fatal: No rebase in progress?');
    return continuePick(r, out);
  }
  if (args[0] === '--abort') return abortPick(r, 'rebase');
  if (args[0] === '--skip') {
    const op = r.op as PickOp;
    if (op?.kind !== 'rebase') fail('error: no rebase in progress');
    checkoutFiles(r, headFiles(r));
    return runPicks(r, op, op.todo, out);
  }
  if (args[0] === '-i' || args[0] === '--interactive') fail('the sandbox has no editor, so interactive rebase is shown in the lesson text instead');
  needRepoClean(r, 'rebase');
  const branch = currentBranch(r) ?? fail('the sandbox rebases branches, not a detached HEAD');
  let upstream = '';
  try {
    upstream = resolve(r, args[0] ?? (r.upstream[branch] ? `origin/${r.upstream[branch]}` : fail('fatal: no upstream configured; use git rebase <branch>')));
  } catch {
    fail(`fatal: invalid upstream '${args[0]}'`);
  }
  if (isDirty(r)) fail('error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.');
  const head = headId(r)!;
  if (isAncestor(r, upstream, head)) {
    out.push(`Current branch ${branch} is up to date.`);
    return;
  }
  if (isAncestor(r, head, upstream)) {
    moveHead(r, upstream, `rebase (finish): refs/heads/${branch} onto ${upstream}`);
    checkoutFiles(r, r.commits[upstream]!.files);
    out.push(`Successfully rebased and updated refs/heads/${branch}.`);
    return;
  }
  const up = ancestors(r, upstream);
  const upPatches = new Set([...up].filter((x) => !ancestors(r, head).has(x)).map((x) => patchId(r, x)));
  const mine = logOrder(r, [head])
    .filter((x) => !up.has(x) && r.commits[x]!.parents.length < 2)
    .reverse();
  const list = mine.filter((x) => !upPatches.has(patchId(r, x)));
  r.head = { detached: upstream };
  checkoutFiles(r, r.commits[upstream]!.files);
  logRef(r, upstream, `rebase (start): checkout ${args[0] ?? 'upstream'}`);
  runPicks(r, { kind: 'rebase', current: '', todo: [], branch, orig: head }, list, out);
}

function cmdPick(r: Repo, args: string[], out: Out, kind: 'cherry-pick' | 'revert') {
  if (args[0] === '--continue') {
    if (r.op?.kind !== kind) fail(`error: no ${kind} in progress`);
    return continuePick(r, out);
  }
  if (args[0] === '--abort') return abortPick(r, kind);
  if (args[0] === '--skip') {
    const op = r.op as PickOp | undefined;
    if (op?.kind !== kind) fail(`error: no ${kind} in progress`);
    checkoutFiles(r, headFiles(r));
    return runPicks(r, op!, op!.todo, out);
  }
  needRepoClean(r, kind);
  const refs = args.filter((a) => !a.startsWith('-'));
  if (!refs.length) fail(`usage: git ${kind} <commit>`);
  const head = headId(r)!;
  runPicks(r, { kind, current: '', todo: [], orig: head }, refs.map((x) => resolve(r, x)), out);
}

function cmdReset(r: Repo, args: string[], out: Out) {
  type Mode = 'soft' | 'mixed' | 'hard';
  let mode = 'mixed' as Mode;
  const rest: string[] = [];
  for (const a of args) {
    if (a === '--soft' || a === '--mixed' || a === '--hard') mode = a.slice(2) as Mode;
    else if (a !== '--') rest.push(a);
  }
  const paths = rest.filter((a) => {
    if (/[~^@]|^HEAD$/.test(a)) return false;
    try {
      resolve(r, a);
      return false;
    } catch {
      return true;
    }
  });
  if (paths.length && mode === 'mixed') {
    const H = headFiles(r);
    for (const p of paths) {
      if (p in H) r.index[p] = H[p]!;
      else delete r.index[p];
    }
    out.push('Unstaged changes after reset:', ...statusEntries(r).filter((e) => e.code[1] !== ' ' && e.code !== '??').map((e) => `${e.code[1]}\t${e.path}`));
    return;
  }
  const target = resolve(r, rest[0] ?? 'HEAD');
  const T = r.commits[target]!.files;
  if (mode === 'soft' && (r.op?.kind === 'merge' || r.conflicts.length)) fail('fatal: Cannot do a soft reset in the middle of a merge.');
  if (r.op?.kind !== 'rebase') r.op = undefined;
  if (mode !== 'soft') r.conflicts = [];
  moveHead(r, target, `reset: moving to ${rest[0] ?? 'HEAD'}`);
  if (mode === 'mixed') {
    r.index = { ...T };
    const unstaged = statusEntries(r).filter((e) => e.code[1] !== ' ' && e.code !== '??');
    if (unstaged.length) out.push('Unstaged changes after reset:', ...unstaged.map((e) => `${e.code[1]}\t${e.path}`));
  }
  if (mode === 'hard') {
    const untracked: Files = {};
    for (const [p, c] of Object.entries(r.work)) if (!(p in r.index) && !(p in T)) untracked[p] = c;
    r.index = { ...T };
    r.work = { ...untracked, ...T };
    out.push(`HEAD is now at ${abbrev(target)} ${subject(r.commits[target]!)}`);
  }
}

function cmdTag(r: Repo, args: string[], out: Out) {
  if (!args.length || args[0] === '-l' || args[0] === '--list') {
    out.push(...Object.keys(r.tags).sort());
    return;
  }
  if (args[0] === '-d') {
    const t = args[1]!;
    if (!r.tags[t]) fail(`error: tag '${t}' not found.`);
    out.push(`Deleted tag '${t}' (was ${abbrev(r.tags[t]!.object ?? r.tags[t]!.target)})`);
    delete r.tags[t];
    return;
  }
  let annotated = false;
  const msgs: string[] = [];
  const pos: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-a') annotated = true;
    else if (a === '-m') {
      msgs.push(args[++i]!);
      annotated = true;
    } else pos.push(a);
  }
  const name = pos[0]!;
  if (r.tags[name]) fail(`fatal: tag '${name}' already exists`);
  const target = resolve(r, pos[1] ?? 'HEAD');
  if (!annotated) {
    r.tags[name] = { target };
    return;
  }
  if (!msgs.length) fail('the sandbox has no editor: use git tag -a <name> -m "message"');
  const message = cleanMessage(msgs);
  r.tags[name] = { target, object: hashTag(target, name, r.user, r.clock, message), message, time: r.clock };
}

function cmdLog(r: Repo, args: string[], out: Out) {
  const all = args.includes('--all');
  const refs = args.filter((a) => !a.startsWith('-'));
  let starts: string[];
  if (all) {
    starts = [...Object.values(r.branches), ...Object.values(r.tracking), ...Object.values(r.tags).map((t) => t.target)];
    const h = headId(r);
    if (h) starts.push(h);
    if (r.stash[0]) starts.push(r.stash[0]);
  } else if (refs.length === 1 && refs[0]!.includes('..')) {
    const [a, b] = refs[0]!.split('..');
    const ex = ancestors(r, resolve(r, a || 'HEAD'));
    out.push(...logOrder(r, [resolve(r, b || 'HEAD')]).filter((x) => !ex.has(x)).map((x) => logLine(r, x)));
    return;
  } else {
    const h = refs[0] ? resolve(r, refs[0]) : headId(r);
    if (!h) fail(`fatal: your current branch '${currentBranch(r)}' does not have any commits yet`);
    starts = [h!];
  }
  const n = args.find((a) => /^-\d+$/.test(a));
  let ids = logOrder(r, [...new Set(starts)]);
  if (n) ids = ids.slice(0, Number(n.slice(1)));
  out.push(...ids.map((x) => logLine(r, x)));
}

function cmdStash(r: Repo, args: string[], out: Out) {
  const sub = args[0] ?? 'push';
  if (sub === 'list') {
    out.push(...r.stash.map((id, i) => `stash@{${i}}: ${subject(r.commits[id]!)}`));
    return;
  }
  if (sub === 'push' || sub === 'save') {
    needRepoClean(r, 'stash');
    if (r.conflicts.length) fail(`${r.conflicts.map((p) => `${p}: needs merge`).join('\n')}\nerror: could not write index`);
    const head = headId(r) ?? fail('You do not have the initial commit yet');
    if (!isDirty(r)) {
      out.push('No local changes to save');
      return;
    }
    const branch = currentBranch(r) ?? '(no branch)';
    const h = r.commits[head!]!;
    const base = `${branch}: ${abbrev(h.id)} ${subject(h)}`;
    const i = makeCommit(r, r.index, [h.id], `index on ${base}\n`);
    const wt: Files = {};
    for (const p of Object.keys(r.index)) if (p in r.work) wt[p] = r.work[p]!;
    const w = makeCommit(r, wt, [h.id, i.id], `WIP on ${base}`); // Git writes this message without a final newline
    r.stash.unshift(w.id);
    r.op = undefined; // stash resets to HEAD, which also ends a stopped (empty) cherry-pick
    const untracked: Files = {};
    for (const [p, c] of Object.entries(r.work)) if (!(p in r.index) && !(p in h.files)) untracked[p] = c;
    r.index = { ...h.files };
    r.work = { ...untracked, ...h.files };
    out.push(`Saved working directory and index state WIP on ${base}`);
    return;
  }
  if (sub === 'pop' || sub === 'apply') {
    const w = r.stash[0] ?? fail('No stash entries found.');
    const W = r.commits[w!]!;
    const base = r.commits[W.parents[0]!]!.files;
    const added = r.commits[W.parents[1]!]!.files;
    const H = headFiles(r);
    const m = mergeTrees(base, H, W.files, 'Updated upstream', 'Stashed changes');
    checkDirty(r, m.files, 'merge');
    if (m.conflicts.length) {
      applyConflicted(r, m, W.files);
      out.push(...conflictMessage(m.conflicts, base, H, W.files), 'The stash entry is kept in case you need it again.');
      softFail = true;
      return;
    }
    const index: Files = { ...r.index };
    for (const p of Object.keys(added)) if (!(p in base)) index[p] = m.files[p]!;
    r.index = index;
    r.work = { ...untrackedFiles(r), ...m.files };
    if (sub === 'pop') {
      r.stash.shift();
      out.push(`Dropped refs/stash@{0} (${w})`);
    }
    return;
  }
  if (sub === 'drop') {
    const w = r.stash.shift() ?? fail('No stash entries found.');
    out.push(`Dropped refs/stash@{0} (${w})`);
    return;
  }
  fail(`the sandbox does not support git stash ${sub}`);
}

function cmdReflog(r: Repo, out: Out) {
  out.push(
    ...r.reflog.map((e, i) => {
      const d = decorations(r, e.id);
      return `${abbrev(e.id)}${d.length ? ` (${d.join(', ')})` : ''} HEAD@{${i}}: ${e.msg}`;
    }),
  );
}

// ---------- remotes ----------

function needRemote(r: Repo) {
  return r.remote ?? fail("fatal: 'origin' does not appear to be a git repository");
}

function cmdFetch(r: Repo, out: Out) {
  const remote = needRemote(r);
  const lines: string[] = [];
  for (const [b, id] of Object.entries(remote.branches)) {
    const old = r.tracking[b];
    if (old === id) continue;
    if (!old) lines.push(` * [new branch]      ${b} -> origin/${b}`);
    else if (isAncestor(r, old, id)) lines.push(`   ${abbrev(old)}..${abbrev(id)}  ${b} -> origin/${b}`);
    else lines.push(` + ${abbrev(old)}...${abbrev(id)} ${b} -> origin/${b}  (forced update)`);
    r.tracking[b] = id;
  }
  for (const b of Object.keys(r.tracking)) if (!(b in remote.branches)) delete r.tracking[b];
  for (const [t, id] of Object.entries(remote.tags)) if (!r.tags[t]) {
    r.tags[t] = { target: id };
    lines.push(` * [new tag]         ${t} -> ${t}`);
  }
  if (lines.length) out.push(`From ${REMOTE_URL.replace(/\.git$/, '')}`, ...lines);
}

function cmdPull(r: Repo, args: string[], out: Out) {
  needRepoClean(r, 'pull');
  needRemote(r);
  const b = currentBranch(r) ?? fail('You are not currently on a branch.');
  const up = r.upstream[b] ?? fail(`There is no tracking information for the current branch.\nhint: git branch --set-upstream-to=origin/<branch> ${b}`);
  cmdFetch(r, out);
  const theirs = r.tracking[up!] ?? fail(`fatal: couldn't find remote ref ${up}`);
  const head = headId(r)!;
  if (isAncestor(r, theirs!, head)) {
    out.push('Already up to date.');
    return;
  }
  if (isAncestor(r, head, theirs!)) {
    if (isDirty(r)) {
      const T = r.commits[theirs!]!.files;
      const H = headFiles(r);
      const touched = statusEntries(r).filter((e) => e.code !== '??' && T[e.path] !== H[e.path]);
      if (touched.length) fail(`error: Your local changes to the following files would be overwritten by merge:\n${touched.map((e) => `\t${e.path}`).join('\n')}\nAborting`);
    }
    out.push(`Updating ${abbrev(head)}..${abbrev(theirs!)}\nFast-forward`);
    applyResult(r, { files: r.commits[theirs!]!.files, conflicts: [] });
    moveHead(r, theirs!, `pull: Fast-forward`);
    return;
  }
  if (args.includes('--rebase') || args.includes('-r')) {
    cmdRebase(r, [`origin/${up}`], out);
    return;
  }
  if (args.includes('--no-rebase') || args.includes('--no-ff')) {
    const message = mergeCommitMessage(r, `branch '${up}' of ${REMOTE_URL.replace(/\.git$/, '')}`);
    doMerge(r, theirs!, `origin/${up}`, message, { ff: 'auto', squash: false }, out);
    return;
  }
  if (args.includes('--ff-only')) fail('fatal: Not possible to fast-forward, aborting.');
  fail(
    'hint: You have divergent branches and need to specify how to reconcile them.\nhint:   git pull --no-rebase   # merge\nhint:   git pull --rebase      # rebase\nhint:   git pull --ff-only     # fast-forward only\nfatal: Need to specify how to reconcile divergent branches.',
  );
}

function cmdPush(r: Repo, args: string[], out: Out) {
  const remote = needRemote(r);
  const force = args.includes('--force') || args.includes('-f');
  const lease = args.includes('--force-with-lease');
  const setUp = args.includes('-u') || args.includes('--set-upstream');
  const pos = args.filter((a) => !a.startsWith('-'));
  if (args.includes('--tags')) {
    for (const [t, tag] of Object.entries(r.tags)) if (!remote.tags[t]) {
      remote.tags[t] = tag.target;
      out.push(` * [new tag]         ${t} -> ${t}`);
    }
    return;
  }
  if (pos.length && pos[0] !== 'origin') fail(`fatal: '${pos[0]}' does not appear to be a git repository`);
  const cur = currentBranch(r);
  const name = pos[1] ?? (cur && r.upstream[cur] ? cur : undefined);
  if (!name) {
    if (!cur) fail('fatal: You are not currently on a branch.');
    fail(`fatal: The current branch ${cur} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${cur}`);
  }
  if (r.tags[name!] && !r.branches[name!]) {
    if (remote.tags[name!]) fail(` ! [rejected]        ${name} -> ${name} (already exists)`);
    remote.tags[name!] = r.tags[name!]!.target;
    out.push(`To ${REMOTE_URL}`, ` * [new tag]         ${name} -> ${name}`);
    return;
  }
  const local = r.branches[name!] ?? fail(`error: src refspec ${name} does not match any`);
  const theirs = remote.branches[name!];
  const lines = [`To ${REMOTE_URL}`];
  if (theirs === local) {
    out.push('Everything up-to-date');
    return;
  }
  if (theirs && !isAncestor(r, theirs, local!)) {
    const known = r.tracking[name!] === theirs;
    if (lease && !known)
      fail(`To ${REMOTE_URL}\n ! [rejected]        ${name} -> ${name} (stale info)\nerror: failed to push some refs: origin has commits you have not fetched`);
    if (!force && !lease) {
      const why = known ? 'non-fast-forward' : 'fetch first';
      fail(
        `To ${REMOTE_URL}\n ! [rejected]        ${name} -> ${name} (${why})\nerror: failed to push some refs to '${REMOTE_URL}'\nhint: Updates were rejected because ${
          known ? 'the tip of your current branch is behind its remote counterpart' : 'the remote contains work that you do not have locally'
        }.\nhint: ${known ? "Integrate the remote changes (e.g. 'git pull ...') before pushing again." : "Use 'git pull' to integrate them before pushing again."}`,
      );
    }
    lines.push(` + ${abbrev(theirs)}...${abbrev(local!)} ${name} -> ${name} (forced update)`);
  } else if (theirs) lines.push(`   ${abbrev(theirs)}..${abbrev(local!)}  ${name} -> ${name}`);
  else lines.push(` * [new branch]      ${name} -> ${name}`);
  remote.branches[name!] = local!;
  r.tracking[name!] = local!;
  if (setUp) {
    r.upstream[name!] = name!;
    lines.push(`branch '${name}' set up to track 'origin/${name}'.`);
  }
  out.push(...lines);
}

/** Sandbox-only: a teammate commits one file change straight to origin's branch (main unless given). */
function cmdTeammate(r: Repo, args: string[], out: Out) {
  const remote = needRemote(r);
  const [path, text, message, branch = 'main'] = args;
  if (!path || text === undefined || !message) fail('usage: teammate-push <file> "<new line>" "<message>" [branch]');
  const parent = remote.branches[branch!] ?? fail(`origin has no branch ${branch}`);
  const files = { ...r.commits[parent!]!.files };
  files[path!] = (files[path!] ?? '') + `${text}\n`;
  const saved = r.user;
  r.user = GRACE;
  const c = makeCommit(r, files, [parent!], cleanMessage([message!]));
  r.user = saved;
  remote.branches[branch!] = c.id;
  out.push(`(Grace pushed ${abbrev(c.id)} "${message}" to origin/${branch}; run git fetch to see it)`);
}

/** Sandbox-only: creates origin from the current branches, as `git remote add` and `git push -u` would. */
function cmdRemoteInit(r: Repo) {
  r.remote = { branches: { ...r.branches }, tags: {} };
  r.tracking = { ...r.branches };
  for (const b of Object.keys(r.branches)) r.upstream[b] = b;
}

// ---------- shell ----------

function shell(r: Repo, t: string[], out: Out) {
  const cmd = t[0]!;
  if (cmd === 'echo') {
    const redir = t.findIndex((x) => x === '>' || x === '>>');
    if (redir < 0) {
      out.push(t.slice(1).join(' '));
      return;
    }
    const path = t[redir + 1] ?? fail('sandbox: missing file name after >');
    if (!/^[A-Za-z0-9._/-]+$/.test(path!) || path!.startsWith('/') || path!.includes('..'))
      fail('sandbox: use simple relative file names like notes.txt or src/train.py');
    const text = `${t.slice(1, redir).join(' ')}\n`;
    r.work[path!] = t[redir] === '>>' ? (r.work[path!] ?? '') + text : text;
    return;
  }
  if (cmd === 'cat') {
    for (const p of t.slice(1)) out.push((r.work[p] ?? fail(`cat: ${p}: No such file or directory`))!.replace(/\n$/, ''));
    return;
  }
  if (cmd === 'rm') {
    for (const p of t.slice(1)) {
      if (!(p in r.work)) fail(`rm: cannot remove '${p}': No such file or directory`);
      delete r.work[p];
    }
    return;
  }
  if (cmd === 'ls') {
    out.push(Object.keys(r.work).sort().join('  '));
    return;
  }
  if (cmd === 'teammate-push') return cmdTeammate(r, t.slice(1), out);
  if (cmd === 'remote-init') return cmdRemoteInit(r);
  fail(`sandbox: ${cmd}: command not found (try git, echo, cat, rm or ls)`);
}

function git(r: Repo, t: string[], out: Out) {
  const [sub, ...args] = t;
  switch (sub) {
    case 'status': {
      out.push(statusHeader(r), ...statusEntries(r).map((e) => `${e.code} ${e.path}`));
      if (r.op) out.push(`(${r.op.kind} in progress${r.conflicts.length ? ': fix conflicts, git add, then continue' : ''})`);
      return;
    }
    case 'add':
      return cmdAdd(r, args);
    case 'rm':
      return cmdRm(r, args);
    case 'restore':
      return cmdRestore(r, args);
    case 'commit':
      return cmdCommit(r, args, out);
    case 'branch':
      return cmdBranch(r, args, out);
    case 'switch':
      return cmdSwitch(r, args, out, false);
    case 'checkout':
      return cmdSwitch(r, args, out, true);
    case 'merge':
      return cmdMerge(r, args, out);
    case 'rebase':
      return cmdRebase(r, args, out);
    case 'cherry-pick':
      return cmdPick(r, args, out, 'cherry-pick');
    case 'revert':
      return cmdPick(r, args.filter((a) => a !== '--no-edit'), out, 'revert');
    case 'reset':
      return cmdReset(r, args, out);
    case 'tag':
      return cmdTag(r, args, out);
    case 'log':
      return cmdLog(r, args, out);
    case 'reflog':
      return cmdReflog(r, out);
    case 'stash':
      return cmdStash(r, args, out);
    case 'fetch':
      return cmdFetch(r, out);
    case 'pull':
      return cmdPull(r, args, out);
    case 'push':
      return cmdPush(r, args, out);
    case 'rev-parse':
      out.push(...args.map((a) => resolve(r, a)));
      return;
    case 'hash-object': {
      const f = args.filter((a) => !a.startsWith('-'))[0];
      if (!f) fail('usage: git hash-object <file>');
      if (r.work[f] === undefined) fail(`fatal: could not open '${f}' for reading: No such file or directory`);
      out.push(hashBlob(r.work[f]!));
      return;
    }
    case 'cat-file':
      return cmdCatFile(r, args, out);
    case 'remote':
      if (r.remote) out.push(`origin\t${REMOTE_URL} (fetch)`, `origin\t${REMOTE_URL} (push)`);
      return;
    case 'init':
      out.push('Reinitialized existing Git repository (the sandbox starts with one)');
      return;
    case undefined:
      fail('usage: git <command> [<args>]');
      return;
    default:
      fail(`the sandbox does not simulate 'git ${sub}'. Supported: status, add, rm, restore, commit, branch, switch, checkout, merge, rebase, cherry-pick, revert, reset, tag, log, reflog, stash, fetch, pull, push, cat-file, hash-object, rev-parse`);
  }
}

/** Runs one command line. The repository passed in is not changed; failed commands leave the state as it was. */
export function runCommand(repo: Repo, line: string): { repo: Repo; output: CommandOutput } {
  const r = clone(repo);
  const out: string[] = [];
  softFail = false;
  try {
    const t = tokenize(line);
    if (!t.length) return { repo, output: { command: line, output: '', ok: true } };
    if (t[0] === 'git') git(r, t.slice(1), out);
    else shell(r, t, out);
  } catch (e) {
    if (!(e instanceof GitError)) throw e;
    const failed = clone(repo);
    failed.clock += 60;
    return { repo: failed, output: { command: line, output: e.message, ok: false } };
  }
  r.clock += 60;
  return { repo: r, output: { command: line, output: out.join('\n'), ok: !softFail } };
}

export interface RunResult {
  repo: Repo;
  outputs: CommandOutput[];
}

export function runScript(lines: string[], start: Repo = emptyRepo()): RunResult {
  let repo = start;
  const outputs: CommandOutput[] = [];
  for (const line of lines) {
    const res = runCommand(repo, line);
    repo = res.repo;
    outputs.push(res.output);
  }
  return { repo, outputs };
}
