import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Button } from '@/components/ui';
import { ACTION_ARROW, cellName, type Action } from '@/lib/rl/grid';
import type { PlayResult, PlayState, ReturnOption, ReturnResult, ReturnState } from '@/lib/rl/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Board, fmtValue } from './Board';
import s from './RlTrack.module.css';

const PAD: Action[] = ['up', 'left', 'down', 'right'];

/** You are the agent: press a direction, the environment answers with a new cell and a reward. */
export function RlPlayGrid() {
  const { state, result: r, update } = useExperimentContext<PlayState, PlayResult>('RlPlayGrid');
  const path = [r.grid.start, ...r.steps.map((x) => x.to)];
  const last = r.steps.at(-1);
  return (
    <VizFrame
      title="You are the agent"
      caption={
        r.steps.length === 0
          ? 'You stand on the start cell. Pick a move: the environment will tell you where you ended up and what reward you got.'
          : `${r.steps.length} move${r.steps.length === 1 ? '' : 's'}, total reward ${fmtValue(r.total)}. ${r.ended === 'goal' ? 'The episode is over: you reached the goal.' : r.ended === 'pit' ? 'The episode is over: you fell in the pit.' : `You are on ${cellName(r.grid, r.at)}.`}`
      }
      table={<VizTable caption="Moves and rewards" columns={['t', 'state', 'action', 'next state', 'reward']} rows={r.steps.map((x, t) => [t, cellName(r.grid, x.from), x.action, cellName(r.grid, x.to), fmtValue(x.reward)])} />}
    >
      <div className={s.grid2} data-moves={r.steps.length} data-total={r.total.toFixed(2)} data-ended={r.ended ?? 'no'}>
        <div className={s.stack}>
          <Board grid={r.grid} agent={r.at} path={path} />
          <div className={s.pad} role="group" aria-label="Move the agent">
            {PAD.map((a) => (
              <Button key={a} size="sm" aria-label={`Move ${a}`} disabled={r.ended !== null} onClick={() => update((st) => ({ ...st, moves: [...st.moves, a] }))}>
                {ACTION_ARROW[a]}
              </Button>
            ))}
          </div>
          <div className={s.toolbar}>
            <Button size="sm" variant="ghost" disabled={state.moves.length === 0} onClick={() => update((st) => ({ ...st, moves: st.moves.slice(0, -1) }))}>
              Undo
            </Button>
            <Button size="sm" variant="ghost" disabled={state.moves.length === 0} onClick={() => update((st) => ({ ...st, moves: [] }))}>
              New episode
            </Button>
          </div>
        </div>
        <section className={s.panel} aria-label="What the environment told you">
          <h4 className={s.panelHead}>Experience: (state, action, reward, next state)</h4>
          {last ? (
            <p className={s.mono} aria-live="polite">
              Last step: in {cellName(r.grid, last.from)} you chose {last.action}; you landed on {cellName(r.grid, last.to)} and got {fmtValue(last.reward)}.
            </p>
          ) : (
            <p className={s.muted}>No experience yet.</p>
          )}
          <ol className={`${s.list} ${s.log}`}>
            {r.steps.map((x, t) => (
              <li key={t} className={s.row}>
                <span className={s.mono}>
                  t={t}: {cellName(r.grid, x.from)} {ACTION_ARROW[x.action]} {cellName(r.grid, x.to)}
                </span>
                <span className={s.tag} data-tone={x.reward > 0 ? 'ok' : x.reward < -0.5 ? 'err' : undefined}>
                  {fmtValue(x.reward)}
                </span>
              </li>
            ))}
          </ol>
          <p className={s.verdict} data-ok={r.ended === 'goal' ? 'true' : r.ended === 'pit' ? 'false' : undefined}>
            Return so far (sum of rewards): {fmtValue(r.total)}
          </p>
        </section>
      </div>
    </VizFrame>
  );
}

function Bars({ o, scale }: { o: ReturnOption; scale: number }) {
  return (
    <section className={s.panel} aria-label={o.label}>
      <h4 className={s.panelHead}>
        {o.label}: G = {o.total.toFixed(3)}
      </h4>
      <div className={s.bars} aria-hidden="true">
        {o.rewards.map((r, t) => {
          const d = o.terms[t]!;
          const h = (x: number) => `${Math.min(100, (Math.abs(x) / scale) * 100)}%`;
          return (
            <div key={t} className={s.bar} title={`t=${t}: reward ${r}, worth ${d.toFixed(3)} today`}>
              <div className={s.barUp}>
                {r > 0 && <span className={s.ghost} style={{ height: h(r) }} />}
                {d > 0 && <span className={s.fill} style={{ height: h(d) }} />}
              </div>
              <div className={s.barDown}>
                {r < 0 && <span className={s.ghost} style={{ height: h(r * 2) }} />}
                {d < 0 && <span className={s.fill} style={{ height: h(d * 2) }} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className={s.muted}>Time step 0 on the left. Dashed outline: the reward itself. Filled: what it is worth today, γᵗ × reward.</p>
    </section>
  );
}

/** Each reward as received and as discounted to today, for one or two reward sequences. */
export function RlReturnBars() {
  const { state, result: r } = useExperimentContext<ReturnState, ReturnResult>('RlReturnBars');
  const scale = Math.max(...r.options.flatMap((o) => o.rewards.map(Math.abs)));
  const rows = r.options.flatMap((o) => o.rewards.map((x, t) => [o.label, t, x, `${state.gamma.toFixed(2)}^${t} = ${(state.gamma ** t).toFixed(3)}`, o.terms[t]!.toFixed(3), o.perStep[t]!.toFixed(3)]));
  return (
    <VizFrame
      title="What future rewards are worth today"
      caption={r.options.map((o) => `${o.label}: return ${o.total.toFixed(3)}`).join('. ') + `. γ = ${state.gamma.toFixed(2)}.`}
      table={<VizTable caption="Rewards and discounted values" columns={['sequence', 't', 'reward', 'γᵗ', 'worth today', 'G from t']} rows={rows} />}
    >
      <div className={s.grid2} data-return={r.options.map((o) => o.total.toFixed(3)).join(',')}>
        {r.options.map((o) => (
          <Bars key={o.label} o={o} scale={scale} />
        ))}
      </div>
    </VizFrame>
  );
}
