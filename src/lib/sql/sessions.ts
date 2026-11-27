// Sessionization of the shop's event log with a configurable inactivity timeout, for the session explorer.
// sessions.test.ts checks every timeout against SQLite running sessionsSql.
import { EVENTS, USER_NAMES, type FunnelStep } from './funnel';

export interface SessionEvent {
  id: number;
  userId: number;
  time: string;
  event: FunnelStep;
  /** Minutes since the same user's previous event (null for their first event). */
  gapMin: number | null;
  newSession: boolean;
  /** 1, 2, 3 ... within the user. */
  sessionNo: number;
}

export interface SessionSummary {
  userId: number;
  name: string;
  sessionNo: number;
  start: string;
  end: string;
  events: number;
  purchased: boolean;
  carted: boolean;
}

export interface SessionResult {
  events: SessionEvent[];
  sessions: SessionSummary[];
  totalSessions: number;
  purchaseSessions: number;
  /** Sessions with add_to_cart but no purchase. */
  abandonedCarts: number;
  /** Percent of sessions with a purchase, one decimal. */
  conversion: number;
}

const secs = (t: string) => Date.parse(`${t.replace(' ', 'T')}Z`) / 1000;
const round1 = (x: number) => Math.round(x * 10) / 10;

export function sessionize(timeoutMin: number): SessionResult {
  const ordered = [...EVENTS].sort((a, b) => a.userId - b.userId || a.time.localeCompare(b.time) || a.id - b.id);
  const events: SessionEvent[] = [];
  let prev: (typeof ordered)[number] | undefined;
  let sessionNo = 0;
  for (const e of ordered) {
    const sameUser = prev?.userId === e.userId;
    const gapS = sameUser ? secs(e.time) - secs(prev!.time) : null;
    const newSession = gapS === null || gapS > timeoutMin * 60;
    sessionNo = !sameUser ? 1 : newSession ? sessionNo + 1 : sessionNo;
    events.push({ ...e, gapMin: gapS === null ? null : gapS / 60, newSession, sessionNo });
    prev = e;
  }
  const sessions: SessionSummary[] = [];
  for (const e of events) {
    const last = sessions[sessions.length - 1];
    if (!last || last.userId !== e.userId || last.sessionNo !== e.sessionNo)
      sessions.push({ userId: e.userId, name: USER_NAMES[e.userId] ?? String(e.userId), sessionNo: e.sessionNo, start: e.time, end: e.time, events: 1, purchased: e.event === 'purchase', carted: e.event === 'add_to_cart' });
    else {
      last.end = e.time;
      last.events += 1;
      last.purchased ||= e.event === 'purchase';
      last.carted ||= e.event === 'add_to_cart';
    }
  }
  const purchaseSessions = sessions.filter((x) => x.purchased).length;
  return {
    events,
    sessions,
    totalSessions: sessions.length,
    purchaseSessions,
    abandonedCarts: sessions.filter((x) => x.carted && !x.purchased).length,
    conversion: round1((100 * purchaseSessions) / sessions.length),
  };
}

/** The SQL the explorer models: one row per session. */
export const sessionsSql = (timeoutMin: number) => `WITH gaps AS (
  SELECT id, user_id, event_time, event,
         unixepoch(event_time)
           - unixepoch(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, id)) AS gap_s
  FROM events
),
flagged AS (
  SELECT *, CASE WHEN gap_s IS NULL OR gap_s > ${timeoutMin} * 60 THEN 1 ELSE 0 END AS new_session
  FROM gaps
),
numbered AS (
  SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time, id
                                   ROWS UNBOUNDED PRECEDING) AS session_no
  FROM flagged
)
SELECT user_id, session_no,
       MIN(event_time) AS session_start, MAX(event_time) AS session_end,
       COUNT(*) AS events,
       MAX(event = 'purchase') AS purchased,
       MAX(event = 'add_to_cart') AS carted
FROM numbered
GROUP BY user_id, session_no
ORDER BY user_id, session_no;`;
