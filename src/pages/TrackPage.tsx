import { useParams } from 'react-router';
import { curriculum } from '@/app/content';
import { useProgress } from '@/app/progress';
import { PageHeader } from '@/components/layout/PageHeader';
import { PixelProgressGrid } from '@/components/layout/PixelProgressGrid';
import { StatGrid } from '@/components/layout/StatGrid';
import { LessonCard, LEVEL_LABEL } from '@/components/learning/LessonCard';
import grid from '@/components/learning/LessonGrid.module.css';
import { ButtonLink, SectionLabel } from '@/components/ui';
import { getExam } from '@/app/exams';
import { trackStats } from '@/lib/progress/recommend';
import type { Level } from '@/lib/types';
import NotFound from './NotFound';
import s from './TrackPage.module.css';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export default function TrackPage() {
  const { track: trackId = '' } = useParams();
  const progress = useProgress();
  const track = curriculum.getTrack(trackId);
  if (!track) return <NotFound />;

  const exam = getExam(track.id);
  const lessons = curriculum.lessonsOf(track.id);
  const stats = trackStats(track, progress);
  const projects = lessons.filter((l) => l.meta.kind !== 'lesson').length;
  const levels = LEVELS.filter((lv) => track.chapters.some((c) => c.level === lv));
  const chapterNumber = new Map(track.chapters.map((c, i) => [c.id, i + 1]));

  return (
    <>
      <PageHeader code={track.code} label="Track" title={track.title}>
        <p className={s.summary}>{track.summary}</p>
        {exam && (
          <p className={s.summary}>
            <ButtonLink to={`/exam/${track.id}`} variant="primary">
              Take the certification exam
            </ButtonLink>
          </p>
        )}
        <StatGrid
          label="Track progress"
          stats={[
            { value: `${stats.completedWritten} of ${stats.written}`, label: 'Written lessons complete' },
            { value: stats.written, label: 'Lessons written so far' },
            { value: stats.total, label: 'Lessons in the outline' },
            { value: projects, label: 'Projects and capstones' },
          ]}
        />
      </PageHeader>
      <PixelProgressGrid
        label={`${track.title} lesson map`}
        progress={progress}
        groups={track.chapters.map((c) => ({
          id: c.id,
          label: `${String(chapterNumber.get(c.id)).padStart(2, '0')} ${c.title}`,
          lessons: lessons.filter((l) => l.chapter.id === c.id),
        }))}
      />
      <div className={s.levels}>
        {levels.map((level, li) => (
          <section key={level} aria-labelledby={`level-${level}`} className={s.level}>
            <SectionLabel index={li + 1} total={levels.length} label={LEVEL_LABEL[level]} />
            <h2 id={`level-${level}`} className="visually-hidden">
              {LEVEL_LABEL[level]} chapters
            </h2>
            {track.chapters
              .filter((c) => c.level === level)
              .map((c) => {
                const chapterLessons = lessons.filter((l) => l.chapter.id === c.id);
                const written = chapterLessons.filter((l) => l.ref.status === 'written').length;
                return (
                  <section key={c.id} className={s.chapter} aria-labelledby={`chapter-${c.id}`}>
                    <div className={s.chapterHead}>
                      <h3 id={`chapter-${c.id}`} className={s.chapterTitle}>
                        <span className={s.chapterNum}>
                          {String(chapterNumber.get(c.id)).padStart(2, '0')}
                        </span>{' '}
                        {c.title}
                      </h3>
                      <p className={s.chapterMeta}>
                        {chapterLessons.length} {chapterLessons.length === 1 ? 'entry' : 'entries'} ·{' '}
                        {written} written
                      </p>
                    </div>
                    <ul className={grid.grid}>
                      {chapterLessons.map((l) => (
                        <li key={l.ref.id}>
                          <LessonCard lesson={l} progress={progress} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
          </section>
        ))}
      </div>
    </>
  );
}
