import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyThousands as n } from '@/lib/inference/format';
import { EXPECTED, type CheckpointState, type CheckResult } from '@/lib/inference/safetensors';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FileLayout.module.css';

/** A safetensors file drawn byte range by byte range, and the result of loading it into the model. */
export function FileLayout() {
  const { result: r } = useExperimentContext<CheckpointState, CheckResult>('FileLayout');
  const l = r.layout;
  const segments = [
    { key: 'len', label: 'length', bytes: 8, kind: 'meta' },
    { key: 'header', label: 'JSON header', bytes: l.headerLen, kind: 'header' },
    ...l.entries.map((e) => ({ key: e.name, label: e.name, bytes: e.end - e.start, kind: 'data' })),
  ];
  const present = new Map(l.entries.map((e) => [e.name, e.shape]));
  return (
    <div className={s.layout} data-file-bytes={l.fileBytes} data-load-ok={r.ok}>
      <VizFrame
        title="model.safetensors, byte by byte"
        badge={<Badge tone="neutral">Computed in your browser</Badge>}
        caption={`${n(l.fileBytes)} bytes: an 8-byte header length (${l.headerLen}), the JSON header${l.padding ? ` with ${l.padding} space${l.padding === 1 ? '' : 's'} of padding` : ''}, then ${n(l.dataBytes)} bytes of raw values. A loader reads the first ${8 + l.headerLen} bytes and knows where every tensor is.`}
        table={
          <VizTable
            caption="Byte ranges"
            columns={['Part', 'dtype', 'shape', 'bytes', 'offset in data']}
            rows={[
              ['header length', 'u64', '—', 8, '—'],
              ['JSON header', '—', '—', l.headerLen, '—'],
              ...l.entries.map((e) => [e.name, e.dtype, `[${e.shape.join(', ')}]`, e.end - e.start, `${e.start}–${e.end}`]),
            ]}
          />
        }
      >
        <ol className={s.bytes} aria-label="Byte layout">
          {segments.map((g) => (
            <li key={g.key} data-kind={g.kind} style={{ flexGrow: g.bytes }}>
              <span className={s.segLabel}>{g.label}</span>
              <span className={s.segBytes}>{n(g.bytes)} B</span>
            </li>
          ))}
        </ol>
        <pre className={s.json} tabIndex={0} aria-label="The JSON header">
          {l.headerJson}
        </pre>
      </VizFrame>
      <VizFrame
        title="Loading it into the 64 → 16 → 10 model"
        caption={r.ok ? 'Every expected name is present with the expected shape.' : 'Strict loading refuses this file: fix the names or the model definition before serving.'}
      >
        <ul className={s.checks}>
          {EXPECTED.map(([k, shape]) => {
            const got = present.get(k);
            const status = !got ? 'missing' : got.join() !== shape.join() ? 'shape' : 'ok';
            return (
              <li key={k} data-status={status}>
                <span aria-hidden="true">{status === 'ok' ? '✓' : '✗'}</span> <code>{k}</code>{' '}
                {status === 'ok'
                  ? `[${shape.join(', ')}]`
                  : status === 'missing'
                    ? 'missing from the file'
                    : `expected [${shape.join(', ')}], file has [${got!.join(', ')}]`}
              </li>
            );
          })}
          {r.unexpected.map((k) => (
            <li key={k} data-status="unexpected">
              <span aria-hidden="true">✗</span> <code>{k}</code> unexpected: the model has no such parameter
            </li>
          ))}
        </ul>
      </VizFrame>
    </div>
  );
}
