import { UNK } from '@/lib/deep/bpe';
import type { BpeResult, BpeState } from '@/lib/deep/bpeExperiment';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './Bpe.module.css';

/**
 * The trained vocabulary with token IDs, and the text split into tokens. Characters the corpus never
 * contained fall back to [UNK]. Use inside an Experiment made with bpeExperiment.
 */
export function BpeTokens() {
  const { state, result } = useExperimentContext<BpeState, BpeResult>('BpeTokens');
  const { vocab, base } = result.model;
  const { tokens } = result;
  const unknown = tokens.filter((t) => t.unknown);
  const kind = (i: number) => (i === 0 ? 'fallback' : i <= base.length ? 'character' : 'merged');

  return (
    <VizFrame
      title="Vocabulary and tokens"
      table={
        <VizTable
          caption="The vocabulary"
          columns={['ID', 'Token', 'Kind']}
          rows={vocab.map((t, i) => [i, t, kind(i)])}
        />
      }
      caption={`“${state.text}” becomes ${tokens.length} tokens: IDs [${tokens.map((t) => t.id).join(', ')}].${
        unknown.length ? ` ${unknown.map((t) => `“${t.source}”`).join(', ')} became ${UNK} (ID 0).` : ''
      }`}
    >
      <section className={s.section} aria-label="Tokenized text">
        <h3 className={s.heading}>Tokenized text</h3>
        <ol className={s.chips} data-tokens>
          {tokens.map((t, i) => (
            <li
              key={i}
              className={cx(s.chip, t.unknown && s.unknown)}
              aria-label={t.unknown ? `${UNK}, ID 0, replaces ${t.source}` : `${t.token}, ID ${t.id}`}
            >
              <span>{t.unknown ? `${UNK} ← ${t.source}` : t.token}</span>
              <span className={s.id}>{t.id}</span>
            </li>
          ))}
          {tokens.length === 0 && <li className={s.note}>The text is empty.</li>}
        </ol>
      </section>
      <section className={s.section} aria-label="Vocabulary">
        <h3 className={s.heading}>
          Vocabulary: {vocab.length} tokens ({base.length} characters, {vocab.length - 1 - base.length} merged)
        </h3>
        <ol className={s.chips} data-vocab>
          {vocab.map((t, i) => (
            <li
              key={t}
              className={cx(s.chip, i > base.length && s.new)}
              aria-label={`ID ${i}: ${t}, ${kind(i)}`}
            >
              <span>{t}</span>
              <span className={s.id}>{i}</span>
            </li>
          ))}
        </ol>
        <p className={s.note}>
          ID 0 is the fallback {UNK}; IDs 1 to {base.length} are single characters; bold tokens with IDs above{' '}
          {base.length} were learned by merges.
        </p>
      </section>
    </VizFrame>
  );
}
