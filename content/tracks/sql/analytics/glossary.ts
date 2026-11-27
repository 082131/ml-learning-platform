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
  {
    id: 'sessionization',
    term: 'Sessionization',
    short: 'Splitting each user’s event stream into sessions: a new session starts when the gap since the previous event exceeds a timeout (often 30 minutes). In SQL: LAG for the gap, a 0/1 flag, and a running SUM of the flags as the session number.',
    introducedIn: 'sql/analytics/sessions-dedup',
    aliases: ['session', 'session timeout'],
  },
  {
    id: 'gaps-and-islands',
    term: 'Gaps and islands',
    short: 'Finding runs of consecutive values (islands) separated by gaps, such as login streaks. Subtracting each row’s position (ROW_NUMBER) from its value gives a key that is constant within a run.',
    introducedIn: 'sql/analytics/sessions-dedup',
    aliases: ['streaks', 'consecutive runs'],
  },
  {
    id: 'deduplication',
    term: 'Deduplication',
    short: 'Removing repeated records. Exact duplicates (identical rows) go with DISTINCT or GROUP BY; several versions of one entity are reduced to one with ROW_NUMBER() OVER (PARTITION BY key ORDER BY version DESC) = 1, with a tiebreaker.',
    introducedIn: 'sql/analytics/sessions-dedup',
    aliases: ['dedup', 'latest record per key'],
  },
  {
    id: 'label-window',
    term: 'Label window',
    short: 'The period after a cutoff that a label describes, such as "orders in the 30 days from the cutoff". The label is only final once the window has ended, so rows whose window is still open cannot be used for training yet.',
    introducedIn: 'sql/analytics/ml-features',
    aliases: ['prediction horizon', 'label maturity'],
  },
  {
    id: 'temporal-split',
    term: 'Time-based split',
    short: 'Splitting training and test data by time (train on earlier cutoffs, test on a later one) instead of at random, so evaluation looks like real use: predicting a future the model has not seen.',
    introducedIn: 'sql/analytics/ml-features',
    aliases: ['temporal split', 'out-of-time validation'],
  },
] satisfies GlossaryTerm[];
