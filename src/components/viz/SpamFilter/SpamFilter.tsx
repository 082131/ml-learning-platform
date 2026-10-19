import {
  LEARNED_THRESHOLD,
  NEW_EMAILS,
  TRAIN_EMAILS,
  learnedIsSpam,
  ruleIsSpam,
  scoreEmail,
  type Email,
  type SpamResult,
  type SpamState,
} from '@/lib/foundations/spamFilter';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SpamFilter.module.css';

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const verdict = (spam: boolean, truth: Email['label']) => {
  const ok = spam === (truth === 'spam');
  return (
    <span data-correct={ok}>
      {spam ? 'spam' : 'ham'} {ok ? '✓' : '✗ wrong'}
    </span>
  );
};

/**
 * The learner's email word by word with learned scores, then every training and new email judged
 * by the hand-written rule and by the learned filter. Use inside an Experiment made with spamExperiment.
 */
export function SpamFilter() {
  const { state, result } = useExperimentContext<SpamState, SpamResult>('SpamFilter');
  const { email, keywords, scores } = result;
  const rows = (emails: Email[]) =>
    emails.map((e) => {
      const score = scoreEmail(e.text, scores);
      return (
        <tr key={e.text}>
          <th scope="row">{e.text}</th>
          <td data-label="True label">{e.label}</td>
          <td data-label="Rule says">{verdict(ruleIsSpam(e.text, keywords), e.label)}</td>
          <td className={s.num} data-label="Score">
            {score}
          </td>
          <td data-label="Learned says">
            {verdict(learnedIsSpam(e.text, scores, state.threshold), e.label)}
          </td>
        </tr>
      );
    });
  const table = (caption: string, emails: Email[], correct: [number, number]) => (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption>
          {caption}: rule {correct[0]} of {emails.length} correct, learned {correct[1]} of {emails.length}
        </caption>
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">True label</th>
            <th scope="col">Rule says</th>
            <th scope="col">Score</th>
            <th scope="col">Learned says (score &gt; {state.threshold})</th>
          </tr>
        </thead>
        <tbody>{rows(emails)}</tbody>
      </table>
    </div>
  );

  return (
    <VizFrame
      title="Spam filter: hand-written rule vs learned scores"
      table={
        <VizTable
          caption="Learned score of every word in your email"
          columns={['Word', 'Learned score', 'One of your keywords']}
          rows={email.words.map((w) => [w.word, w.score, w.keyword ? 'yes' : 'no'])}
        />
      }
      caption={`Learned threshold from the training emails: ${LEARNED_THRESHOLD}. Scores come from counting words in the ${TRAIN_EMAILS.length} labeled training emails.`}
    >
      <div className={s.email} aria-live="polite" data-email-score={email.score}>
        <span className={s.lhs}>Your email, word by word (learned score; ★ = one of your keywords)</span>
        <ul className={s.words}>
          {email.words.map((w, i) => (
            <li key={`${w.word}-${i}`} className={s.word} data-sign={Math.sign(w.score)}>
              <span>
                {w.keyword && '★ '}
                {w.word}
              </span>
              <span className={s.score}>{signed(w.score)}</span>
            </li>
          ))}
          {email.words.length === 0 && <li className={s.lhs}>(no words yet)</li>}
        </ul>
        <span>
          Score {email.score} {email.score > state.threshold ? '>' : '≤'} {state.threshold}, so the learned
          filter says <strong>{result.learned.email ? 'spam' : 'ham'}</strong>. The rule says{' '}
          <strong>{result.rule.email ? 'spam' : 'ham'}</strong>.
        </span>
      </div>
      {table('Training emails', TRAIN_EMAILS, [result.rule.train, result.learned.train])}
      {table('New emails', NEW_EMAILS, [result.rule.new, result.learned.new])}
    </VizFrame>
  );
}
