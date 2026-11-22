import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { RANGE_VERSIONS, type RangeState, type SemverResult, type SemverState, type StorageRow, type StorageState } from '@/lib/git/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

/** Each commit's Conventional Commits type and bump, the next version, and the changelog entry. */
export function SemverView() {
  const { state, result: r } = useExperimentContext<SemverState, SemverResult>('SemverView');
  return (
    <VizFrame
      title="From commit messages to the next version"
      caption={r.bump === 'none' ? `No feat, fix, perf or breaking change since ${state.current}: no release.` : `The largest bump among the commits is ${r.bump}, so ${state.current} becomes ${r.version}.`}
      table={<VizTable caption="Commits and the bump each implies" columns={['commit', 'type', 'breaking', 'bump']} rows={r.commits.map((c) => [c.message.split('\n')[0]!, c.type, c.breaking ? 'yes' : 'no', c.bump])} />}
    >
      <div className={s.grid2}>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Commits since {state.current}</h4>
          <ul className={s.list}>
            {r.commits.map((c) => (
              <li key={c.message}>
                <code className={s.mono}>{c.message.split('\n')[0]}</code>
                {c.message.includes('\n') && <span className={s.mono}> (+ footer: BREAKING CHANGE)</span>}
                <br />
                <span>
                  type {c.type}
                  {c.breaking ? ', breaking' : ''} → {c.bump === 'none' ? 'no release' : c.bump}
                </span>
              </li>
            ))}
          </ul>
          <p className={s.verdict} data-ok="true">
            {state.current} → {r.bump === 'none' ? `${state.current} (no release)` : r.version}
          </p>
        </section>
        <section className={s.panel}>
          <h4 className={s.panelHead}>CHANGELOG.md entry</h4>
          <pre className={s.pre}>{r.changelog}</pre>
        </section>
      </div>
    </VizFrame>
  );
}

/** Which versions an npm range accepts. */
export function RangeView() {
  const { state, result: r } = useExperimentContext<RangeState, { text: string; ok: Record<string, boolean> }>('RangeView');
  return (
    <VizFrame
      title={`Versions that satisfy ${state.range}`}
      caption={`${state.range} expands to ${r.text}. Accepted: ${RANGE_VERSIONS.filter((v) => r.ok[v]).join(', ') || 'none'}.`}
      table={<VizTable caption="Versions" columns={['version', 'satisfies']} rows={RANGE_VERSIONS.map((v) => [v, r.ok[v] ? 'yes' : 'no'])} />}
    >
      <p className={s.mono}>{r.text}</p>
      <ul className={s.chips} data-range={state.range}>
        {RANGE_VERSIONS.map((v) => (
          <li key={v} className={s.chip} data-on={r.ok[v]}>
            {r.ok[v] ? '✓' : '✗'} {v}
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}

/** Download per clone and total storage after many model versions, for plain Git, Git LFS and DVC. */
export function StorageView() {
  const { state, result: rows } = useExperimentContext<StorageState, StorageRow[]>('StorageView');
  const max = Math.max(...rows.map((r) => r.clone), 0.001);
  return (
    <VizFrame
      title="What one clone downloads"
      badge={<Badge tone="simulated">Model</Badge>}
      caption={`${state.versions} versions of a ${state.sizeGb.toFixed(1)} GB model: a plain Git clone downloads ${rows[0]!.clone.toFixed(1)} GB; with Git LFS or DVC, ${rows[1]!.clone.toFixed(1)} GB. All three store ${rows[0]!.stored.toFixed(1)} GB in total somewhere.`}
      table={<VizTable caption="Clone and storage size" columns={['approach', 'one clone (GB)', 'stored in total (GB)', 'why']} rows={rows.map((r) => [r.approach, r.clone.toFixed(1), r.stored.toFixed(1), r.note])} />}
    >
      <ul className={s.bars}>
        {rows.map((r) => (
          <li key={r.approach} className={s.barRow}>
            <span>{r.approach}</span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} style={{ display: 'block', width: `${(r.clone / max) * 100}%` }} />
            </span>
            <span className={s.mono}>{r.clone.toFixed(1)} GB</span>
          </li>
        ))}
      </ul>
      <p className={s.empty}>Assumes every version's weights differ throughout, as retrained weights do, so Git cannot delta-compress them.</p>
    </VizFrame>
  );
}
