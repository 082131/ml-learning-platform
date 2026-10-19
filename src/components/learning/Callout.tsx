import type { ReactNode } from 'react';
import s from './Callout.module.css';

type CalloutKind = 'note' | 'warning' | 'simplification';

const LABEL: Record<CalloutKind, string> = {
  note: 'Note',
  warning: 'Warning',
  simplification: 'Simplification',
};

/** A labeled aside. "Simplification" marks where the lesson departs from production behavior (constitution II). */
export function Callout({ kind = 'note', children }: { kind?: CalloutKind; children: ReactNode }) {
  return (
    <aside className={s.callout} data-kind={kind}>
      <span className={s.label}>{LABEL[kind]}</span>
      <div className={s.body}>{children}</div>
    </aside>
  );
}
