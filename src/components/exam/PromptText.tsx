import s from './Exam.module.css';

/** A question prompt. Text after the first blank line is a code listing, shown monospaced with its line breaks. */
export function PromptText({ text }: { text: string }) {
  const split = text.indexOf('\n\n');
  if (split < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, split)}
      <code className={s.listing} data-exam-code>
        {text.slice(split + 2)}
      </code>
    </>
  );
}
