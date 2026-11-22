import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { layoutGraph } from '@/lib/git/graph';
import type { SandboxResult, SandboxState } from '@/lib/git/sandbox';
import { abbrev } from '@/lib/git/sim';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

const COL = 74;
const LANE = 66;
const PAD_X = 60;
const PAD_TOP = 40;

/** The commit graph of the sandbox: commits left to right in the order they were made, one lane per branch. */
export function GitGraph() {
  const { result } = useExperimentContext<SandboxState, SandboxResult>('GitGraph');
  const g = layoutGraph(result.repo);
  const top = PAD_TOP + 13 * Math.max(0, Math.max(0, ...g.nodes.filter((n) => n.lane === 0).map((n) => n.refs.length)) - 2);
  const pos = new Map(g.nodes.map((n) => [n.id, { x: PAD_X + n.col * COL, y: top + n.lane * LANE }]));
  const width = Math.max(320, PAD_X * 2 + Math.max(0, g.nodes.length - 1) * COL);
  const height = top + (g.lanes - 1) * LANE + 34;
  const orphans = g.nodes.filter((n) => !n.reachable);
  const remote = result.repo.remote;
  return (
    <VizFrame
      title="Commit graph"
      badge={<Badge tone="simulated">Simulated</Badge>}
      caption={
        g.nodes.length
          ? `${g.nodes.length} commit${g.nodes.length === 1 ? '' : 's'}, oldest on the left. Arrows point from a commit to its parent${
              g.nodes.some((n) => n.merge) ? '; a merge commit has two' : ''
            }.${orphans.length ? ` ${orphans.length} dashed commit${orphans.length === 1 ? ' is' : 's are'} no longer on any branch: only the reflog reaches ${orphans.length === 1 ? 'it' : 'them'}.` : ''}`
          : 'No commits yet.'
      }
      table={
        <VizTable
          caption="Commits, parents and refs"
          columns={['commit', 'message', 'parents', 'refs', 'on a branch']}
          rows={g.nodes.map((n) => [
            n.short,
            n.subject,
            result.repo.commits[n.id]!.parents.map(abbrev).join(', ') || '(root)',
            n.refs.join(', '),
            n.reachable ? 'yes' : 'no (reflog only)',
          ])}
        />
      }
    >
      {g.nodes.length === 0 ? (
        <p className={s.empty}>No commits yet. Stage a file and commit it to see the first node.</p>
      ) : (
        <div className={s.graphScroll} tabIndex={0} role="region" aria-label="Commit graph (scrolls sideways)">
          <svg className={s.graph} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Commit graph">
            <defs>
              <marker id="git-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" className={s.arrowHead} />
              </marker>
            </defs>
            {g.edges.map((e) => {
              const a = pos.get(e.to)!;
              const b = pos.get(e.from)!;
              const r = 10;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const x1 = a.x + (dx / len) * r;
              const y1 = a.y + (dy / len) * r;
              const x2 = b.x - (dx / len) * (r + 2);
              const y2 = b.y - (dy / len) * (r + 2);
              const d = a.y === b.y ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
              return <path key={`${e.from}-${e.to}`} d={d} className={e.second ? s.edge2 : s.edge} markerEnd="url(#git-arrow)" />;
            })}
            {g.nodes.map((n) => {
              const p = pos.get(n.id)!;
              return (
                <g key={n.id} data-commit={n.short} data-reachable={n.reachable}>
                  <title>{`${n.short} ${n.subject}${n.refs.length ? ` (${n.refs.join(', ')})` : ''}`}</title>
                  <circle cx={p.x} cy={p.y} r={10} className={n.isHead ? s.nodeHead : n.reachable ? s.node : s.nodeGone} />
                  {n.merge && <circle cx={p.x} cy={p.y} r={4} className={s.mergeDot} />}
                  <text x={p.x} y={p.y + 25} className={s.nodeId} textAnchor="middle">
                    {n.short}
                  </text>
                  {n.refs.map((ref, i) => (
                    <text key={ref} x={p.x} y={p.y - 16 - i * 13} className={ref.startsWith('HEAD') ? s.refHead : ref.startsWith('tag:') ? s.refTag : s.ref} textAnchor="middle">
                      {ref}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      {remote && (
        <p className={s.remoteLine} data-testid="git-remote">
          <span className={s.remoteName}>origin (GitHub)</span>{' '}
          {Object.entries(remote.branches)
            .sort()
            .map(([b, id]) => `${b} ${abbrev(id)}`)
            .join(' · ')}
          {Object.keys(remote.tags).length ? ` · tags: ${Object.keys(remote.tags).sort().join(', ')}` : ''}
        </p>
      )}
    </VizFrame>
  );
}
