import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { duration } from '@/lib/cloud/availability';
import { TRANSFER_PRICE, type LoadInput, type LoadResult, type TransferInput, type TransferResult } from '@/lib/cloud/dataload';
import { num, usd } from '@/lib/cloud/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars } from './Bars';
import s from './CloudTrack.module.css';

/** One request split into waiting and transferring, and the loader's throughput against what the GPUs need. */
export function LoadView() {
  const { state: x, result: r } = useExperimentContext<LoadInput, LoadResult>('LoadView');
  const wait = x.latencyMs / 1000;
  const waitShare = wait / r.requestSeconds;
  return (
    <VizFrame
      title="Feeding the GPUs from object storage"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`Each request spends ${Math.round(waitShare * 100)}% of its ${num(r.requestSeconds * 1000, 1)} ms waiting for the first byte. ${x.parallel} parallel requests deliver ${num(r.throughputMbps, 0)} MB/s against the ${x.needMbps} MB/s the GPUs need, so they are busy ${Math.round(r.gpuBusy * 100)}% of the time.`}
      table={
        <VizTable
          caption="Loader"
          columns={['quantity', 'value']}
          rows={[
            ['objects', r.files.toLocaleString('en-US')],
            ['one request', `${num(r.requestSeconds * 1000, 2)} ms`],
            ['throughput', `${num(r.throughputMbps, 0)} MB/s`],
            ['limited by', r.limitedBy],
            ['epoch', duration(r.epochHours)],
            ['GET requests per second', num(r.requestsPerSecond, 0)],
          ]}
        />
      }
    >
      <div className={s.grid2} data-limited={r.limitedBy} data-busy={Math.round(r.gpuBusy * 100)}>
        <section className={s.panel} aria-label="One request">
          <h4 className={s.panelHead}>One request ({num(r.requestSeconds * 1000, 1)} ms)</h4>
          <div className={s.track} aria-hidden="true">
            <span className={s.mark} data-tone="warn" style={{ left: 0, width: `${waitShare * 100}%` }} />
            <span className={s.mark} data-tone="ok" style={{ left: `${waitShare * 100}%`, width: `${(1 - waitShare) * 100}%` }} />
          </div>
          <ul className={s.legend}>
            <li>
              <span className={s.swatch} data-tone="warn" />
              waiting for the first byte ({x.latencyMs} ms)
            </li>
            <li>
              <span className={s.swatch} data-tone="ok" />
              transferring {x.fileMb} MB ({num((x.fileMb / x.streamMbps) * 1000, 2)} ms)
            </li>
          </ul>
        </section>
        <section className={s.panel} aria-label="Throughput">
          <h4 className={s.panelHead}>MB/s delivered vs needed</h4>
          <Bars
            label="Throughput"
            items={[
              { key: 'loader', label: 'Loader delivers', value: r.throughputMbps, text: `${num(r.throughputMbps, 0)} MB/s`, tone: r.gpuBusy < 1 ? 'err' : 'ok' },
              { key: 'need', label: 'GPUs need', value: x.needMbps, text: `${x.needMbps} MB/s`, tone: 'muted' },
            ]}
          />
          <p className={s.muted}>
            {r.requestsPerSecond > 5500 ? `${num(r.requestsPerSecond, 0)} GET/s: spread objects over at least ${r.prefixesNeeded} prefixes.` : `${num(r.requestsPerSecond, 0)} GET/s, within one prefix's 5,500 GET/s.`}
          </p>
        </section>
      </div>
    </VizFrame>
  );
}

/** Monthly transfer cost and time for each placement, with the current choice marked. */
export function TransferView() {
  const { state: x, result: r } = useExperimentContext<TransferInput, TransferResult>('TransferView');
  return (
    <VizFrame
      title="Where should the data live?"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`${num(r.movedGb, 0)} GB cross a priced boundary each month at $${TRANSFER_PRICE[x.placement]}/GB: ${usd(r.cost)}. Moving and reading the data takes ${num(r.hours)} hours a month${x.cache ? ', most of it from the fast local copy' : ''}.`}
      table={
        <VizTable
          caption="This month"
          columns={['quantity', 'value']}
          rows={[
            ['GB moved', num(r.movedGb, 0)],
            ['price per GB', `$${TRANSFER_PRICE[x.placement]}`],
            ['cost', usd(r.cost)],
            ['hours per full read', num(r.hoursPerRead, 2)],
          ]}
        />
      }
    >
      <div data-cost={Math.round(r.cost)}>
        <Bars
          label="Data moved per month"
          max={x.datasetGb * x.readsPerMonth}
          items={[
            { key: 'reads', label: 'Data the job reads', value: x.datasetGb * x.readsPerMonth, text: `${num(x.datasetGb * x.readsPerMonth, 0)} GB`, tone: 'muted' },
            { key: 'moved', label: 'Data you pay to move', value: r.movedGb * (TRANSFER_PRICE[x.placement] > 0 ? 1 : 0), text: `${num(TRANSFER_PRICE[x.placement] > 0 ? r.movedGb : 0, 0)} GB`, tone: r.cost > 0 ? 'err' : 'ok' },
          ]}
        />
        <p className={s.big}>{usd(r.cost)} / month</p>
        <p className={s.muted}>Prices: same region $0, between regions $0.02/GB, out to the internet $0.09/GB (AWS, US East). Inside one region, traffic between zones also costs about $0.01/GB each way.</p>
      </div>
    </VizFrame>
  );
}
