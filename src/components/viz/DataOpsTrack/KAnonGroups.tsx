import { type KAnonResult, type KAnonState } from '@/lib/dataops/kAnonymity';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';

/**
 * The released table grouped by generalized quasi-identifiers: each group's size and diagnoses, with unique rows
 * and single-diagnosis groups marked, and the attacker's target group highlighted. Use inside a kAnonExperiment.
 */
export function KAnonGroups() {
  const { result: r } = useExperimentContext<KAnonState, KAnonResult>('KAnonGroups');
  const targetId = r.targetKey.join('|');
  return (
    <VizFrame
      title="The released table, grouped by quasi-identifiers"
      caption={
        <>
          {r.groups.length} groups; the smallest has {r.k} row{r.k === 1 ? '' : 's'} (k = {r.k}) and the least
          varied has {r.l} distinct diagnosis{r.l === 1 ? '' : 'es'} (l = {r.l}). Lena’s group (highlighted) has{' '}
          {r.targetMatches} row{r.targetMatches === 1 ? '' : 's'} with diagnoses {r.targetDiagnoses.join(', ')}.
        </>
      }
    >
      <div className={t.scroll} tabIndex={0} role="region" aria-label="Groups of the released table">
        <table className={t.table} data-kanon-groups data-k={r.k} data-l={r.l}>
          <caption>One row per group of identical (age, postcode, sex)</caption>
          <thead>
            <tr>
              <th scope="col">Age</th>
              <th scope="col">Postcode</th>
              <th scope="col">Sex</th>
              <th scope="col" className={t.num}>
                Rows
              </th>
              <th scope="col">Diagnoses</th>
              <th scope="col">Risk</th>
            </tr>
          </thead>
          <tbody>
            {r.groups.map((g) => {
              const id = g.key.join('|');
              const distinct = new Set(g.diagnoses).size;
              const risk =
                g.rows.length === 1 ? 'unique row' : distinct === 1 ? 'same diagnosis' : 'ok';
              return (
                <tr key={id} className={cx(id === targetId && t.hl)} data-group={id} data-risk={risk}>
                  <td>{g.key[0]}</td>
                  <td>{g.key[1]}</td>
                  <td>{g.key[2]}</td>
                  <td className={t.num}>{g.rows.length}</td>
                  <td>{g.diagnoses.join(', ')}</td>
                  <td className={risk === 'ok' ? t.ok : risk === 'unique row' ? t.err : t.warn}>
                    {risk === 'ok' ? '✓ ok' : `✗ ${risk}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </VizFrame>
  );
}
