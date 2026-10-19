import type { LessonMeta, LessonRef, Track } from '../types';
import type { ProgressState } from './schema';

export type LessonProgress = 'complete' | 'in-progress' | 'not-started';

export function trackLessons(track: Track): LessonRef[] {
  return track.chapters.flatMap((c) => c.lessons);
}

export function lessonProgress(lessonId: string, s: ProgressState): LessonProgress {
  if (lessonId in s.completed) return 'complete';
  return s.recent.includes(lessonId) ? 'in-progress' : 'not-started';
}

export interface TrackStats {
  total: number;
  written: number;
  completedWritten: number;
}

export function trackStats(track: Track, s: ProgressState): TrackStats {
  const lessons = trackLessons(track);
  const written = lessons.filter((l) => l.status === 'written');
  return {
    total: lessons.length,
    written: written.length,
    completedWritten: written.filter((l) => l.id in s.completed).length,
  };
}

/**
 * The first incomplete written lesson in track order whose prerequisites are complete.
 * An outline prerequisite cannot be completed yet, so it does not block (see plan.md decision log).
 */
export function nextUp(
  track: Track,
  statusById: Record<string, LessonRef['status']>,
  metas: Record<string, LessonMeta>,
  s: ProgressState,
): LessonRef | undefined {
  const satisfied = (id: string) => id in s.completed || statusById[id] !== 'written';
  return trackLessons(track).find(
    (l) =>
      l.status === 'written' && !(l.id in s.completed) && (metas[l.id]?.prerequisites ?? []).every(satisfied),
  );
}
