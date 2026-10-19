import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from './cx';
import s from './Card.module.css';

interface CardProps {
  /** Shown top right as `// 001`. */
  number?: number;
  /** Makes the whole card one link. Cards with a link must not contain other interactive elements. */
  to?: string;
  label?: string;
  className?: string;
  children: ReactNode;
}

export const formatNumber = (n: number) => String(n).padStart(3, '0');

export function Card({ number, to, label, className, children }: CardProps) {
  const body = (
    <>
      {number !== undefined && (
        <span className={s.number} aria-hidden="true">
          <span className={s.slashes}>//</span> {formatNumber(number)}
        </span>
      )}
      {children}
    </>
  );
  return to ? (
    <Link to={to} className={cx(s.card, s.link, className)} aria-label={label}>
      {body}
    </Link>
  ) : (
    <div className={cx(s.card, className)}>{body}</div>
  );
}
