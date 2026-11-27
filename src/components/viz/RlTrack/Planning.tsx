import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { ACTIONS, ACTION_ARROW, cellName, isActive, type Action } from '@/lib/rl/grid';
import { TRY_COUNT, type EvalResult, type EvalState, type TransitionResult, type TransitionState, type ViResult, type ViState } from '@/lib/rl/experiments';
import { backupTerms } from '@/lib/rl/mdp';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Board, fmtValue } from './Board';
import s from './RlTrack.module.css';

const fmt3 = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(3)}` : v.toFixed(3));
const pct = (p: number) => `${Math.round(p * 100)}%`;

/** One action from one cell: every cell it can land on, with its probability and a 1,000-try simulation. */
export function RlTransitions() {
  const { state, result: r } = useExperimentContext<TransitionState, TransitionResult>('RlTransitions');
  const labels = new Map<number, string>();
  r.outcomes.forEach((o) => labels.set(o.next, labels.has(o.next) ? labels.get(o.next)! : pct(o.p)));
  const arrows = r.grid.kinds.map((_, i) => (i === state.cell ? state.action : undefined));
  return (
    <VizFrame
      title={`Where does "${state.action}" from ${cellName(r.grid, state.cell)} lead?`}
      caption={r.outcomes.map((o, i) => `${cellName(r.grid, o.next)}: probability ${o.p.toFixed(2)}, reward ${fmtValue(o.reward)}${o.done ? ' (episode ends)' : ''}, ${r.counts[i]} of ${TRY_COUNT} simulated tries`).join('. ') + '.'}
      table={<VizTable caption="Outcomes" columns={['lands on', 'probability', 'reward', 'ends episode', `count in ${TRY_COUNT} tries`]} rows={r.outcomes.map((o, i) => [cellName(r.grid, o.next), o.p.toFixed(2), fmtValue(o.reward), o.done ? 'yes' : 'no', r.counts[i]!])} />}
    >
      <div className={s.grid2} data-outcomes={r.outcomes.length}>
        <Board grid={r.grid} agent={state.cell} arrows={arrows} labels={labels} />
        <section className={s.panel} aria-label="Transition probabilities">
          <h4 className={s.panelHead}>P(next cell | {cellName(r.grid, state.cell)}, {state.action})</h4>
          <ul className={s.list}>
            {r.outcomes.map((o, i) => (
              <li key={o.next} className={s.row} data-next={o.next} data-p={o.p.toFixed(2)}>
                <span className={s.mono}>
                  {cellName(r.grid, o.next)}
                  {o.next === state.cell ? ' (bumped, stayed put)' : ''} · reward {fmtValue(o.reward)}
                </span>
                <span className={s.tag} data-tone={o.done && o.reward < 0 ? 'err' : o.done ? 'ok' : undefined}>
                  {o.p.toFixed(2)} · seen {r.counts[i]}
                </span>
              </li>
            ))}
          </ul>
          <p className={s.muted}>The probabilities depend only on this cell and this action, not on how the agent got here.</p>
        </section>
      </div>
    </VizFrame>
  );
}

/** The values of a fixed policy after k sweeps, with the arithmetic of one cell's backup. */
export function RlEvalGrid() {
  const { state, result: r } = useExperimentContext<EvalState, EvalResult>('RlEvalGrid');
  const arrows = r.grid.kinds.map((_, i) => {
    const row = r.policy[i]!;
    const a = row.findIndex((p) => p === 1);
    return isActive(r.grid, i) && a >= 0 ? ACTIONS[a] : undefined;
  });
  const probs = r.policy[state.cell]!;
  const used = ACTIONS.map((a, k) => ({ a, k, p: probs[k]! })).filter((x) => x.p > 0);
  const total = used.reduce((sum, x) => sum + x.p * r.cellQ[x.k]!, 0);
  return (
    <VizFrame
      title={`Values of the ${state.policy} policy after ${state.sweeps} sweep${state.sweeps === 1 ? '' : 's'}`}
      caption={`V(start) = ${fmtValue(r.V[r.grid.start]!)}. ${state.sweeps === 0 ? 'Before the first sweep every value is 0.' : `The last sweep changed some cell by ${r.lastDelta.toFixed(3)}.`} The values stop changing after about ${r.convergedAt} sweeps.`}
      table={<VizTable caption="State values" columns={['cell', 'action', 'value']} rows={r.grid.kinds.flatMap((_, i) => (isActive(r.grid, i) ? [[cellName(r.grid, i), arrows[i] ?? 'random', fmtValue(r.V[i]!)]] : []))} />}
    >
      <div className={s.grid2} data-v-start={r.V[r.grid.start]!.toFixed(3)}>
        <Board grid={r.grid} values={r.V} arrows={arrows} labels={new Map([[state.cell, 'explained']])} />
        <Backup title={`New V${cellName(r.grid, state.cell)} = Σ π(a) · Q(a)`} terms={used.map((x) => ({ label: `π(${x.a}) = ${x.p === 1 ? '1' : x.p.toFixed(2)}`, q: r.cellQ[x.k]!, weight: x.p, a: x.a }))} total={total} r={r} cell={state.cell} gamma={state.gamma} />
      </div>
    </VizFrame>
  );
}

interface TermRow {
  label: string;
  q: number;
  weight: number;
  a: Action;
}

function Backup({ title, terms, total, r, cell, gamma }: { title: string; terms: TermRow[]; total: number; r: EvalResult; cell: number; gamma: number }) {
  const first = terms[0];
  const detail = first ? backupTerms(r.grid, r.prevV, cell, ACTIONS.indexOf(first.a)) : [];
  if (!isActive(r.grid, cell)) return null;
  return (
    <section className={s.panel} aria-label="One backup, worked out">
      <h4 className={s.panelHead}>{title}</h4>
      <ul className={s.list}>
        {terms.map((t) => (
          <li key={t.a} className={s.row}>
            <span className={s.mono}>
              {t.label} × Q({ACTION_ARROW[t.a]}) {fmtValue(t.q)}
            </span>
            <span className={s.tag}>{fmt3(t.weight * t.q)}</span>
          </li>
        ))}
      </ul>
      <p className={s.verdict}>= {fmt3(total)}</p>
      {first && (
        <>
          <h4 className={s.panelHead}>
            Q({ACTION_ARROW[first.a]}) = Σ P · (r + γ·V(next)), γ = {gamma.toFixed(2)}
          </h4>
          <ul className={s.list}>
            {detail.map((d) => (
              <li key={d.next} className={s.row}>
                <span className={s.mono}>
                  {d.p.toFixed(2)} × ({fmtValue(d.reward)} + {gamma.toFixed(2)} × {fmtValue(d.nextValue)}) → {cellName(r.grid, d.next)}
                  {d.done ? ' ends' : ''}
                </span>
                <span className={s.tag}>{fmt3(d.p * (d.reward + gamma * d.nextValue))}</span>
              </li>
            ))}
          </ul>
          <p className={s.muted}>V(next) comes from the previous sweep. A terminal cell has nothing left to collect, so its V is 0.</p>
        </>
      )}
    </section>
  );
}

/** Value iteration: values after k sweeps, the greedy arrows they imply, and which arrows are still wrong. */
export function RlViGrid() {
  const { state, result: r } = useExperimentContext<ViState, ViResult>('RlViGrid');
  const mismatch = r.greedy.map((a, i) => a !== undefined && a !== r.finalGreedy[i]);
  const wrong = mismatch.filter(Boolean).length;
  return (
    <VizFrame
      title={`Value iteration after ${state.sweeps} sweep${state.sweeps === 1 ? '' : 's'}`}
      caption={`V(start) = ${fmtValue(r.V[r.grid.start]!)}. ${wrong === 0 ? 'Every arrow already points the way the converged values say.' : `${wrong} arrow${wrong === 1 ? '' : 's'} (in red) will still change.`} Step reward ${fmtValue(state.stepReward)}, slip ${state.slip.toFixed(2)}, γ = ${state.gamma.toFixed(2)}.`}
      table={<VizTable caption="Values and greedy actions" columns={['cell', 'value now', 'greedy action now', 'converged action']} rows={r.grid.kinds.flatMap((_, i) => (isActive(r.grid, i) ? [[cellName(r.grid, i), fmtValue(r.V[i]!), r.greedy[i] ?? '', r.finalGreedy[i] ?? '']] : []))} />}
    >
      <div data-wrong={wrong} data-start-action={r.finalGreedy[r.grid.start]} data-policy={r.finalGreedy.map((a) => a ?? '-').join(',')}>
        <Board grid={r.grid} values={r.V} arrows={r.greedy} mismatch={mismatch} />
      </div>
    </VizFrame>
  );
}
