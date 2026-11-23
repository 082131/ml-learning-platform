import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { MergeResult } from '@/lib/git/merge3';
import type { MergeLabState } from '@/lib/git/mergeLab';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

const SIDES = [
  { key: 'base', label: 'Merge base' },
  { key: 'ours', label: 'main (HEAD, ours)' },
  { key: 'theirs', label: 'tune-lr (theirs)' },
] as const;

/** Labels each merged line as clean, a conflict marker, or inside the ours/theirs half of a conflict. */
function markZones(lines: string[]): { l: string; kind: string }[] {
  const out: { l: string; kind: string }[] = [];
  let zone: 'ours' | 'theirs' | undefined;
  for (const l of lines) {
    if (l.startsWith('<<<<<<<')) zone = 'ours';
    else if (l === '=======' && zone) zone = 'theirs';
    else if (l.startsWith('>>>>>>>')) zone = undefined;
    else {
      out.push({ l, kind: zone ?? 'clean' });
      continue;
    }
    out.push({ l, kind: 'marker' });
  }
  return out;
}

/** Three editable versions of params.yaml and the file git merge would write. */
export function MergeLab() {
  const { state, result: r, update } = useExperimentContext<MergeLabState, MergeResult>('MergeLab');
  const lines = r.text.replace(/\n$/, '').split('\n');
  const marked = markZones(lines);
  return (
    <VizFrame
      title="Three-way merge of params.yaml"
      caption={r.conflicts ? `${r.conflicts} conflict${r.conflicts > 1 ? 's' : ''}: both sides changed the same or touching lines since the merge base, so Git writes markers and stops.` : 'Clean merge: every changed region was changed on one side only, or identically on both.'}
      table={<VizTable caption="Merged file" columns={['line', 'text', 'from']} rows={marked.map((m, i) => [i + 1, m.l, m.kind])} />}
    >
      <div className={s.mergeInputs}>
        {SIDES.map((side) => (
          <label key={side.key} className={s.mergeField}>
            <span className={s.panelHead}>{side.label}</span>
            <textarea
              className={s.textarea}
              rows={6}
              spellCheck={false}
              value={state[side.key]}
              onChange={(e) => {
                const v = e.target.value;
                update((st) => ({ ...st, [side.key]: v.endsWith('\n') || v === '' ? v : `${v}\n` }));
              }}
            />
          </label>
        ))}
      </div>
      <section className={s.panel} data-conflicts={r.conflicts}>
        <h4 className={s.panelHead}>Result in the working tree</h4>
        <ol className={s.codeLines} data-testid="merge-result">
          {marked.map((m, i) => (
            <li key={i} data-zone={m.kind}>
              <span className={s.lineNo}>{i + 1}</span>
              <code>{m.l || ' '}</code>
            </li>
          ))}
        </ol>
      </section>
    </VizFrame>
  );
}
