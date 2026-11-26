import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { DICE_EVENTS, type DiceResult, type DiceState, type GambleResult, type GambleState, type ScreenResult, type ScreenState, SCREEN_POPULATION } from '@/lib/stats/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Curve, Legend, Plot, VLine } from './Plot';
import s from './StatsTrack.module.css';

const n = (x: number) => x.toLocaleString('en-US');

/** All 36 outcomes of two dice, with the cells of event A and event B marked. */
export function DiceGrid() {
  const { state, result: r } = useExperimentContext<DiceState, DiceResult>('DiceGrid');
  const A = DICE_EVENTS[state.a]!;
  const B = DICE_EVENTS[state.b]!;
  return (
    <VizFrame
      title="Two dice: 36 equally likely outcomes"
      caption={`A = ${A.label}: ${r.nA} cells. B = ${B.label}: ${r.nB} cells. Both: ${r.nBoth}. Either: ${r.nEither}. P(B | A) = ${r.nBoth}/${r.nA || 1}.`}
      table={<VizTable caption="Outcomes in A and B" columns={['first die', 'second die', 'in A', 'in B']} rows={r.cells.filter((c) => c.inA || c.inB).map((c) => [c.a, c.b, c.inA ? 'yes' : '', c.inB ? 'yes' : ''])} />}
    >
      <div className={s.grid2}>
        <div className={s.dice} role="grid" aria-label="Outcomes: rows are the first die, columns the second" data-a={r.nA} data-b={r.nB} data-both={r.nBoth}>
          <span className={s.diceHead} aria-hidden="true" />
          {[1, 2, 3, 4, 5, 6].map((b) => (
            <span key={`h${b}`} className={s.diceHead} aria-hidden="true">
              {b}
            </span>
          ))}
          {[1, 2, 3, 4, 5, 6].map((a) => [
            <span key={`r${a}`} className={s.diceHead} aria-hidden="true">
              {a}
            </span>,
            ...r.cells
              .filter((c) => c.a === a)
              .map((c) => (
                <span key={`${c.a}${c.b}`} className={s.die} data-a={c.inA || undefined} data-b={c.inB || undefined} aria-label={`${c.a} and ${c.b}${c.inA ? ', in A' : ''}${c.inB ? ', in B' : ''}`}>
                  {c.inA && c.inB ? 'AB' : c.inA ? 'A' : c.inB ? 'B' : ''}
                </span>
              )),
          ])}
        </div>
        <div className={s.panel}>
          <h4 className={s.panelHead}>Count, then divide by 36</h4>
          <p className={s.mono}>
            <span className={s.keyA} /> A: {r.nA} cells
            <br />
            <span className={s.keyB} /> B: {r.nB} cells
            <br />
            <span className={s.keyAB} /> both: {r.nBoth} cells
          </p>
          <p className={s.muted}>
            A or B = {r.nA} + {r.nB} − {r.nBoth} = {r.nEither}. The overlap is subtracted once because it was counted in A and again in B.
          </p>
          <p className={s.muted}>
            Knowing A happened shrinks the world to A&apos;s {r.nA} cells; {r.nBoth} of them are also B, so P(B | A) = {r.nBoth}/{r.nA || 1}
            {r.independent ? `, the same as P(B) = ${r.nB}/36: A tells you nothing about B.` : `, not P(B) = ${r.nB}/36: A changes the odds of B.`}
          </p>
        </div>
      </div>
    </VizFrame>
  );
}

