import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import 'katex/dist/katex.min.css';
import { curriculum } from '@/app/content';
import { useProgress, useProgressStore } from '@/app/progress';
import { LessonLayout } from '@/components/layout/LessonLayout';
import type { SectionAnchor } from '@/components/layout/LessonSidebar';
import { LessonBody } from '@/components/learning/LessonBody';
import { LEVEL_LABEL } from '@/components/learning/LessonCard';
import { PrerequisiteList } from '@/components/learning/PrerequisiteList';
import { Section } from '@/components/learning/Section';
import { Badge, Button, formatNumber, OutlineBadge, SectionLabel } from '@/components/ui';
import { recordView, setComplete, toggleBookmark } from '@/lib/progress/actions';
import NotFound from './NotFound';
import s from './LessonPage.module.css';

export default function LessonPage() {
  const { track = '', chapter = '', lesson = '' } = useParams();
  const id = `${track}/${chapter}/${lesson}`;
  const info = curriculum.getLesson(id);
  const progress = useProgress();
  const store = useProgressStore();
  const article = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<SectionAnchor[]>([]);

  useEffect(() => {
    if (info) store.update((st) => recordView(st, id));
  }, [id, info, store]);

  const collectSections = useCallback(() => {
    const found = article.current?.querySelectorAll<HTMLElement>('[data-lesson-section]') ?? [];
    setSections([...found].map((el) => ({ id: el.id, label: el.dataset.lessonSection ?? el.id })));
  }, []);

  if (!info) return <NotFound />;
  const { meta, ref } = info;
  const written = ref.status === 'written';
  const done = id in progress.completed;
  const bookmarked = progress.bookmarks.includes(id);
  const { prev, next } = curriculum.neighbors(id);

  return (
    <LessonLayout lesson={info} sections={sections} progress={progress}>
      <div ref={article}>
        <header className={s.header}>
          <SectionLabel
            code={info.track.code}
            label={`${info.chapter.title} · ${formatNumber(info.number)}`}
          />
          <h1 className={s.title}>
            <span className={s.slash} aria-hidden="true">
              /
            </span>{' '}
            {meta.title}
          </h1>
          <div className={s.badges}>
            <Badge>{LEVEL_LABEL[meta.level]}</Badge>
            <Badge>{meta.minutes} min</Badge>
            {meta.kind !== 'lesson' && (
              <Badge tone="accent">{meta.kind === 'project' ? 'Project' : 'Capstone'}</Badge>
            )}
            {!written && <OutlineBadge />}
            {done && <Badge tone="ok">✓ Complete</Badge>}
          </div>
        </header>

        <Section kind="objectives" title="By the end you can">
          <ul>
            {meta.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Section>
        <Section kind="prerequisites">
          <PrerequisiteList ids={meta.prerequisites} progress={progress} />
        </Section>

        {written ? (
          <LessonBody key={id} id={id} onReady={collectSections} />
        ) : (
          <OutlineNotice onReady={collectSections} />
        )}

        <footer className={s.footer}>
          <div className={s.actions}>
            {written && (
              <Button
                variant={done ? 'secondary' : 'primary'}
                aria-pressed={done}
                onClick={() => store.update((st) => setComplete(st, id, !done, new Date()))}
              >
                {done ? '✓ Completed' : 'Mark complete'}
              </Button>
            )}
            <Button aria-pressed={bookmarked} onClick={() => store.update((st) => toggleBookmark(st, id))}>
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </Button>
          </div>
          <nav aria-label="Previous and next lesson" className={s.pager}>
            {prev ? (
              <Link to={`/learn/${prev.ref.id}`} className={s.pagerLink} rel="prev">
                <span className={s.pagerLabel}>← Previous</span>
                {prev.meta.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/learn/${next.ref.id}`} className={`${s.pagerLink} ${s.pagerNext}`} rel="next">
                <span className={s.pagerLabel}>Next →</span>
                {next.meta.title}
              </Link>
            )}
          </nav>
        </footer>
      </div>
    </LessonLayout>
  );
}

function OutlineNotice({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return (
    <div className={s.outline} role="note">
      <OutlineBadge />
      <p>
        This lesson is outlined but not written yet. The objectives and prerequisites above show what it will
        cover. You can bookmark it and come back when it is published.
      </p>
    </div>
  );
}
