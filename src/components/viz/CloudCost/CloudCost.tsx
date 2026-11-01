import { money, PRICE, SCAN_PRICE, type CostResult, type CostState } from '@/lib/data/cloudCost';
import { Badge, cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';

/**
 * The month-12 bill as line items with their formulas, and storage vs query cost as bars. Use inside an
 * Experiment made with costExperiment.
 */
export function CloudCost() {
  const { state, result: r } = useExperimentContext<CostState, CostResult>('CloudCost');
  const items = [
    {
      key: 'hot',
      label: 'Storage, last 3 months (standard)',
      formula: `${r.hot.toLocaleString('en-US')} GB × $${PRICE.standard}`,
      cost: r.hot * PRICE.standard,
    },
    {
      key: 'cold',
      label: `Storage, older data (${r.coldClass})`,
      formula: `${r.cold.toLocaleString('en-US')} GB × $${PRICE[r.coldClass]}`,
      cost: r.cold * PRICE[r.coldClass],
    },
    {
      key: 'queries',
      label: 'Queries',
      formula: `${state.queries} × 30 × ${r.scannedGb.toLocaleString('en-US', { maximumFractionDigits: 1 })} GB ÷ 1000 × $${SCAN_PRICE}`,
      cost: r.queryCost,
    },
  ];
  const max = Math.max(...items.map((i) => i.cost), 1e-9);
  return (
    <VizFrame
      title="Monthly bill after one year"
      badge={<Badge tone="warn">Estimate</Badge>}
      table={
        <VizTable
          caption="Line items"
          columns={['Item', 'Formula', 'Cost (USD)']}
          rows={items.map((i) => [i.label, i.formula, money(i.cost)])}
        />
      }
      caption={
        <>
          Example prices, not a quote: ${PRICE.standard}, ${PRICE.infrequent} and ${PRICE.archive} per
          GB-month for standard, infrequent and archive storage, ${SCAN_PRICE} per TB scanned. Total $
          {money(r.total)} per month, {((r.queryCost / r.total) * 100 || 0).toFixed(1)}% of it queries.
        </>
      }
    >
      <div className={t.wrap}>
        <div className={t.scroll} tabIndex={0} role="region" aria-label="Cost line items">
          <table className={t.table} data-cost-items>
            <caption>Line items for month 12</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Formula</th>
                <th scope="col" className={t.num}>
                  USD
                </th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.key} data-item={i.key}>
                  <th scope="row">{i.label}</th>
                  <td>{i.formula}</td>
                  <td className={t.num}>{money(i.cost)}</td>
                  <td>
                    <span className={t.barTrack}>
                      <span className={t.bar} style={{ width: `${(i.cost / max) * 100}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                <td />
                <td className={cx(t.num, t.strong)} data-cost-total>
                  {money(r.total)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        {r.archiveConflict && (
          <p className={t.err} role="note">
            ✗ Full-table queries would need the archived months restored first: archive storage is cheap
            because it is not readable on demand.
          </p>
        )}
      </div>
    </VizFrame>
  );
}
