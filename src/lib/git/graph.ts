import { abbrev, decorations, headId, subject, type Repo } from './sim';

export interface GraphNode {
  id: string;
  short: string;
  subject: string;
  col: number;
  lane: number;
  /** Branch, tag and remote names pointing here, as `git log --decorate` prints them. */
  refs: string[];
  isHead: boolean;
  /** False for commits no ref reaches any more (after a reset, rebase or amend): only the reflog finds them. */
  reachable: boolean;
  merge: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** True for the second parent of a merge. */
  second: boolean;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lanes: number;
}

/** Stash commits are internal (two commits per stash entry); the graph leaves them out. */
function stashCommits(r: Repo): Set<string> {
  const out = new Set<string>();
  for (const w of r.stash) {
    out.add(w);
    const i = r.commits[w]?.parents[1];
    if (i) out.add(i);
  }
  return out;
}

/**
 * Lays commits out left to right in creation order. Each ref's first-parent chain gets a lane: main first, then
 * the other local branches, remote-tracking branches and tags, then whatever only the reflog still knows.
 */
export function layoutGraph(r: Repo): Graph {
  const hidden = stashCommits(r);
  const ids = r.order.filter((id) => !hidden.has(id));
  const head = headId(r);
  const tips: string[] = [];
  const push = (id?: string) => id && !tips.includes(id) && tips.push(id);
  push(r.branches.main);
  if (head) push(head);
  for (const b of Object.keys(r.branches).sort()) push(r.branches[b]);
  for (const b of Object.keys(r.tracking).sort()) push(r.tracking[b]);
  for (const t of Object.keys(r.tags).sort()) push(r.tags[t]!.target);
  const reachable = new Set<string>();
  for (const t of tips) {
    const stack = [t];
    while (stack.length) {
      const x = stack.pop()!;
      if (reachable.has(x)) continue;
      reachable.add(x);
      stack.push(...r.commits[x]!.parents);
    }
  }
  // Unreachable tips (newest first) get lanes after everything reachable.
  for (const id of [...ids].reverse()) if (!reachable.has(id) && !ids.some((c) => r.commits[c]!.parents.includes(id) && !hidden.has(c))) push(id);
  const lane = new Map<string, number>();
  let lanes = 0;
  for (const t of tips) {
    if (lane.has(t)) continue;
    let x: string | undefined = t;
    while (x && !lane.has(x) && !hidden.has(x)) {
      lane.set(x, lanes);
      x = r.commits[x]!.parents[0];
    }
    lanes++;
  }
  for (const id of ids) if (!lane.has(id)) lane.set(id, lanes++);
  const nodes: GraphNode[] = ids.map((id, col) => ({
    id,
    short: abbrev(id),
    subject: subject(r.commits[id]!),
    col,
    lane: lane.get(id)!,
    refs: decorations(r, id).filter((d) => d !== 'refs/stash'),
    isHead: id === head,
    reachable: reachable.has(id),
    merge: r.commits[id]!.parents.length > 1,
  }));
  const shown = new Set(ids);
  const edges: GraphEdge[] = [];
  for (const id of ids)
    r.commits[id]!.parents.forEach((p, i) => {
      if (shown.has(p)) edges.push({ from: p, to: id, second: i > 0 });
    });
  return { nodes, edges, lanes: Math.max(1, lanes) };
}
