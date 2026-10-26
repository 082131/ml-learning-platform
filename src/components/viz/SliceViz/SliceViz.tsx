import { LETTERS, sliceText, type SliceResult, type SliceState } from '@/lib/foundations/slicing';
import { repr } from '@/lib/foundations/pyValues';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { cx } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SliceViz.module.css';

const n = LETTERS.length;
const EVERY: Record<number, string> = { 1: 'every item', 2: 'every 2nd item', 3: 'every 3rd item' };

/**
 * The list with both index systems (0 to 7 above, −8 to −1 below). Picked items are marked with the
 * order the slice visits them in, so a negative step reads right to left. Use inside sliceExperiment.
 */
export function SliceViz() {
  const { state, result } = useExperimentContext<SliceState, SliceResult>('SliceViz');
  const [start, stop, step] = result.indices;
  const order = new Map(result.picked.map((p, k) => [p, k + 1]));
  const expr = `letters[${sliceText(state.start, state.stop, state.step)}]`;

  return (
    <VizFrame
      title="Slicing a list"
      table={
        <VizTable
          caption="Every position of letters"
          columns={['Position', 'Negative position', 'Item', 'Picked (order)']}
          rows={LETTERS.map((l, i) => [i, i - n, l, order.has(i) ? `yes (${order.get(i)})` : 'no'])}
        />
      }
      caption={`${expr}: Python fills in and clips the bounds to start ${start}, stop ${stop}, step ${step}, then takes positions ${result.picked.join(', ') || '(none)'}. Stop is never included.`}
    >
      <div className={s.wrap}>
        <ol className={s.row} aria-label="letters, position by position">
          {LETTERS.map((l, i) => {
            const k = order.get(i);
            return (
              <li
                key={l}
                className={cx(s.cell, k !== undefined && s.picked)}
                data-position={i}
                data-picked={k ?? undefined}
              >
                <span className={s.index}>{i}</span>
                <span className={s.item}>{repr(l)}</span>
                <span className={s.index}>{i - n}</span>
                <span className={s.order}>{k ? `${k}${['st', 'nd', 'rd'][k - 1] ?? 'th'}` : ''}</span>
              </li>
            );
          })}
        </ol>
        <p className={s.result} aria-live="polite" data-slice-result>
          <span className={s.lhs}>{expr}</span> = {repr(result.items)}
          <span className={s.lhs}>
            {' '}
            · {step > 0 ? 'left to right' : 'right to left'},{' '}
            {EVERY[Math.abs(step)] ?? `every ${Math.abs(step)}th item`}
          </span>
        </p>
      </div>
    </VizFrame>
  );
}
