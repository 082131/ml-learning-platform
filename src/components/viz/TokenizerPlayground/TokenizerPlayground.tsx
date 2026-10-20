import type { PieceAttempt } from '@/lib/ai/wordpiece';
import { selectedToken, type TokenizerResult, type TokenizerState } from '@/lib/ai/tokenizerExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { cx } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './TokenizerPlayground.module.css';

/** Groups the greedy search's attempts by the position they started from: one group per piece. */
function byStart(attempts: PieceAttempt[]) {
  const groups = new Map<number, PieceAttempt[]>();
  for (const a of attempts) groups.set(a.start, [...(groups.get(a.start) ?? []), a]);
  return [...groups.entries()];
}

/**
 * Token chips for the experiment's text, with IDs from the real vocabulary. Selecting a token shows
 * how WordPiece split its word. Use inside an Experiment made with tokenizerExperiment.
 */
export function TokenizerPlayground() {
  const { state, result, update } = useExperimentContext<TokenizerState, TokenizerResult>(
    'TokenizerPlayground',
  );
  const { tokens, words } = result.encoding;
  const current = selectedToken(state, result);
  const index = tokens.indexOf(current);

  return (
    <VizFrame
      title="Tokens and token IDs"
      table={
        <VizTable
          caption="Every token with its ID and the word it came from"
          columns={['#', 'Token', 'ID', 'From word']}
          rows={tokens.map((t, i) => [i, t.text, t.id, t.word >= 0 ? words[t.word]! : '(added)'])}
        />
      }
      caption={`${tokens.length} tokens from ${words.length} words and punctuation marks. Select a token to see how its word was split.`}
    >
      <ol className={s.tokens} aria-label="Tokens">
        {tokens.map((t, i) => (
          <li key={i} className={cx(s.item, t.text.startsWith('##') && s.joined)}>
            <button
              type="button"
              className={cx(s.chip, t.special && s.special)}
              aria-pressed={i === index}
              onClick={() => update((st) => ({ ...st, selected: i }))}
            >
              <span className="visually-hidden">Token {i}: </span>
              <span className={s.text}>{t.text}</span>
              <span className="visually-hidden">, ID </span>
              <span className={s.id}>{t.id}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className={s.detail} aria-live="polite" data-token-detail>
        <p className={s.summary}>
          Token {index}: <code>{current.text}</code>, ID {current.id}
          {result.search ? (
            <>
              , from the word <code>{result.search.word}</code>
            </>
          ) : (
            current.word < 0 && (
              <>, added by the tokenizer to mark the {index === 0 ? 'start' : 'end'} of the text</>
            )
          )}
        </p>
        {result.search && (
          <ol className={s.search} aria-label={`How WordPiece split "${result.search.word}"`}>
            {result.search.pieces.unknown && result.search.pieces.attempts.length === 0 && (
              <li>The word is longer than 100 characters, so it becomes [UNK] without a search.</li>
            )}
            {byStart(result.search.pieces.attempts).map(([start, tries]) => (
              <li key={start} className={s.step}>
                <span className={s.pos}>from character {start}</span>
                {tries.map((a) => (
                  <span key={a.candidate} className={a.found ? s.found : s.miss}>
                    {a.candidate} {a.found ? '✓ in vocabulary' : '✗'}
                  </span>
                ))}
              </li>
            ))}
            {result.search.pieces.unknown && result.search.pieces.attempts.length > 0 && (
              <li className={s.step}>
                No prefix of the rest is in the vocabulary, so the whole word becomes [UNK].
              </li>
            )}
          </ol>
        )}
      </div>
    </VizFrame>
  );
}
