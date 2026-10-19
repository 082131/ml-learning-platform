import { cx } from './cx';
import s from './SectionLabel.module.css';

interface SectionLabelProps {
  /** 1-based position, rendered as `[03/12]`. */
  index?: number;
  total?: number;
  /** Free-form prefix instead of index/total, such as a track code `T.01`. */
  code?: string;
  label: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Monospace bracket label from the references: `[03/12] —— > INTUITION ————`. */
export function SectionLabel({ index, total, code, label, className }: SectionLabelProps) {
  const prefix =
    code ?? (index !== undefined && total !== undefined ? `${pad(index)}/${pad(total)}` : undefined);
  return (
    <div className={cx(s.label, className)}>
      {prefix && <span className={s.prefix}>[{prefix}]</span>}
      <span className={s.dash} aria-hidden="true" />
      <span className={s.text}>
        <span aria-hidden="true">&gt; </span>
        {label}
      </span>
      <span className={s.rule} aria-hidden="true" />
    </div>
  );
}
