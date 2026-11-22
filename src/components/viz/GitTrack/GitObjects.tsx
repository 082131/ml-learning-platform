import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { commitText, treeEntries } from '@/lib/git/objects';
import type { SandboxResult, SandboxState } from '@/lib/git/sandbox';
import { headId } from '@/lib/git/sim';
import { hashBlob, utf8 } from '@/lib/git/sha1';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

/** The objects behind the HEAD commit: the commit text, its tree, and one blob per file, each with its id. */
export function GitObjects() {
  const { result } = useExperimentContext<SandboxState, SandboxResult>('GitObjects');
  const r = result.repo;
  const id = headId(r);
  if (!id)
    return (
      <VizFrame title="Objects behind HEAD">
        <p className={s.empty}>No commit yet, so no commit or tree objects. Make a commit in the sandbox above.</p>
      </VizFrame>
    );
  const c = r.commits[id]!;
  const text = commitText(c);
  const root = treeEntries(c.files);
  const folders = root.filter((e) => e.type === 'tree');
  const bytes = utf8(text).length;
  return (
    <VizFrame
      title="Objects behind HEAD"
      badge={<Badge tone="simulated">Computed in the browser</Badge>}
      caption={`Commit ${id.slice(0, 7)} is ${bytes} bytes of text. Its id is the SHA-1 of "commit ${bytes}\\0" followed by that text, so changing any byte, even the date, gives a new id.`}
      table={
        <VizTable
          caption="Objects reachable from HEAD"
          columns={['type', 'id', 'name or content']}
          rows={[
            ['commit', id, c.message.trim()],
            ['tree', c.tree, '(root)'],
            ...folders.map((f) => ['tree', f.id, `${f.name}/`]),
            ...Object.entries(c.files).map(([p, body]) => ['blob', hashBlob(body), `${p}: ${body.trim()}`]),
          ]}
        />
      }
    >
      <div className={s.objects}>
        <section className={s.object} data-kind="commit">
          <h4 className={s.objectHead}>
            commit <code>{id}</code>
          </h4>
          <pre className={s.objectBody}>{text}</pre>
        </section>
        <section className={s.object} data-kind="tree">
          <h4 className={s.objectHead}>
            tree <code>{c.tree}</code>
          </h4>
          <pre className={s.objectBody}>{root.map((e) => `${e.mode} ${e.type} ${e.id}\t${e.name}`).join('\n')}</pre>
        </section>
        {folders.map((f) => (
          <section key={f.id} className={s.object} data-kind="tree">
            <h4 className={s.objectHead}>
              tree <code>{f.id}</code> ({f.name}/)
            </h4>
            <pre className={s.objectBody}>{treeEntries(c.files, f.name).map((e) => `${e.mode} ${e.type} ${e.id}\t${e.name}`).join('\n')}</pre>
          </section>
        ))}
        {Object.keys(c.files)
          .sort()
          .map((p) => {
            return (
              <section key={p} className={s.object} data-kind="blob">
                <h4 className={s.objectHead}>
                  blob <code>{hashBlob(c.files[p]!)}</code> ({p})
                </h4>
                <pre className={s.objectBody}>{c.files[p]!.replace(/\n$/, '')}</pre>
              </section>
            );
          })}
      </div>
    </VizFrame>
  );
}
