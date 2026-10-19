import { Badge, Card, OutlineBadge } from '@/components/ui';
import type { LessonInfo } from '@/lib/curriculum';
import { lessonProgress } from '@/lib/progress/recommend';
import type { ProgressState } from '@/lib/progress/schema';
import s from './LessonCard.module.css';

export const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;
const KIND_LABEL = { lesson: 'Lesson', project: 'Project', capstone: 'Capstone' } as const;

export function LessonCard({ lesson, progress }: { lesson: LessonInfo; progress: ProgressState }) {
  const state = lessonProgress(lesson.ref.id, progress);
  const { meta } = lesson;
  return (
    <Card number={lesson.number} to={`/learn/${meta.id}`}>
      <h3 className={s.title}>{meta.title}</h3>
      <p className={s.meta}>
        {KIND_LABEL[meta.kind]} · {LEVEL_LABEL[meta.level]} · {meta.minutes} min
      </p>
      <div className={s.badges}>
        {lesson.ref.status === 'outline' && <OutlineBadge />}
        {state === 'complete' && <Badge tone="ok">✓ Complete</Badge>}
        {state === 'in-progress' && <Badge tone="accent">In progress</Badge>}
      </div>
    </Card>
  );
}
