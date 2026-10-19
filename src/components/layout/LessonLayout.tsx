import { useState, type ReactNode } from 'react';
import { Button, Sheet } from '@/components/ui';
import type { LessonInfo } from '@/lib/curriculum';
import type { ProgressState } from '@/lib/progress/schema';
import { LessonSidebar, type SectionAnchor } from './LessonSidebar';
import s from './LessonLayout.module.css';

interface Props {
  lesson: LessonInfo;
  sections: SectionAnchor[];
  progress: ProgressState;
  children: ReactNode;
}

/** Sidebar beside the lesson from 900px; below that the sidebar opens as a drawer. */
export function LessonLayout({ lesson, sections, progress, children }: Props) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className={s.layout}>
      <aside className={s.sidebar} aria-label="Chapter navigation">
        <LessonSidebar lesson={lesson} sections={sections} progress={progress} />
      </aside>
      <div className={s.drawerBar}>
        <Button size="sm" onClick={() => setDrawer(true)} aria-haspopup="dialog">
          Chapter lessons
        </Button>
      </div>
      <Sheet open={drawer} onClose={() => setDrawer(false)} title={lesson.chapter.title} side="left">
        <LessonSidebar
          lesson={lesson}
          sections={sections}
          progress={progress}
          onNavigate={() => setDrawer(false)}
        />
      </Sheet>
      <article className={s.main}>{children}</article>
    </div>
  );
}
