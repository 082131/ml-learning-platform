import { gradCheckRows, NUMERIC_EPS, type BackpropResult, type BackpropState } from '@/lib/deep/backprop';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { useOverflowFocus } from '@/components/ui';
import { useRef } from 'react';
import s from './GradCheck.module.css';

/** Agreement threshold for the relative error between backprop and the numerical estimate. */
const AGREE = 1e-6;
const sci = (x: number) => x.toExponential(1);

/** Every gradient from backpropagation next to its central-difference estimate, with the relative error. */
export function GradCheck() {
  const { result } = useExperimentContext<BackpropState, BackpropResult>('GradCheck');
  const rows = gradCheckRows(result);
  const ok = result.maxRelError < AGREE;
  const wrap = useRef<HTMLDivElement>(null);
  useOverflowFocus(wrap);
  return (
    <div className={s.wrap} data-grad-check={ok ? 'agree' : 'disagree'} data-wide>
      <div ref={wrap} className={s.scroll}>
        <table className={s.table}>
          <caption>
            Gradient check, ε = {NUMERIC_EPS}: backprop against (L(θ + ε) − L(θ − ε)) / 2ε. Computed in your
            browser.
          </caption>
          <thead>
            <tr>
              <th scope="col">Parameter θ</th>
              <th scope="col">Backprop ∂L/∂θ</th>
              <th scope="col">Numerical</th>
              <th scope="col">Relative error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td>{r.exact.toFixed(8)}</td>
                <td>{r.numeric.toFixed(8)}</td>
                <td>{sci(r.relError)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.verdict} role="status">
        <strong>{ok ? '✓ Agree' : '✗ Disagree'}</strong>: the largest relative error is{' '}
        {sci(result.maxRelError)}
        {ok
          ? `, far below ${AGREE.toExponential(0)}.`
          : `, above ${AGREE.toExponential(0)}: the backward pass has a bug.`}
      </p>
    </div>
  );
}
