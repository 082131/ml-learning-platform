import { taskPoints } from '../exam/engine';
import { shuffleItems } from '../quiz';
import type { RatingRecord, ScreenSitting } from './storage';
import type { InterviewQuestion, QuestionKind, RoleId, ScreenDef } from './types';

export type StatusFilter = 'all' | 'new' | 'review' | 'solid';

export interface QuestionFilter {
  role: RoleId | 'all';
  kind: QuestionKind | 'all';
  status: StatusFilter;
}

type Ratings = Record<string, RatingRecord>;

/** `new` has never been rated, `review` was rated below "nailed it", `solid` was nailed. */
export function statusOf(id: string, ratings: Ratings): Exclude<StatusFilter, 'all'> {
  const r = ratings[id];
  if (!r) return 'new';
  return r.rating === 3 ? 'solid' : 'review';
}

export function filterQuestions(
  all: InterviewQuestion[],
  filter: QuestionFilter,
  ratings: Ratings,
): InterviewQuestion[] {
  return all.filter(
    (q) =>
      (filter.role === 'all' || q.role === filter.role) &&
      (filter.kind === 'all' || q.kind === filter.kind) &&
      (filter.status === 'all' || statusOf(q.id, ratings) === filter.status),
  );
}

export interface BankStats {
  total: number;
  practiced: number;
  solid: number;
  review: number;
}

export function bankStats(all: InterviewQuestion[], ratings: Ratings): BankStats {
  let solid = 0;
  let review = 0;
  for (const q of all) {
    const st = statusOf(q.id, ratings);
    if (st === 'solid') solid++;
    else if (st === 'review') review++;
  }
  return { total: all.length, practiced: solid + review, solid, review };
}

/**
 * Picks the questions for a mock round: weakest first. Missed questions come before partly answered ones,
 * then questions never tried, then ones already nailed (oldest first). Order within a group is shuffled by the seed.
 */
export function buildDrill(
  pool: InterviewQuestion[],
  ratings: Ratings,
  size: number,
  seed: string,
): string[] {
  const group = (id: string) => {
    const r = ratings[id];
    if (!r) return 2;
    return r.rating === 1 ? 0 : r.rating === 2 ? 1 : 3;
  };
  const shuffled = shuffleItems(
    pool.map((q) => q.id),
    seed,
  );
  const rank = new Map(shuffled.map((id, i) => [id, i]));
  return [...shuffled]
    .sort((a, b) => {
      const ga = group(a);
      const gb = group(b);
      if (ga !== gb) return ga - gb;
      if (ga === 3) return ratings[a]!.at - ratings[b]!.at;
      return rank.get(a)! - rank.get(b)!;
    })
    .slice(0, size);
}

export interface ScreenScore {
  earned: number;
  total: number;
  percent: number;
  passed: boolean;
}

export function scoreSitting(screen: ScreenDef, sitting: ScreenSitting | undefined): ScreenScore {
  const total = screen.tasks.reduce((sum, t) => sum + taskPoints(t), 0);
  const earned = screen.tasks.reduce((sum, t) => sum + (sitting?.tasks[t.id]?.best ?? 0), 0);
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  return { earned, total, percent, passed: percent >= screen.passPercent };
}
