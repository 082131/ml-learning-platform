import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { SandboxResult, SandboxState } from '@/lib/git/sandbox';
import { headId, statusEntries } from '@/lib/git/sim';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

const CODE_TEXT: Record<string, string> = {
  '??': 'untracked',
  'A ': 'new, staged',
  'AM': 'new, staged, then edited',
  'M ': 'modified, staged',
  ' M': 'modified, not staged',
  MM: 'staged, then edited again',
  'D ': 'deleted, staged',
  ' D': 'deleted, not staged',
  UU: 'conflict: both modified',
  UD: 'conflict: deleted by them',
  DU: 'conflict: deleted by us',
};

const show = (c: string | undefined) => (c === undefined ? '' : c.replace(/\n$/, ''));

/** Working tree, staging area and HEAD commit, file by file, with the two-letter code git status prints. */
export function GitAreas() {
  const { result } = useExperimentContext<SandboxState, SandboxResult>('GitAreas');
  const r = result.repo;
  const id = headId(r);
  const H = id ? r.commits[id]!.files : {};
  const codes = new Map(statusEntries(r).map((e) => [e.path, e.code]));
  const paths = [...new Set([...Object.keys(r.work), ...Object.keys(r.index), ...Object.keys(H), ...r.conflicts])].sort();
  const label = (p: string) => {
    const c = codes.get(p);
    return c ? `[${c.replace(/ /g, '·')}] ${CODE_TEXT[c] ?? ''}` : 'clean';
  };
  return (
    <VizFrame
      title="The three areas"
      badge={<Badge tone="simulated">Simulated</Badge>}
      caption={
        paths.length
          ? `${paths.length} file${paths.length === 1 ? '' : 's'}; ${codes.size} with changes. git add copies a file from the working tree to the staging area; git commit saves the staging area as the next commit.`
          : 'No files yet.'
      }
      table={
        <VizTable
          caption="Each file in the working tree, the staging area and the HEAD commit"
          columns={['file', 'status', 'working tree', 'staging area', 'HEAD commit']}
          rows={paths.map((p) => [p, label(p), show(r.work[p]) || '(absent)', r.conflicts.includes(p) ? '(unmerged)' : show(r.index[p]) || '(absent)', show(H[p]) || '(absent)'])}
        />
      }
    >
      {paths.length === 0 ? (
        <p className={s.empty}>The working tree is empty. Create a file with echo "text" &gt; name.txt.</p>
      ) : (
        <div className={s.areasScroll}>
          <table className={s.areas}>
            <thead>
              <tr>
                <th scope="col">file</th>
                <th scope="col">working tree</th>
                <th scope="col">staging area</th>
                <th scope="col">HEAD commit</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((p) => {
                const code = codes.get(p);
                const cell = (v: string | undefined, changed: boolean, unmerged = false) => (
                  <td data-changed={changed || undefined}>
                    {unmerged ? <span className={s.absent}>unmerged</span> : v === undefined ? <span className={s.absent}>absent</span> : <pre className={s.cellPre}>{show(v)}</pre>}
                  </td>
                );
                return (
                  <tr key={p} data-path={p} data-code={code ?? ''}>
                    <th scope="row">
                      <span className={s.path}>{p}</span>
                      <span className={s.code}>{label(p)}</span>
                    </th>
                    {cell(r.work[p], r.work[p] !== (r.conflicts.includes(p) ? undefined : r.index[p]) || r.conflicts.includes(p))}
                    {cell(r.index[p], r.index[p] !== H[p], r.conflicts.includes(p))}
                    {cell(H[p], false)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </VizFrame>
  );
}
