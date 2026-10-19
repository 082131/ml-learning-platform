import type { CodeExample } from '@/lib/types';
import { PlainCode } from '@/components/code/PlainCode';
import { InlineText } from './InlineText';
import s from './Assessment.module.css';

interface CommonMistakeProps {
  title: string;
  /** The code that fails. */
  wrong: string;
  /** The real error text the library prints, copied from an actual run, never paraphrased (constitution II). */
  error: string;
  cause: string;
  fix: string;
  language?: CodeExample['language'];
}

/** A mistake learners make: wrong code, the error it produces, why, and the fix. */
export function CommonMistake({ title, wrong, error, cause, fix, language = 'python' }: CommonMistakeProps) {
  return (
    <div className={s.mistake} data-wide>
      <h3 className={s.mistakeTitle}>{title}</h3>
      <div>
        <span className={s.hintLabel}>✗ Wrong</span>
        <div className={s.codeBox}>
          <PlainCode source={wrong} language={language} label="Code with the mistake" />
        </div>
      </div>
      <div>
        <span className={s.hintLabel}>Error message</span>
        <pre className={s.errorText} tabIndex={0} role="group" aria-label="Error message">
          {error}
        </pre>
      </div>
      <div>
        <span className={s.hintLabel}>Why it happens</span>
        <InlineText text={cause} />
      </div>
      <div>
        <span className={s.hintLabel}>✓ Fix</span>
        <div className={s.codeBox}>
          <PlainCode source={fix} language={language} label="Fixed code" />
        </div>
      </div>
    </div>
  );
}
