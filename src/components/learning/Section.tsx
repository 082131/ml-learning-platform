import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/ui';
import { SECTION_KINDS, type SectionKind } from '@/lib/types';
import s from './Section.module.css';

export const SECTION_TITLES: Record<SectionKind, string> = {
  objectives: 'Objectives',
  prerequisites: 'Prerequisites',
  intuition: 'Intuition',
  technical: 'Technical explanation',
  visual: 'Visual',
  code: 'Code walkthrough',
  experiment: 'Experiment',
  mistakes: 'Common mistakes',
  practice: 'Practical application',
  check: 'Knowledge check',
  exercise: 'Mini-exercise',
  summary: 'Summary',
};

interface SectionProps {
  kind: SectionKind;
  /** Optional heading below the label, such as "Why hand-written rules break". */
  title?: string;
  children: ReactNode;
}

/** One part of the 12-part lesson structure. The label number is the part's fixed position, e.g. [03/12]. */
export function Section({ kind, title, children }: SectionProps) {
  const index = SECTION_KINDS.indexOf(kind) + 1;
  const headingId = `section-${kind}-title`;
  return (
    <section
      id={`section-${kind}`}
      className={s.section}
      tabIndex={-1}
      data-lesson-section={SECTION_TITLES[kind]}
      aria-labelledby={headingId}
    >
      <SectionLabel index={index} total={SECTION_KINDS.length} label={SECTION_TITLES[kind]} />
      <h2 id={headingId} className={title ? s.title : 'visually-hidden'}>
        {title ?? SECTION_TITLES[kind]}
      </h2>
      <div className={s.body}>{children}</div>
    </section>
  );
}