/** 100,000 transactions split by the truth and by the model's flag. */
export function FraudTree() {
  const { result: r } = useExperimentContext<ScreenState, ScreenResult>('FraudTree');
  const truePct = r.flagged ? (100 * r.truePos) / r.flagged : 0;
  return (
    <VizFrame
      title={`${n(SCREEN_POPULATION)} transactions through the fraud flag`}
      caption={`${n(r.flagged)} transactions are flagged: ${n(r.truePos)} fraud and ${n(r.falsePos)} legitimate. So a flagged transaction is fraud ${truePct.toFixed(1)}% of the time.`}
      table={
        <VizTable
          caption="Counts"
          columns={['', 'flagged', 'not flagged', 'total']}
          rows={[
            ['fraud', r.truePos, r.falseNeg, r.fraud],
            ['legitimate', r.falsePos, r.trueNeg, r.legit],
            ['total', r.flagged, r.trueNeg + r.falseNeg, SCREEN_POPULATION],
          ]}
        />
      }
    >
      <div className={s.tree} data-flagged={r.flagged} data-ppv={r.ppv.toFixed(4)}>
        <div className={s.treeRow}>
          <div className={s.node}>
            <strong>{n(r.fraud)}</strong>fraud (the base rate)
          </div>
          <div className={s.node}>
            <strong>{n(r.legit)}</strong>legitimate
          </div>
        </div>
        <div className={s.treeRow}>
          <div className={s.node} data-kind="flag">
            <strong>{n(r.truePos)}</strong>fraud, flagged (caught)
          </div>
          <div className={s.node}>
            <strong>{n(r.falseNeg)}</strong>fraud, missed
          </div>
          <div className={s.node} data-kind="flag">
            <strong>{n(r.falsePos)}</strong>legit, flagged (false alarms)
          </div>
          <div className={s.node}>
            <strong>{n(r.trueNeg)}</strong>legit, cleared
          </div>
        </div>
        <div>
          <h4 className={s.panelHead}>Everything flagged: {n(r.flagged)}</h4>
          <div className={s.stack} aria-label={`Of ${r.flagged} flagged, ${r.truePos} are fraud`}>
            <span className={s.stackTrue} style={{ width: `${truePct}%` }}>
              {truePct >= 12 ? `fraud ${truePct.toFixed(0)}%` : ''}
            </span>
            <span className={s.stackFalse} style={{ width: `${100 - truePct}%` }}>
              {100 - truePct >= 12 ? `false alarms ${(100 - truePct).toFixed(0)}%` : ''}
            </span>
          </div>
          <Legend
            items={[
              { tone: 'accent', label: 'really fraud' },
              { tone: 'err', label: 'false alarm', kind: 'hatch' },
            ]}
          />
        </div>
      </div>
    </VizFrame>
  );
}

/** The probability of each value, and the running average of many plays settling on E[X]. */
export function GambleView() {
  const { state, result: r } = useExperimentContext<GambleState, GambleResult>('GambleView');
  const g = r.gamble;
  const vals = g.values;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || 1;
  const runLo = Math.min(r.mean - 2 * r.sd, ...r.running.map((p) => p[1]));
  const runHi = Math.max(r.mean + 2 * r.sd, ...r.running.map((p) => p[1]));
  return (
    <VizFrame
      title="One random variable, many plays"
      badge={<Badge tone="simulated">Seeded simulation</Badge>}
      caption={`E[X] = ${r.mean.toFixed(3)}. After ${n(state.n)} plays the average is ${r.finalMean.toFixed(3)}. The SD, ${r.sd.toFixed(3)}, is how far one play typically lands from E[X].`}
      table={<VizTable caption="Values" columns={['value', 'probability', 'times drawn']} rows={vals.map((v, i) => [v, g.probs[i]!.toFixed(3), r.counts[i]!])} />}
    >
      <div className={s.grid2} data-final={r.finalMean.toFixed(3)}>
        <section className={s.panel} aria-label="Probabilities">
          <h4 className={s.panelHead}>Values and their probabilities</h4>
          <Plot label="Probability of each value" xDomain={[lo - pad, hi + pad]} yDomain={[0, Math.max(...g.probs) * 1.15]} xLabel={`value (${g.unit})`} yLabel="probability" height={200}>
            {(x, y) => (
              <>
                {vals.map((v, i) => (
                  <rect key={v} className={s.bar} data-tone="accent" x={x(v) - 6} width={12} y={y(g.probs[i]!)} height={y(0) - y(g.probs[i]!)} />
                ))}
                <VLine x={x} y={y} at={r.mean} label={`E[X] = ${Number(r.mean.toPrecision(4))}`} tone="err" anchor={x(r.mean) > x(hi) - 60 ? 'end' : 'start'} />
              </>
            )}
          </Plot>
        </section>
        <section className={s.panel} aria-label="Running average">
          <h4 className={s.panelHead}>Average of the first n plays</h4>
          <Plot label="Running average against number of plays" xDomain={[0, state.n]} yDomain={[runLo, runHi]} xLabel="plays" yLabel="average so far" height={200}>
            {(x, y) => (
              <>
                <VLine x={x} y={y} at={0} />
                <line className={s.vline} x1={x(0)} x2={x(state.n)} y1={y(r.mean)} y2={y(r.mean)} stroke="var(--err)" strokeDasharray="5 4" />
                <Curve x={x} y={y} pts={r.running} />
              </>
            )}
          </Plot>
          <Legend
            items={[
              { tone: 'accent', label: 'running average', kind: 'line' },
              { tone: 'err', label: 'E[X]', kind: 'dashed' },
            ]}
          />
        </section>
      </div>
    </VizFrame>
  );
}

