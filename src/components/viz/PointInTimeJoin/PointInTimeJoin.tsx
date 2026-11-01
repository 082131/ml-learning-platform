import { LATEST_RUN, ORDERS, pointInTime, type PointResult, type PointState } from '@/lib/data/pointInTime';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './PointInTimeJoin.module.css';

const SPAN = LATEST_RUN + 1;
/** Day d runs from d - 1 to d on the axis; the start of day d is d - 1 and its end is d. */
const pct = (x: number) => `${(Math.max(0, Math.min(SPAN, x)) / SPAN) * 100}%`;

/**
 * One timeline per training example: the customer's orders, the moment of prediction, the snapshot the join
 * picked and the window it counted. Use inside an Experiment made with pointExperiment.
 */
export function PointInTimeJoin() {
  const { state, result } = useExperimentContext<PointState, PointResult>('PointInTimeJoin');
  const correct = pointInTime({ ...state, join: 'as-of' });
  return (
    <VizFrame
      title="Which snapshot each training row gets"
      table={
        <VizTable
          caption="Training rows"
          columns={[
            'Customer',
            'Predict at start of day',
            'Snapshot from end of day',
            'Feature',
            'At prediction time',
            'Label',
          ]}
          rows={result.rows.map((r) => [r.customer, r.day, r.snap, r.value, r.correct, r.label])}
        />
      }
      caption={
        <>
          Each row is one training example. The line marks the moment of prediction (the start of the day),
          the shaded band is the {state.window}-day window the chosen snapshot counted, and filled dots are
          orders it counted. {result.leaks} of {result.rows.length} rows got a value the model could not have
          known; the as-of join gets {correct.leaks}.
        </>
      }
    >
      <ol className={s.rows} data-point-rows>
        {result.rows.map((r) => {
          const winStart = r.snap - state.window;
          return (
            <li
              key={`${r.customer}${r.day}`}
              className={s.row}
              data-example={`${r.customer}-${r.day}`}
              data-leak={r.leak}
            >
              <span className={s.name}>
                {r.customer}, day {r.day}
              </span>
              <span className={s.track} aria-hidden="true">
                <span
                  className={cx(s.window, r.leak && s.leakWindow)}
                  style={{ left: pct(winStart), width: pct(r.snap - winStart) }}
                />
                <span
                  className={s.now}
                  style={{ left: pct(r.day - 1) }}
                  title={`prediction at the start of day ${r.day}`}
                />
                {ORDERS[r.customer]!.map((d) => {
                  const counted = winStart < d && d <= r.snap;
                  return (
                    <span
                      key={d}
                      className={cx(s.order, counted && s.counted, d >= r.day && s.future)}
                      style={{ left: pct(d - 0.5) }}
                      title={`order on day ${d}${counted ? ', counted' : ''}${d >= r.day ? ', after the prediction' : ''}`}
                    />
                  );
                })}
              </span>
              <span className={cx(s.value, r.leak && s.bad)} data-value={r.value}>
                {r.value}
                {r.leak && <small> (was {r.correct})</small>}
              </span>
              <span className="visually-hidden">
                {`Prediction at the start of day ${r.day}; the snapshot from the end of day ${r.snap} counts ${r.value} orders` +
                  (r.leak
                    ? `, but at prediction time the value was ${r.correct}: a leak.`
                    : ', which matches prediction time.')}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={s.axis} aria-hidden="true">
        <span>day 0</span>
        <span>day {Math.round(SPAN / 2)}</span>
        <span>day {SPAN}</span>
      </div>
      <p className={s.legend}>
        <span className={cx(s.key, s.counted)} /> counted order <span className={s.key} /> other order{' '}
        <span className={cx(s.key, s.future)} /> order after the prediction <span className={s.keyLine} />{' '}
        prediction
      </p>
    </VizFrame>
  );
}
