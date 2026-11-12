import { type AgreementResult, type AgreementState, type Kind } from '@/lib/dataops/agreement';
import { pyFixed } from '@/lib/practice/pyFormat';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './DataOps.module.css';

const KIND: Record<Kind, string> = {
  T: 'insult',
  O: 'fine',
  P: 'profanity, no target',
  S: 'sarcasm at a person',
  Q: 'quoting to report',
};
const word = (x: number) => (x ? 'toxic' : 'fine');

/**
 * Two annotators' labels side by side, their 2 × 2 agreement matrix, and observed agreement next to Cohen's
 * kappa. Use inside an agreementExperiment.
 */
export function AgreementView() {
  const { result: r } = useExperimentContext<AgreementState, AgreementResult>('AgreementView');
  const [[f0, f1], [t0, t1]] = r.matrix;
  const bars: [string, number, string][] = [
    ['observed agreement', r.po, 'po'],
    ['Cohen’s kappa', Math.max(0, r.kappa), 'kappa'],
  ];
  return (
    <VizFrame
      title="Two annotators, twenty comments"
      badge={<span className={t.legend}>Scripted annotators</span>}
      caption={
        <>
          They disagree on {f1 + t0} of {r.items.length} comments, so observed agreement is {pyFixed(r.po, 2)}.
          Labeling at random with the same rates would agree {pyFixed(r.pe, 3)} of the time, which leaves
          kappa = {pyFixed(r.kappa, 2)}.
        </>
      }
    >
      <div className={t.wrap}>
        <div className={t.two}>
          <table className={t.table} data-agreement-matrix>
            <caption>Agreement matrix (counts)</caption>
            <thead>
              <tr>
                <th scope="col">A ↓ / B →</th>
                <th scope="col" className={t.num}>
                  fine
                </th>
                <th scope="col" className={t.num}>
                  toxic
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">fine</th>
                <td className={cx(t.num, t.ok)}>{f0}</td>
                <td className={cx(t.num, f1 > 0 && t.err)}>{f1}</td>
              </tr>
              <tr>
                <th scope="row">toxic</th>
                <td className={cx(t.num, t0 > 0 && t.err)}>{t0}</td>
                <td className={cx(t.num, t.ok)}>{t1}</td>
              </tr>
            </tbody>
          </table>
          <ul className={s.bars} aria-label="Agreement compared with kappa">
            {bars.map(([label, v, id]) => (
              <li key={id} className={s.barRow} data-stat={id} data-value={pyFixed(id === 'po' ? r.po : r.kappa, 2)}>
                <span>{label}</span>
                <span className={t.barTrack}>
                  <span className={cx(s.barB)} style={{ width: `${v * 100}%` }} />
                </span>
                <span className={t.num}>{pyFixed(id === 'po' ? r.po : r.kappa, 2)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={t.scroll} tabIndex={0} role="region" aria-label="Labels per comment">
          <table className={t.table} data-agreement-items>
            <caption>Labels per comment (disagreements marked ✗)</caption>
            <thead>
              <tr>
                <th scope="col">Comment</th>
                <th scope="col">Kind</th>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">Agree</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((it, i) => {
                const agree = r.a[i] === r.b[i];
                return (
                  <tr key={it.text} data-item={i} data-agree={agree} className={cx(!agree && t.hl)}>
                    <td className={s.wrapText}>{it.text}</td>
                    <td>{KIND[it.kind]}</td>
                    <td>{word(r.a[i]!)}</td>
                    <td>{word(r.b[i]!)}</td>
                    <td className={agree ? t.ok : t.err}>{agree ? '✓' : '✗'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </VizFrame>
  );
}
