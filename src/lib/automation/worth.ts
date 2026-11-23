// Is an automation worth building? Time saved against time spent building and maintaining it, month by month.
// Pure arithmetic on the visible inputs; the lesson shows the formula next to the chart.

export interface WorthInput {
  /** Minutes the manual task takes each time. */
  manualMinutes: number;
  /** Minutes a person still spends per run once it is automated (checking the output, for example). */
  automatedMinutes: number;
  runsPerWeek: number;
  /** Hours to build the first version. */
  buildHours: number;
  /** Hours per month to keep it working (broken APIs, changed paths, alerts). */
  maintainHoursPerMonth: number;
  horizonMonths: number;
}

export interface WorthResult {
  /** Hours saved per month: (manual - automated) * runs per week * weeks per month / 60. */
  savedPerMonth: number;
  /** Net hours per month after maintenance. */
  netPerMonth: number;
  /** Cumulative net hours at the end of each month (index 0 = month 0, before any savings: -buildHours). */
  cumulative: number[];
  /** First whole month at which the cumulative net is >= 0, or null if it never pays back within the horizon. */
  breakEvenMonth: number | null;
  /** Net hours at the end of the horizon. */
  totalNet: number;
}

/** Weeks in an average month: 52 weeks / 12 months. */
export const WEEKS_PER_MONTH = 52 / 12;

const round1 = (x: number) => Math.round(x * 10) / 10;

export function worthIt(i: WorthInput): WorthResult {
  const saved = ((i.manualMinutes - i.automatedMinutes) * i.runsPerWeek * WEEKS_PER_MONTH) / 60;
  const net = saved - i.maintainHoursPerMonth;
  const cumulative = [-i.buildHours];
  for (let m = 1; m <= i.horizonMonths; m++) cumulative.push(-i.buildHours + net * m);
  // Compare after rounding, so floating-point noise (−1e-15) does not move the break-even month.
  const idx = cumulative.findIndex((v) => Math.round(v * 1e6) / 1e6 >= 0);
  return {
    savedPerMonth: round1(saved),
    netPerMonth: round1(net),
    cumulative: cumulative.map(round1),
    breakEvenMonth: idx === -1 ? null : idx,
    totalNet: round1(cumulative[cumulative.length - 1]!),
  };
}
