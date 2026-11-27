import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/analytics chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'conversion-funnel',
    term: 'Conversion funnel',
    short: 'A sequence of steps (visit, view, cart, checkout, purchase) and how many units reach each one. A precise funnel says what is counted (users, sessions), whether steps must happen in order, and within what time.',
    introducedIn: 'sql/analytics/funnels-cohorts',
    aliases: ['funnel', 'step conversion'],
  },
  {
    id: 'cohort-retention',
    term: 'Cohort retention',
    short: 'Group users by when they started (their cohort, such as signup month), then measure what share of each cohort is still active 0, 1, 2 ... periods later. Periods that have not fully happened must be left blank.',
    introducedIn: 'sql/analytics/funnels-cohorts',
    aliases: ['cohort analysis', 'retention table', 'cohort triangle'],
  },
  {
    id: 'metric-denominator',
    term: 'Denominator (of a rate)',
    short: 'The set a rate divides by: "of whom?". Conversion of visitors, of carts or of sessions are different rates. Filtering or inner-joining before counting can silently shrink the denominator to the successes.',
    introducedIn: 'sql/analytics/funnels-cohorts',
  },
] satisfies GlossaryTerm[];
