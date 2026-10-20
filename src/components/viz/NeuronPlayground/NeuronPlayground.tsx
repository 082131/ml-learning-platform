import { ACTIVATIONS } from '@/lib/deep/activations';
import { describeA, describeZ, type NeuronResult, type NeuronState } from '@/lib/deep/neuron';
import { formatNumber as n } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { cx } from '@/components/ui';
import { LineChart, type XY } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './NeuronPlayground.module.css';

/** The activation plot shows z in this range; values outside it are named in the caption. */
const Z_RANGE = 6;
const SAMPLES = 120;
/** Line width per unit of |w|, so a bigger weight is a thicker line (and negative weights are dashed). */
const WIDTH_PER_UNIT = 1.4;

/**
 * One neuron: inputs, weighted edges and bias into a sum z, then the activation a = f(z).
 * Beside it, the activation function with the current z marked. Use with neuronExperiment.
 */
export function NeuronPlayground() {
  const { state, result } = useExperimentContext<NeuronState, NeuronResult>('NeuronPlayground');
  const act = ACTIVATIONS[state.act];
  const curve: XY[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const z = -Z_RANGE + (2 * Z_RANGE * i) / SAMPLES;
    return [z, act.f(z)];
  });
  const inRange = Math.abs(result.z) <= Z_RANGE;
  const yDomain: [number, number] =
    state.act === 'sigmoid' ? [0, 1] : state.act === 'tanh' ? [-1, 1] : [-Z_RANGE, Z_RANGE];

  return (
    <div className={s.layout} data-neuron-z={n(result.z)} data-neuron-a={n(result.a)}>
      <VizFrame
        title="One neuron"
        table={
          <VizTable
            caption="The neuron's numbers"
            columns={['Quantity', 'Value']}
            rows={[
              ['x[0], x[1]', `${n(state.x[0])}, ${n(state.x[1])}`],
              ['w[0], w[1]', `${n(state.w[0])}, ${n(state.w[1])}`],
              ['b', n(state.b)],
              ['z = w·x + b', n(result.z)],
              [`a = ${act.label}(z)`, n(result.a)],
            ]}
          />
        }
        caption="Thicker lines are larger weights; dashed lines are negative weights."
      >
        <NeuronDiagram state={state} z={result.z} a={result.a} />
      </VizFrame>
      <LineChart
        title={`Activation: ${act.formula}`}
        xLabel="z"
        yLabel="a = f(z)"
        xDomain={[-Z_RANGE, Z_RANGE]}
        yDomain={yDomain}
        height={220}
        series={[{ id: 'f', label: act.label, points: curve, inTable: false }]}
        overlay={(x, y) =>
          inRange ? (
            <g className={svg.err} aria-hidden="true">
              <line
                x1={x(result.z)}
                x2={x(result.z)}
                y1={y(yDomain[0])}
                y2={y(result.a)}
                className={svg.dashed}
                strokeWidth={1.5}
              />
              <circle cx={x(result.z)} cy={y(result.a)} r={6} fill="none" strokeWidth={2.5} />
            </g>
          ) : null
        }
        caption={
          inRange
            ? `The circle marks the current z = ${n(result.z)}, where a = ${n(result.a)}.`
            : `z = ${n(result.z)} is outside the plotted range; a = ${n(result.a)}.`
        }
      />
      <p className={s.arithmetic} aria-live="polite" data-neuron-arithmetic>
        <span className={s.label}>The arithmetic</span>
        <span className={s.math}>{describeZ(state)}</span>
        <span className={s.math}>{describeA(state.act, result.z)}</span>
      </p>
    </div>
  );
}

function NeuronDiagram({ state, z, a }: { state: NeuronState; z: number; a: number }) {
  const inputs = [
    { y: 40, x: state.x[0], w: state.w[0], i: 0 },
    { y: 140, x: state.x[1], w: state.w[1], i: 1 },
  ];
  const sum = { x: 220, y: 90 };
  return (
    <svg
      viewBox="0 0 420 180"
      className={s.diagram}
      role="img"
      aria-label={`Neuron: inputs ${n(state.x[0])} and ${n(state.x[1])}, z = ${n(z)}, a = ${n(a)}`}
    >
      {inputs.map((inp) => (
        <g key={inp.i}>
          <line
            x1={58}
            y1={inp.y}
            x2={sum.x - 26}
            y2={sum.y + (inp.y - sum.y) * 0.2}
            className={cx(svg.muted, inp.w < 0 && svg.dashed)}
            strokeWidth={0.75 + Math.abs(inp.w) * WIDTH_PER_UNIT}
          />
          <text x={86} y={inp.i === 0 ? 34 : 164} className={svg.label}>
            w[{inp.i}] = {n(inp.w)}
          </text>
          <circle cx={36} cy={inp.y} r={22} className={s.node} />
          <text x={36} y={inp.y - 28} textAnchor="middle" className={svg.tick}>
            x[{inp.i}]
          </text>
          <text x={36} y={inp.y + 4} textAnchor="middle" className={svg.label}>
            {n(inp.x)}
          </text>
        </g>
      ))}
      <line x1={sum.x} y1={10} x2={sum.x} y2={sum.y - 26} className={svg.muted} strokeWidth={1.5} />
      <text x={sum.x + 8} y={20} className={svg.label}>
        b = {n(state.b)}
      </text>
      <circle cx={sum.x} cy={sum.y} r={26} className={s.node} />
      <text x={sum.x} y={sum.y - 4} textAnchor="middle" className={svg.tick}>
        z = Σ
      </text>
      <text x={sum.x} y={sum.y + 12} textAnchor="middle" className={svg.label}>
        {n(z)}
      </text>
      <line x1={sum.x + 26} y1={sum.y} x2={330} y2={sum.y} className={svg.muted} strokeWidth={1.5} />
      <text x={280} y={sum.y - 8} textAnchor="middle" className={svg.tick}>
        f
      </text>
      <circle cx={362} cy={sum.y} r={30} className={cx(s.node, s.output)} />
      <text x={362} y={sum.y - 4} textAnchor="middle" className={svg.tick}>
        a
      </text>
      <text x={362} y={sum.y + 12} textAnchor="middle" className={svg.label}>
        {n(a)}
      </text>
    </svg>
  );
}
