import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { DEMO_HEX, type GgufField, type GgufState } from '@/lib/deploy/gguf';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import a from '../AiTrack/AiTrack.module.css';
import s from './DeployTrack.module.css';

const ROW = 16;
const BYTES = DEMO_HEX.match(/../g)!;

/** The 352 bytes of demo.gguf, 16 per row, with the selected part highlighted. */
export function GgufHex() {
  const { state, result } = useExperimentContext<GgufState, GgufField[]>('GgufHex');
  const f = result.find((x) => x.id === state.part) ?? result[0]!;
  const rows = Array.from({ length: Math.ceil(BYTES.length / ROW) }, (_, r) => r);
  return (
    <VizFrame
      title="demo.gguf, byte by byte"
      badge={<Badge tone="outline">Real file</Badge>}
      caption={`${f.label}: bytes ${f.start} to ${f.end - 1} (${f.end - f.start} bytes). ${f.value}.`}
      table={
        <VizTable
          caption="Every part of the file"
          columns={['bytes', 'part', 'value']}
          rows={result.map((x) => [`${x.start}–${x.end - 1}`, x.label, x.value])}
        />
      }
    >
      <div className={a.pre} tabIndex={0} role="group" aria-label="File bytes in hexadecimal" data-gguf-part={f.id} data-gguf-start={f.start} data-gguf-end={f.end}>
        {rows.map((r) => (
          <div key={r} className={s.hexRow}>
            <span className={a.muted}>{String(r * ROW).padStart(3, '0')}</span>
            <ul className={s.hex}>
              {BYTES.slice(r * ROW, r * ROW + ROW).map((b, i) => {
                const at = r * ROW + i;
                return (
                  <li key={at} className={s.byte} data-on={at >= f.start && at < f.end ? '' : undefined}>
                    {b}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </VizFrame>
  );
}
