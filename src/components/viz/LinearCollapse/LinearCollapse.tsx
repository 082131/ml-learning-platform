import { ACTIVATIONS } from '@/lib/deep/activations';
import {
  collapseCurve,
  COLLAPSE,
  describeCollapse,
  type NeuronResult,
  type NeuronState,
} from '@/lib/deep/neuron';
import { formatNumber as n } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import svg from '../svg/svg.module.css';
import s from './LinearCollapse.module.css';

/**
 * Two layers (2 → 2 → 1) fed the neuron experiment's input x, with the experiment's activation
 * between them, next to the single linear map the two layers become when there is no activation.
 */
export function LinearCollapse() {
  const { state, result } = useExperimentContext<NeuronState, NeuronResult>('LinearCollapse');
  const d = describeCollapse(state.x, state.act);
  const r = result.collapse;
  const curve = collapseCurve(state.x[1], state.act);
  const label = ACTIVATIONS[state.act].label;
  return (
    <div className={s.wrap} data-collapse-same={d.same}>
      <div className={s.weights} aria-label="Fixed weights of the two layers" role="group">
        <MatrixGrid name="W1" values={COLLAPSE.W1} />
        <MatrixGrid name="b1" values={[COLLAPSE.b1]} caption="shape (2,)" />
        <MatrixGrid name="W2" values={COLLAPSE.W2} />
        <MatrixGrid name="b2" values={[COLLAPSE.b2]} caption="shape (1,)" />
      </div>
      <div className={s.paths}>
        <p className={s.path}>
          <span className={s.label}>Two layers, {label} between them</span>
          <span className={s.math}>{d.hidden}</span>
          <span className={s.math}>{d.activated}</span>
          <span className={s.math}>{d.twoLayers}</span>
        </p>
        <p className={s.path}>
          <span className={s.label}>One linear map (the two layers with no activation)</span>
          <span className={s.math}>{d.merged}</span>
          <span className={s.math}>{d.oneLayer}</span>
        </p>
      </div>
      <p className={s.verdict} aria-live="polite" data-collapse-verdict>
        <strong>{d.same ? '= ' : '≠ '}</strong>
        {d.verdict}
      </p>
      <LineChart
        title={`Output y as x[0] moves (x[1] = ${n(state.x[1])})`}
        xLabel="x[0]"
        yLabel="y"
        height={220}
        series={[
          {
            id: 'two',
            label: `Two layers with ${label}`,
            points: curve.map((p) => [p.x1, p.y] as const),
            inTable: false,
          },
          {
            id: 'one',
            label: 'One linear map',
            points: curve.map((p) => [p.x1, p.yLinear] as const),
            tone: 'muted',
            dashed: true,
            inTable: false,
          },
        ]}
        overlay={(x, y) => (
          <g className={svg.err} aria-hidden="true">
            <circle cx={x(state.x[0])} cy={y(r.y)} r={6} fill="none" strokeWidth={2.5} />
          </g>
        )}
        caption={`The circle is the current x[0] = ${n(state.x[0])}, where the two layers give y = ${n(r.y)} and the linear map gives ${n(r.yLinear)}.`}
      />
    </div>
  );
}
