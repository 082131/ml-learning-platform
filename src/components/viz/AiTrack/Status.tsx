import s from './AiTrack.module.css';

export type StatusTone = 'ok' | 'err' | 'warn' | 'neutral';

/** A status word with a symbol, so it never relies on color alone. */
export function Status({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span className={s.status} data-tone={tone}>
      {children}
    </span>
  );
}
