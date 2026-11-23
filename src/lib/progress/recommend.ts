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

export type TrackRecommendation =
  | { kind: 'ready'; ref: LessonRef }
  /** No lesson in this track is unlocked yet; `ref` is its first incomplete written lesson and `missing` its unmet prerequisites. */
  | { kind: 'needs-prerequisites'; ref: LessonRef; missing: string[] }
  | { kind: 'complete' }
  | { kind: 'none-written' };

/**
 * What the dashboard shows for a track. Prefers `nextUp`. When prerequisites in other tracks block every
 * lesson, it still points at the track's first incomplete written lesson, so a track is never shown as
 * "complete" when nothing in it has been done.
 */
export function recommendForTrack(
  track: Track,
  statusById: Record<string, LessonRef['status']>,
  metas: Record<string, LessonMeta>,
  s: ProgressState,
): TrackRecommendation {
  const ready = nextUp(track, statusById, metas, s);
  if (ready) return { kind: 'ready', ref: ready };
  const written = trackLessons(track).filter((l) => l.status === 'written');
  if (written.length === 0) return { kind: 'none-written' };
  const first = written.find((l) => !(l.id in s.completed));
  if (!first) return { kind: 'complete' };
  const missing = (metas[first.id]?.prerequisites ?? []).filter(
    (id) => !(id in s.completed) && statusById[id] === 'written',
  );
  return { kind: 'needs-prerequisites', ref: first, missing };
}
