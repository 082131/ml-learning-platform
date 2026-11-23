import { Link } from 'react-router';
import { curriculum } from '@/app/content';
import { useProgress } from '@/app/progress';
import { PageHeader } from '@/components/layout/PageHeader';
import { PixelProgressGrid } from '@/components/layout/PixelProgressGrid';
import { LessonCard } from '@/components/learning/LessonCard';
import grid from '@/components/learning/LessonGrid.module.css';
import { Card, SectionLabel } from '@/components/ui';
import { recommendForTrack, trackStats } from '@/lib/progress/recommend';
import { LessonLinkList } from './LessonLinkList';
import s from './Dashboard.module.css';

const SECTIONS = 4;
const NUMBER_WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

export default function Dashboard() {
  const progress = useProgress();
  const { tracks, statusById, metas } = curriculum;
  const lastViewed = progress.recent.map((id) => curriculum.getLesson(id)).find(Boolean);
  const firstLesson = curriculum.lessonsOf('ml')[0];
  const continueLesson = lastViewed ?? firstLesson;

  return (
    <>
      <PageHeader code="00" label="Dashboard" title="Your learning">
        <p className={s.lead}>
          {NUMBER_WORDS[tracks.length] ?? tracks.length} tracks, one lesson at a time. Progress is saved in
          this browser (<Link to="/settings">details</Link>). Getting ready to apply? Try{' '}
          <Link to="/interview">interview prep</Link>: questions with model answers and timed coding screens.
        </p>
      </PageHeader>
      <PixelProgressGrid
        label="All lessons map"
        rows={4}
        progress={progress}
        groups={tracks.map((t) => ({
          id: t.id,
          label: `${t.code} ${t.title}`,
          lessons: curriculum.lessonsOf(t.id),
        }))}
      />
      <div className={s.sections}>
        <section aria-labelledby="continue-title" className={s.section}>
          <SectionLabel index={1} total={SECTIONS} label={lastViewed ? 'Continue' : 'Start here'} />
          <h2 id="continue-title" className={s.h2}>
            {lastViewed ? 'Pick up where you left off' : 'Start with the first lesson'}
          </h2>
          {continueLesson && (
            <div className={s.continue}>
              <LessonCard lesson={continueLesson} progress={progress} />
            </div>
          )}
        </section>

        <section aria-labelledby="next-title" className={s.section}>
          <SectionLabel index={2} total={SECTIONS} label="Next up" />
          <h2 id="next-title" className={s.h2}>
            Next up in each track
          </h2>
          <p className={s.note}>
            The first written lesson you haven’t completed whose prerequisites are done. Where a track builds
            on another one, its first lesson is shown with what to finish first.
          </p>
          <ul className={grid.grid}>
            {tracks.map((t) => {
              const rec = recommendForTrack(t, statusById, metas, progress);
              const lesson = 'ref' in rec ? curriculum.getLesson(rec.ref.id) : undefined;
              return (
                <li key={t.id} className={s.nextItem} aria-label={t.title}>
                  <Link to={`/learn/${t.id}`} className={s.trackLink}>
                    <span className={s.cardCode}>{t.code}</span> {t.title}
                  </Link>
                  {lesson ? (
                    <LessonCard lesson={lesson} progress={progress} />
                  ) : (
                    <Card>
                      <p className={s.note}>
                        {rec.kind === 'none-written'
                          ? 'No lessons are written yet. Outlines are on the track page.'
                          : 'Every written lesson is complete.'}
                      </p>
                    </Card>
                  )}
                  {rec.kind === 'needs-prerequisites' && rec.missing.length > 0 && (
                    <p className={s.needs}>
                      Finish first:{' '}
                      {rec.missing.map((id, i) => {
                        const pre = curriculum.getLesson(id);
                        return (
                          <span key={id}>
                            {i > 0 && ', '}
                            <Link to={`/learn/${id}`}>
                              {pre ? `${pre.track.code} ${pre.meta.title}` : id}
                            </Link>
                          </span>
                        );
                      })}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="tracks-title" className={s.section}>
          <SectionLabel index={3} total={SECTIONS} label="Tracks" />
          <h2 id="tracks-title" className={s.h2}>
            Progress by track
          </h2>
          <ul className={s.stats}>
            {tracks.map((t) => {
              const st = trackStats(t, progress);
              return (
                <li key={t.id}>
                  <Link to={`/learn/${t.id}`} className={s.stat}>
                    <span className={s.cardCode}>{t.code}</span>
                    <span className={s.statName}>{t.title}</span>
                    <span className={s.statValue}>
                      {st.completedWritten} of {st.written}
                    </span>
                    <span className={s.statLabel}>written lessons complete</span>
                    <span className={s.statTitle}>{st.total} lessons in the track</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="saved-title" className={s.section}>
          <SectionLabel index={4} total={SECTIONS} label="Saved" />
          <h2 id="saved-title" className="visually-hidden">
            Bookmarks and recent lessons
          </h2>
          <div className={s.two}>
            <div>
              <h3 className={s.h3}>Bookmarks</h3>
              <LessonLinkList
                ids={progress.bookmarks}
                empty="No bookmarks yet. Use Bookmark at the end of any lesson."
              />
            </div>
            <div>
              <h3 className={s.h3}>Recently viewed</h3>
              <LessonLinkList ids={progress.recent} empty="Lessons you open will appear here." />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
