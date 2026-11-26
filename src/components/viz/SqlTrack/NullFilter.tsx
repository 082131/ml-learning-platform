import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { tvLabel, type NullFilterResult } from '@/lib/sql/nulls';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

/** Each customer, the value of the WHERE test for their row, and whether WHERE keeps the row. */
export function NullFilter() {
  const { result: r } = useExperimentContext<{ condition: string }, NullFilterResult>('NullFilter');
  const rows = r.rows.map((x) => [x.name, x.city ?? 'NULL', tvLabel(x.value), x.kept ? 'kept' : 'dropped']);
  return (
    <VizFrame
      title="What WHERE does with each row"
      caption={`WHERE ${r.sql} keeps ${r.kept} of ${r.rows.length} customers. ${r.unknown ? `${r.unknown} row${r.unknown === 1 ? ' is' : 's are'} UNKNOWN and dropped as if FALSE.` : 'No row is UNKNOWN.'}`}
      table={<VizTable caption="Condition value per customer" columns={['name', 'city', 'condition', 'WHERE']} rows={rows} />}
    >
      <div className={s.viz} data-kept={r.kept} data-unknown={r.unknown}>
        <p className={s.code}>WHERE {r.sql}</p>
        <div className={s.tableWrap}>
          <table className={s.rows}>
            <thead>
              <tr>
                <th scope="col">name</th>
                <th scope="col">city</th>
                <th scope="col">condition is</th>
                <th scope="col">WHERE</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.name} data-dropped={!x.kept || undefined}>
                  <td>{x.name}</td>
                  <td className={x.city === null ? s.nullCell : undefined}>{x.city ?? 'NULL'}</td>
                  <td>
                    <span className={s.tv} data-tv={tvLabel(x.value)}>
                      {tvLabel(x.value)}
                    </span>
                  </td>
                  <td>{x.kept ? 'kept' : 'dropped'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VizFrame>
  );
}
