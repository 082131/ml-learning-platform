import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the automation/scheduling chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'cron-expression',
    term: 'Cron expression',
    short: 'Five fields (minute, hour, day of month, month, day of week) that describe when a job runs, such as 0 2 * * * for 02:00 every day.',
    long: 'Fields accept *, numbers, ranges (1-5), lists (1,15) and steps (*/15). When both day fields are restricted, a day matches if either one matches.',
    introducedIn: 'automation/scheduling/cron-schedules',
    aliases: ['cron', 'crontab'],
  },
  {
    id: 'heartbeat-monitor',
    term: 'Heartbeat monitor',
    short: 'A check that alerts when a scheduled job has NOT reported success in time. It catches jobs that never started, which no error log can.',
    introducedIn: 'automation/scheduling/cron-schedules',
    aliases: ["dead man's switch"],
  },
  {
    id: 'job-overlap',
    term: 'Overlapping runs',
    short: 'A scheduled job starting again while the previous run is still going. Prevented with a lock (flock, a lock row) or a "max one active run" setting.',
    introducedIn: 'automation/scheduling/cron-schedules',
  },
  {
    id: 'transient-error',
    term: 'Transient error',
    short: 'A failure that may not happen if you try again: a timeout, a dropped connection, HTTP 429, 500, 502, 503 or 504. A 400 or 404 will fail the same way every time.',
    introducedIn: 'automation/scheduling/apis-retries',
  },
  {
    id: 'retry-after',
    term: 'Retry-After header',
    short: 'An HTTP response header (seconds or a date) a server sends with 429 or 503 to say when to try again. Well-behaved clients wait at least that long.',
    introducedIn: 'automation/scheduling/apis-retries',
  },
  {
    id: 'thundering-herd',
    term: 'Thundering herd',
    short: 'Many clients retrying at the same moments after a shared failure, so the recovering service is hit by synchronized bursts. Random jitter spreads them out.',
    introducedIn: 'automation/scheduling/apis-retries',
  },
  {
    id: 'idempotency-key',
    term: 'Idempotency key',
    short: 'A unique id the client sends with a request that changes something (a payment, a job launch), so the server can recognise a retry and not do the work twice.',
    introducedIn: 'automation/scheduling/apis-retries',
  },
  {
    id: 'job-checkpoint',
    term: 'Job checkpoint',
    short: 'A saved marker of how far a batch job got ("done up to item 500"), so a rerun after a crash resumes there instead of starting over.',
    introducedIn: 'automation/scheduling/rerun-safe-jobs',
    aliases: ['resume marker', 'high-water mark'],
  },
  {
    id: 'atomic-write',
    term: 'Atomic write',
    short: 'Writing output to a temporary name and renaming it into place in one step, so readers see the old file or the complete new one, never half a file.',
    introducedIn: 'automation/scheduling/rerun-safe-jobs',
  },
] satisfies GlossaryTerm[];
