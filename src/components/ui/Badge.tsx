import type { ReactNode } from 'react';
import { cx } from './cx';
import s from './Badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'outline' | 'simulated' | 'ok' | 'warn';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx(s.badge, s[tone])}>{children}</span>;
}

/** For lessons that are outlined but not yet written (constitution I). */
export function OutlineBadge() {
  return <Badge tone="outline">Outline only</Badge>;
}

/** For anything that looks like execution but was not run (constitution II). */
export function SimulatedBadge() {
  return <Badge tone="simulated">Simulated trace</Badge>;
}
