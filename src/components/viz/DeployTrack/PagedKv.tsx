import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyFixed } from '@/lib/inference/format';
import { REQUESTS, type PagedResult, type PagedState } from '@/lib/deploy/pagedKv';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import a from '../AiTrack/AiTrack.module.css';

const pct = (v: number, of: number) => `${of ? Math.min(100, (v / of) * 100) : 0}%`;

function Bar({ label, v, of, text }: { label: string; v: number; of: number; text: string }) {
  return (
    <div style={{ display: 'contents' }}>
      <span>{label}</span>
      <span className={a.track} aria-hidden="true">
        <span className={a.fill} style={{ width: pct(v, of) }} />
      </span>
      <span>{text}</span>
    </div>
  );
}

/** Sequences that fit with each allocation scheme, and what the first four sequences reserve. */
export function PagedKvView() {
  const { state: s, result: r } = useExperimentContext<PagedState, PagedResult>('PagedKvView');
  return (
    <VizFrame
      title="KV cache: reserved per sequence or allocated in blocks"
      badge={<Badge tone="simulated">Allocation model</Badge>}
      caption={`${s.budget} GiB of KV memory, max_model_len ${s.maxLen}, block_size ${s.block}. Contiguous: ${r.contiguous} sequences, ${pyFixed(r.contiguousUse * 100, 1)}% of the reserved memory holds tokens. Paged: ${r.paged} of ${REQUESTS} sequences, ${pyFixed(r.pagedUse * 100, 1)}% used.`}
      table={
        <VizTable
          caption="First four sequences"
          columns={['sequence', 'tokens', 'contiguous reserve', 'paged blocks', 'paged tokens of space']}
          rows={r.sample.map((x, i) => [i, x.tokens, s.maxLen, x.blocks, x.blocks * s.block])}
        />
      }
    >
      <section
        className={a.panel}
        aria-label="Sequences that fit"
        data-paged={r.paged}
        data-contiguous={r.contiguous}
      >
        <h4 className={a.panelTitle}>Sequences running at once (of {REQUESTS})</h4>
        <div className={a.bars}>
          <Bar label="contiguous" v={r.contiguous} of={REQUESTS} text={String(r.contiguous)} />
          <Bar label="paged" v={r.paged} of={REQUESTS} text={String(r.paged)} />
        </div>
      </section>
      <section className={a.panel} aria-label="Memory per sequence">
        <h4 className={a.panelTitle}>Space taken by the first four sequences (bar = max_model_len)</h4>
        <div className={a.bars}>
          {r.sample.flatMap((x, i) => [
            <Bar
              key={`c${i}`}
              label={`#${i} contiguous`}
              v={s.maxLen}
              of={s.maxLen}
              text={`${s.maxLen} for ${x.tokens}`}
            />,
            <Bar
              key={`p${i}`}
              label={`#${i} paged`}
              v={x.blocks * s.block}
              of={s.maxLen}
              text={`${x.blocks * s.block} for ${x.tokens}`}
            />,
          ])}
        </div>
      </section>
    </VizFrame>
  );
}
