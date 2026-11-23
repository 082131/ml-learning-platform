import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { OrganizeState } from '@/lib/automation/experiments';
import type { Plan } from '@/lib/automation/organize';
import type { WorthInput, WorthResult } from '@/lib/automation/worth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AutomationTrack.module.css';

/** Cumulative hours won or lost, month by month: build cost first, then the net saving each month. */
export function WorthChart() {
  const { result: r } = useExperimentContext<WorthInput, WorthResult>('WorthChart');
  const max = Math.max(1, ...r.cumulative.map(Math.abs));
  return (
    <VizFrame
      title="Hours won or lost over a year"
      badge={<Badge tone="simulated">Estimate</Badge>}
      caption={`Saves ${r.savedPerMonth} h a month, ${r.netPerMonth} h after maintenance. ${r.breakEvenMonth === null ? 'It does not pay back within 12 months.' : `It pays back in month ${r.breakEvenMonth}`} and ends the year at ${r.totalNet} h.`}
      table={<VizTable caption="Cumulative net hours" columns={['month', 'net hours']} rows={r.cumulative.map((v, m) => [m, v])} />}
    >
      <div data-breakeven={r.breakEvenMonth ?? 'never'}>
        <div className={s.cols} aria-hidden="true">
          {r.cumulative.map((v, m) => (
            <div key={m} className={s.col}>
              <div className={s.colUp}>{v > 0 && <span className={s.barUp} style={{ height: `${(v / max) * 100}%` }} />}</div>
              <div className={s.colDown}>{v < 0 && <span className={s.barDown} style={{ height: `${(-v / max) * 100}%` }} />}</div>
            </div>
          ))}
        </div>
        <div className={s.axisLabels} aria-hidden="true">
          {r.cumulative.map((_, m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <p className={s.muted}>Month (0 = the build). Solid bars above the line: hours won. Hatched bars below: hours still owed.</p>
      </div>
    </VizFrame>
  );
}

const verb = { move: 'move', skip: 'skip', conflict: 'conflict' } as const;

/** The organizer's dry-run plan: one line per file, and the folder afterwards. */
export function OrganizePlan() {
  const { result: r } = useExperimentContext<OrganizeState, Plan & { files: string[] }>('OrganizePlan');
  return (
    <VizFrame
      title="Dry run: what the script would do"
      caption={`${r.moves} moves, ${r.conflicts} conflicts left alone, ${r.lost} files destroyed.`}
      table={
        <VizTable
          caption="Planned actions"
          columns={['action', 'file', 'destination or reason']}
          rows={r.actions.map((a) => (a.kind === 'skip' ? ['skip', a.path, a.reason] : [a.kind === 'move' && a.replaces ? 'move (replaces!)' : a.kind, a.from, a.to]))}
        />
      }
    >
      <div className={s.grid2} data-moves={r.moves} data-lost={r.lost}>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Plan</h4>
          <ul className={s.list}>
            {r.actions.map((a, k) => (
              <li key={k} className={s.row}>
                <span className={s.mono}>{a.kind === 'skip' ? a.path : `${a.from} → ${a.to}`}</span>
                <span className={s.tag} data-tone={a.kind === 'conflict' || (a.kind === 'move' && a.replaces) ? 'err' : a.kind === 'move' ? 'ok' : undefined}>
                  {a.kind === 'skip' ? a.reason : a.kind === 'move' && a.replaces ? 'overwrites' : verb[a.kind]}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Folder afterwards</h4>
          <ul className={s.list}>
            {r.after.map((f) => (
              <li key={f} className={`${s.row} ${s.mono}`}>
                {f}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </VizFrame>
  );
}
