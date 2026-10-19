import type { ReactNode } from 'react';
import s from './StatGrid.module.css';

export interface Stat {
  value: ReactNode;
  label: string;
}

/** The `<1.8s / 2-4x` stat grid from reference 02. Only real or computed values go here. */
export function StatGrid({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <dl className={s.grid} aria-label={label}>
      {stats.map((st) => (
        <div key={st.label} className={s.cell}>
          <dt className={s.label}>{st.label}</dt>
          <dd className={s.value}>{st.value}</dd>
        </div>
      ))}
    </dl>
  );
}
