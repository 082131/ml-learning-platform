import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from './cx';
import s from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

function Inner({ variant, children }: { variant: Variant; children: ReactNode }) {
  return (
    <>
      {variant === 'primary' && <span className={s.bullet} aria-hidden="true" />}
      {children}
    </>
  );
}

/** Primary: solid ink with a square bullet. Secondary: outlined. Ghost: text only. */
export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cx(s.btn, s[variant], s[size], className)} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </button>
  );
}

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <Link className={cx(s.btn, s[variant], s[size], className)} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </Link>
  );
}
