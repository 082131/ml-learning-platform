import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { OwnerMatch } from '@/lib/git/codeowners';
import { CODEOWNERS_FILE, type MatrixResult, type MatrixState, type OwnersState } from '@/lib/git/experiments';
import type { ProtectionResult, ProtectionState } from '@/lib/git/protection';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

/** The pull request's merge box under the chosen branch protection rules. */
export function ProtectionView() {
  const { result: r } = useExperimentContext<ProtectionState, ProtectionResult>('ProtectionView');
  return (
    <VizFrame
      title="Can this pull request merge?"
      caption={r.mergeable ? `Every rule is met. Allowed: ${r.methods.filter((m) => m.allowed).map((m) => m.method).join(', ')}.` : `Blocked by ${r.blockers.length} rule${r.blockers.length > 1 ? 's' : ''}: ${r.blockers.join('; ')}.`}
      table={<VizTable caption="Merge methods" columns={['method', 'allowed', 'why']} rows={r.methods.map((m) => [m.method, m.allowed ? 'yes' : 'no', m.why])} />}
    >
      <div className={s.grid2} data-mergeable={r.mergeable}>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Merge box</h4>
          <p className={s.verdict} data-ok={r.mergeable}>
            {r.mergeable ? '✓ Ready to merge' : `✗ Merging is blocked`}
          </p>
          {r.blockers.length > 0 && (
            <ul className={s.list}>
              {r.blockers.map((b) => (
                <li key={b} data-ok="false">
                  {b}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Merge methods</h4>
          <ul className={s.list}>
            {r.methods.map((m) => (
              <li key={m.method} data-ok={m.allowed}>
                <strong>{m.allowed ? '✓' : '✗'} {m.method}</strong>: {m.why}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </VizFrame>
  );
}

/** The CODEOWNERS file with the line that decides the owners of the typed path. */
export function OwnersView() {
  const { result: r } = useExperimentContext<OwnersState, OwnerMatch & { path: string }>('OwnersView');
  const lines = CODEOWNERS_FILE.split('\n');
  return (
    <VizFrame
      title=".github/CODEOWNERS"
      caption={`${r.path || '(no path)'}: ${r.rule ? `line ${r.rule.line} (${r.rule.pattern}) is the last match` : 'no line matches'}, so review is requested from ${r.owners.join(' ') || 'nobody'}.`}
      table={<VizTable caption="CODEOWNERS lines" columns={['line', 'text', 'decides']} rows={lines.map((l, i) => [i + 1, l, r.rule?.line === i + 1 ? 'yes' : ''])} />}
    >
      <ol className={s.codeLines}>
        {lines.map((l, i) => (
          <li key={i} data-hit={r.rule?.line === i + 1 || undefined}>
            <span className={s.lineNo}>{i + 1}</span>
            <code>{l || ' '}</code>
            {r.rule?.line === i + 1 && <span className={s.hitLabel}>last match</span>}
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}

/** The jobs a matrix expands to, with estimated durations and the wall-clock time at the chosen parallelism. */
export function MatrixView() {
  const { result: r } = useExperimentContext<MatrixState, MatrixResult>('MatrixView');
  const max = Math.max(...r.jobs.map((j) => j.minutes), 1);
  return (
    <VizFrame
      title="Jobs the matrix creates"
      badge={<Badge tone="simulated">Estimate</Badge>}
      caption={`${r.jobs.length} jobs, ${r.total} runner minutes, about ${r.wall} minutes of wall-clock time. Durations are assumptions: 4 min on Ubuntu, 7 on Windows, 6 on macOS.`}
      table={<VizTable caption="Matrix jobs" columns={['#', 'os', 'python', 'extra', 'minutes (estimate)']} rows={r.jobs.map((j, i) => [i + 1, j.os ?? '', j.python ?? '', j.experimental ? 'experimental: true' : '', j.minutes])} />}
    >
      <div className={s.grid2}>
        <section className={s.panel}>
          <h4 className={s.panelHead}>strategy (YAML)</h4>
          <pre className={s.pre}>{r.yaml}</pre>
        </section>
        <section className={s.panel}>
          <h4 className={s.panelHead}>{r.jobs.length} jobs</h4>
          <ul className={s.bars} data-jobs={r.jobs.length}>
            {r.jobs.map((j, i) => (
              <li key={i} className={s.barRow}>
                <span className={s.mono}>
                  {j.os?.replace('-latest', '')} · {j.python}
                  {j.experimental ? ' · exp.' : ''}
                </span>
                <span className={s.barTrack} aria-hidden="true">
                  <span className={s.barFill} style={{ display: 'block', width: `${(j.minutes / max) * 100}%` }} />
                </span>
                <span className={s.mono}>{j.minutes} min</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </VizFrame>
  );
}
