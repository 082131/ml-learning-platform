import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/ui';
import s from './PageHeader.module.css';

interface PageHeaderProps {
  code?: string;
  label: string;
  title: ReactNode;
  children?: ReactNode;
}

/** Mono label, then a large title with a muted leading slash (references 01, 02). */
export function PageHeader({ code, label, title, children }: PageHeaderProps) {
  return (
    <header className={s.header}>
      <SectionLabel code={code} label={label} />
      <h1 className={s.title}>
        <span className={s.slash} aria-hidden="true">
          /
        </span>{' '}
        {title}
      </h1>
      {children}
    </header>
  );
}
