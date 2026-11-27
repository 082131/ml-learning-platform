// The purchase funnel of the shop's event log, computed in TypeScript for the funnel explorer.
// The events are read from the shop dataset itself (one source of truth); funnel.test.ts checks every
// setting against SQLite running funnelSql.
import { SHOP_SQL } from './datasets';

export const FUNNEL_STEPS = ['visit', 'view_product', 'add_to_cart', 'checkout', 'purchase'] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export interface ShopEvent {
  id: number;
  userId: number;
  time: string;
  event: FunnelStep;
}

export const USER_NAMES: Record<number, string> = { 1: 'Ada', 2: 'Ben', 3: 'Chen', 4: 'Dana', 5: 'Eli', 6: 'Fay', 7: 'Gus', 8: 'Hana' };

function parseEvents(): ShopEvent[] {
  const block = SHOP_SQL.split('INSERT INTO events VALUES')[1]!.split(';')[0]!;
  return [...block.matchAll(/\((\d+), (\d+), '([^']+)', '([a-z_]+)'\)/g)].map((m) => ({
    id: Number(m[1]),
    userId: Number(m[2]),
    time: m[3]!,
    event: m[4] as FunnelStep,
  }));
}

export const EVENTS: ShopEvent[] = parseEvents();

/** How long after the first visit a later step still counts. */
export type FunnelWindow = '1h' | '1d' | '7d' | '30d' | 'any';
export const WINDOW_LABEL: Record<FunnelWindow, string> = { '1h': '1 hour', '1d': '1 day', '7d': '7 days', '30d': '30 days', any: 'any time' };
const WINDOW_SQL: Record<FunnelWindow, string | null> = { '1h': '+1 hour', '1d': '+1 day', '7d': '+7 days', '30d': '+30 days', any: null };
const WINDOW_MS: Record<FunnelWindow, number> = { '1h': 3_600_000, '1d': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000, any: Infinity };

export interface FunnelSpec {
  window: FunnelWindow;
  /** users: each user counted once per step, steps in order within the window. events: every event row. */
  count: 'users' | 'events';
}

export interface FunnelStepResult {
  step: FunnelStep;
  value: number;
  /** Percent of the previous step (null for the first step). */
  pctPrevious: number | null;
  /** Percent of the first step. */
  pctFirst: number;
}

export interface FunnelUser {
  userId: number;
  name: string;
  /** For each step, minutes after the first visit at which it was reached (in order), or null. */
  reached: (number | null)[];
  /** Same, but ignoring the window: when the step would be reached with no time limit. */
  reachedAnyTime: (number | null)[];
}

export interface FunnelResult {
  steps: FunnelStepResult[];
  users: FunnelUser[];
}

const ms = (t: string) => Date.parse(`${t.replace(' ', 'T')}Z`);
const round1 = (x: number) => Math.round(x * 10) / 10;

function walk(events: ShopEvent[], windowMs: number): (number | null)[] {
  const visits = events.filter((e) => e.event === 'visit').map((e) => ms(e.time));
  if (visits.length === 0) return FUNNEL_STEPS.map(() => null);
  const start = Math.min(...visits);
  const out: (number | null)[] = [0];
  let t = start;
  for (const step of FUNNEL_STEPS.slice(1)) {
    const next = events.filter((e) => e.event === step && ms(e.time) >= t && ms(e.time) <= start + windowMs).map((e) => ms(e.time));
    if (next.length === 0) {
      while (out.length < FUNNEL_STEPS.length) out.push(null);
      break;
    }
    t = Math.min(...next);
    out.push((t - start) / 60_000);
  }
  return out;
}

export function funnel(s: FunnelSpec): FunnelResult {
  const ids = [...new Set(EVENTS.map((e) => e.userId))].sort((a, b) => a - b);
  const users = ids.map((userId) => {
    const own = EVENTS.filter((e) => e.userId === userId);
    return { userId, name: USER_NAMES[userId] ?? String(userId), reached: walk(own, WINDOW_MS[s.window]), reachedAnyTime: walk(own, Infinity) };
  });
  const values = FUNNEL_STEPS.map((step, i) =>
    s.count === 'events' ? EVENTS.filter((e) => e.event === step).length : users.filter((u) => u.reached[i] !== null).length,
  );
  const steps = FUNNEL_STEPS.map((step, i) => ({
    step,
    value: values[i]!,
    pctPrevious: i === 0 ? null : values[i - 1] ? round1((100 * values[i]!) / values[i - 1]!) : null,
    pctFirst: round1((100 * values[i]!) / values[0]!),
  }));
  return { steps, users };
}

/** The SQL the explorer models. Both versions return (n, step, value, pct_previous, pct_first). */
export function funnelSql(s: FunnelSpec): string {
  const tail = `SELECT n, step, value,
       ROUND(100.0 * value / LAG(value) OVER (ORDER BY n), 1)         AS pct_previous,
       ROUND(100.0 * value / FIRST_VALUE(value) OVER (ORDER BY n), 1) AS pct_first
FROM funnel
ORDER BY n;`;
  if (s.count === 'events')
    return `WITH funnel AS (
  SELECT CASE event WHEN 'visit' THEN 1 WHEN 'view_product' THEN 2 WHEN 'add_to_cart' THEN 3
                    WHEN 'checkout' THEN 4 ELSE 5 END AS n,
         event AS step, COUNT(*) AS value
  FROM events
  GROUP BY event
)
${tail}`;
  const limit = WINDOW_SQL[s.window];
  const bound = (prev: string) => `e.event_time >= ${prev}.t${limit ? ` AND e.event_time <= datetime(${prev}.start, '${limit}')` : ''}`;
  const stepCte = (name: string, prev: string, event: string) => `${name} AS (
  SELECT ${prev}.user_id, ${prev}.start, MIN(e.event_time) AS t
  FROM ${prev}
  JOIN events AS e ON e.user_id = ${prev}.user_id AND e.event = '${event}'
                  AND ${bound(prev)}
  GROUP BY ${prev}.user_id, ${prev}.start
)`;
  return `WITH visited AS (
  SELECT user_id, MIN(event_time) AS start, MIN(event_time) AS t
  FROM events WHERE event = 'visit' GROUP BY user_id
),
${stepCte('viewed', 'visited', 'view_product')},
${stepCte('carted', 'viewed', 'add_to_cart')},
${stepCte('checked_out', 'carted', 'checkout')},
${stepCte('purchased', 'checked_out', 'purchase')},
funnel AS (
  SELECT 1 AS n, 'visit' AS step, COUNT(*) AS value FROM visited
  UNION ALL SELECT 2, 'view_product', COUNT(*) FROM viewed
  UNION ALL SELECT 3, 'add_to_cart',  COUNT(*) FROM carted
  UNION ALL SELECT 4, 'checkout',     COUNT(*) FROM checked_out
  UNION ALL SELECT 5, 'purchase',     COUNT(*) FROM purchased
)
${tail}`;
}

/** "+3 min", "+34 h", "+14 d": how long after the first visit. */
export function formatOffset(minutes: number): string {
  if (minutes < 60) return `+${Math.round(minutes)} min`;
  if (minutes < 48 * 60) return `+${Math.round(minutes / 60)} h`;
  return `+${Math.round(minutes / 1440)} d`;
}
