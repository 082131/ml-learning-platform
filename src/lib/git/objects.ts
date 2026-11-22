import { concatBytes, hashObject, hexToBytes, utf8, hashBlob } from './sha1';

/** A snapshot of files: path (with "/" for folders) to content. */
export type Files = Record<string, string>;

export interface Person {
  name: string;
  email: string;
}

/** Seconds since the epoch for the first command of every sandbox run: 2026-01-01 00:00:00 UTC. */
export const T0 = 1767225600;

const ident = (p: Person, t: number) => `${p.name} <${p.email}> ${t} +0000`;

interface TreeNode {
  blobs: Map<string, string>;
  trees: Map<string, TreeNode>;
}

function buildTree(files: Files): TreeNode {
  const root: TreeNode = { blobs: new Map(), trees: new Map() };
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let node = root;
    for (const dir of parts.slice(0, -1)) {
      if (!node.trees.has(dir)) node.trees.set(dir, { blobs: new Map(), trees: new Map() });
      node = node.trees.get(dir)!;
    }
    node.blobs.set(parts[parts.length - 1]!, content);
  }
  return root;
}

function hashNode(node: TreeNode): string {
  // Git sorts entries by name, comparing a folder as if its name ended in "/".
  const entries: { key: string; mode: string; name: string; id: string }[] = [];
  for (const [name, content] of node.blobs) entries.push({ key: name, mode: '100644', name, id: hashBlob(content) });
  for (const [name, sub] of node.trees) entries.push({ key: `${name}/`, mode: '40000', name, id: hashNode(sub) });
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return hashObject('tree', concatBytes(entries.flatMap((e) => [utf8(`${e.mode} ${e.name}\0`), hexToBytes(e.id)])));
}

/** The id of the tree object for a snapshot. An empty snapshot gives Git's empty tree, 4b825dc. */
export const hashTree = (files: Files): string => hashNode(buildTree(files));

export interface CommitFields {
  tree: string;
  parents: string[];
  author: Person;
  authorTime: number;
  committer: Person;
  commitTime: number;
  message: string;
}

export function commitText(c: CommitFields): string {
  return [
    `tree ${c.tree}`,
    ...c.parents.map((p) => `parent ${p}`),
    `author ${ident(c.author, c.authorTime)}`,
    `committer ${ident(c.committer, c.commitTime)}`,
    '',
    c.message,
  ].join('\n');
}

export const hashCommit = (c: CommitFields): string => hashObject('commit', utf8(commitText(c)));

export function tagText(target: string, name: string, tagger: Person, time: number, message: string): string {
  return `object ${target}\ntype commit\ntag ${name}\ntagger ${ident(tagger, time)}\n\n${message}`;
}

export const hashTag = (target: string, name: string, tagger: Person, time: number, message: string): string =>
  hashObject('tag', utf8(tagText(target, name, tagger, time, message)));

/** Git's message cleanup for -m: trailing spaces and blank lines go, and the message ends with one newline. */
export function cleanMessage(parts: string[]): string {
  const text = parts
    .join('\n\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
  return text ? `${text}\n` : '';
}

export interface TreeEntry {
  mode: string;
  type: 'blob' | 'tree';
  id: string;
  name: string;
}

/** The entries of one tree object (the root, or the folder `dir`), as `git ls-tree` lists them. */
export function treeEntries(files: Files, dir = ''): TreeEntry[] {
  let node = buildTree(files);
  for (const part of dir ? dir.split('/') : []) node = node.trees.get(part) ?? { blobs: new Map(), trees: new Map() };
  const out: TreeEntry[] = [];
  for (const [name, content] of node.blobs) out.push({ mode: '100644', type: 'blob', id: hashBlob(content), name });
  for (const [name, sub] of node.trees) out.push({ mode: '040000', type: 'tree', id: hashNode(sub), name });
  return out.sort((a, b) => {
    const ka = a.type === 'tree' ? `${a.name}/` : a.name;
    const kb = b.type === 'tree' ? `${b.name}/` : b.name;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}
