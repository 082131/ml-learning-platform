import type { Chapter, LessonMeta, LessonRef, Track, TrackId } from '../types';

export interface LessonInfo {
  ref: LessonRef;
  meta: LessonMeta;
  track: Track;
  chapter: Chapter;
  /** 1-based position within its track, shown as `// 001`. */
  number: number;
}

export interface Curriculum {
  tracks: Track[];
  getTrack(id: string): Track | undefined;
  getLesson(id: string): LessonInfo | undefined;
  lessonsOf(trackId: TrackId): LessonInfo[];
  neighbors(id: string): { prev?: LessonInfo; next?: LessonInfo };
  statusById: Record<string, LessonRef['status']>;
  metas: Record<string, LessonMeta>;
}

export function createCurriculum(tracks: Track[], metas: Record<string, LessonMeta>): Curriculum {
  const byTrack = new Map<string, LessonInfo[]>();
  const byId = new Map<string, LessonInfo>();
  for (const track of tracks) {
    const list: LessonInfo[] = [];
    for (const chapter of track.chapters) {
      for (const ref of chapter.lessons) {
        const meta = metas[ref.id];
        if (!meta) throw new Error(`Lesson "${ref.id}" has no meta.ts`);
        const info = { ref, meta, track, chapter, number: list.length + 1 };
        list.push(info);
        byId.set(ref.id, info);
      }
    }
    byTrack.set(track.id, list);
  }
  const statusById = Object.fromEntries([...byId].map(([id, info]) => [id, info.ref.status]));

  return {
    tracks,
    metas,
    statusById,
    getTrack: (id) => tracks.find((t) => t.id === id),
    getLesson: (id) => byId.get(id),
    lessonsOf: (trackId) => byTrack.get(trackId) ?? [],
    neighbors(id) {
      const info = byId.get(id);
      if (!info) return {};
      const list = byTrack.get(info.track.id) ?? [];
      const i = info.number - 1;
      return { prev: list[i - 1], next: list[i + 1] };
    },
  };
}

/** Splits "ml/math/matrices" into its route parts. */
export function lessonPath(id: string): string {
  return `/learn/${id}`;
}
