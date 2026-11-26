import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { CONTAM_N, TEST_DOCS, TRAIN_DOCS, type DedupState, type DedupView as DedupResultView, type MaskResult, type MaskState, type PackState } from '@/lib/finetune/experiments';
import type { PackResult } from '@/lib/finetune/template';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FinetuneTrack.module.css';

/** The rendered chat template as tokens; tokens in the loss are underlined and outlined. */
export function MaskView() {
  const { state, result: r } = useExperimentContext<MaskState, MaskResult>('MaskView');
  return (
    <VizFrame
      title="What the model is trained to predict"
      caption={`${r.summary.trained} of ${r.summary.total} tokens are in the loss; the other ${r.summary.masked} get the label −100 and are only context.`}
      table={<VizTable caption="Tokens and labels" columns={['#', 'token', 'in the loss?']} rows={r.toks.map((t, i) => [i, t.text === '\n' ? '\\n' : t.text, t.trained ? 'yes' : 'no (−100)'])} />}
    >
      <ul className={s.tokens} data-trained={r.summary.trained} data-mode={state.mode}>
        {r.toks.map((t, i) =>
          t.text === '\n' ? (
            <li key={i} className={s.tok} data-nl="true" data-trained={t.trained} aria-hidden="true" />
          ) : (
            <li key={i} className={s.tok} data-trained={t.trained} data-special={t.special}>
              {t.text}
            </li>
          ),
        )}
      </ul>
      <ul className={s.legend}>
        <li>
          <span className={s.tok} data-trained="true">
            word
          </span>{' '}
          in the loss
        </li>
        <li>
          <span className={s.tok}>word</span> context only (−100)
        </li>
      </ul>
    </VizFrame>
  );
}

/** Rows of a batch: each sequence as a segment, padding as the striped background. */
export function PackView() {
  const { state, result: r } = useExperimentContext<PackState, PackResult>('PackView');
  return (
    <VizFrame
      title={r.strategy === 'pad' ? 'One example per row' : 'Packed rows'}
      caption={`${r.blocks.length} rows of ${state.maxLen.toLocaleString('en-US')} tokens hold ${r.realTokens.toLocaleString('en-US')} real tokens: ${(r.efficiency * 100).toFixed(1)}% of the compute is spent on real tokens.${r.truncated ? ` ${r.truncated.toLocaleString('en-US')} tokens were cut off.` : ''}`}
      table={<VizTable caption="Rows" columns={['row', 'sequences (tokens)', 'used', 'padding']} rows={r.blocks.map((b, i) => [i + 1, b.items.map((x) => x.length).join(' + '), b.used, state.maxLen - b.used])} />}
    >
      <ol className={s.blocks} data-rows={r.blocks.length} data-efficiency={r.efficiency.toFixed(3)}>
        {r.blocks.map((b, i) => (
          <li key={i} className={s.block} aria-label={`row ${i + 1}: ${b.used} of ${state.maxLen} tokens used`}>
            {b.items.map((x) => (
              <span key={x.id} className={s.seg} style={{ width: `${(x.length / state.maxLen) * 100}%` }}>
                {x.length >= 120 ? x.length : ''}
              </span>
            ))}
          </li>
        ))}
      </ol>
      <p className={s.muted}>Solid segments are examples (labelled with their length); the striped remainder of a row is padding.</p>
    </VizFrame>
  );
}

const short = (t: string) => (t.length > 46 ? `${t.slice(0, 44)}…` : t);

/** Pairwise similarity of the training examples, the clusters removed, and the test items that leak. */
export function DedupView() {
  const { state, result: r } = useExperimentContext<DedupState, DedupResultView>('DedupView');
  const top = [...r.pairs].sort((a, b) => b.jaccard - a.jaccard).slice(0, 6);
  return (
    <VizFrame
      title="Near-duplicates and leaks"
      caption={`With ${state.n}-word shingles and a threshold of ${state.threshold}, ${r.flagged.length} pairs are flagged and ${r.removed.length} examples removed. ${r.contaminated.length} of ${TEST_DOCS.length} test items share an ${CONTAM_N}-word run with the training set.`}
      table={<VizTable caption="Most similar pairs" columns={['pair', 'Jaccard', 'MinHash estimate', 'flagged']} rows={top.map((p) => [`#${p.a} and #${p.b}`, p.jaccard.toFixed(2), p.estimate.toFixed(2), p.jaccard >= state.threshold ? 'yes' : 'no'])} />}
    >
      <div className={s.grid2}>
        <section className={s.panel} aria-label="Most similar pairs">
          <h4 className={s.panelHead}>Most similar pairs</h4>
          <ul className={s.bars} data-flagged={r.flagged.length}>
            {top.map((p) => (
              <li key={`${p.a}-${p.b}`} className={s.bar}>
                <span className={s.barLabel}>
                  #{p.a} · #{p.b}
                </span>
                <span className={s.barTrack} aria-hidden="true">
                  <span className={s.barFill} data-tone={p.jaccard >= state.threshold ? 'err' : 'muted'} style={{ width: `${p.jaccard * 100}%` }} />
                  <span className={s.barMarker} style={{ left: `${state.threshold * 100}%` }} />
                </span>
                <span className={s.barValue}>
                  {p.jaccard.toFixed(2)} {p.jaccard >= state.threshold ? 'dup' : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className={s.muted}>Striped: at or above the threshold (dark line).</p>
        </section>
        <section className={s.panel} aria-label="Training examples">
          <h4 className={s.panelHead}>Training examples</h4>
          <ul className={s.list} data-kept={r.kept.length}>
            {TRAIN_DOCS.map((t, i) => (
              <li key={i} className={s.row}>
                <span className={s.muted}>
                  #{i} {short(t)}
                </span>
                <span className={s.tag} data-tone={r.removed.includes(i) ? 'err' : 'ok'}>
                  {r.removed.includes(i) ? 'removed' : 'kept'}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className={s.panel} aria-label="Test set">
          <h4 className={s.panelHead}>Test set</h4>
          <ul className={s.list} data-contaminated={r.contaminated.length}>
            {TEST_DOCS.map((t, i) => (
              <li key={i} className={s.row}>
                <span className={s.muted}>{short(t)}</span>
                <span className={s.tag} data-tone={r.contaminated.includes(i) ? 'err' : 'ok'}>
                  {r.contaminated.includes(i) ? 'leaked' : 'clean'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </VizFrame>
  );
}
