// How redundancy across instances, availability zones and regions changes the chance that a service is up.
// Pure arithmetic on the visible inputs, assuming failures are independent (the lesson labels that simplification).

export interface Layout {
  /** Chance one instance (VM, container) is up at a random moment, as a fraction, e.g. 0.995. */
  instance: number;
  /** Chance one availability zone (data centre group) is up. */
  zone: number;
  /** Chance one region (its control plane and shared services) is up. */
  region: number;
  replicasPerZone: number;
  zonesPerRegion: number;
  regions: number;
}

export interface AvailabilityResult {
  /** Chance a zone has at least one healthy replica: zone × (1 − (1 − instance)^replicas). */
  zoneServes: number;
  /** Chance a region serves: region × (1 − (1 − zoneServes)^zones). */
  regionServes: number;
  /** Chance at least one region serves: 1 − (1 − regionServes)^regions. */
  service: number;
  /** Expected hours down per year: (1 − service) × 8760. */
  downHoursPerYear: number;
  /** The same in minutes per 30-day month. */
  downMinutesPerMonth: number;
  /** Number of instances you pay for. */
  instances: number;
}

export const HOURS_PER_YEAR = 8760;
export const MINUTES_PER_MONTH = 30 * 24 * 60;

/** Probability that at least one of n independent copies is up, each up with probability p. */
export function anyUp(p: number, n: number): number {
  return 1 - (1 - p) ** n;
}

export function availability(l: Layout): AvailabilityResult {
  const zoneServes = l.zone * anyUp(l.instance, l.replicasPerZone);
  const regionServes = l.region * anyUp(zoneServes, l.zonesPerRegion);
  const service = anyUp(regionServes, l.regions);
  return {
    zoneServes,
    regionServes,
    service,
    downHoursPerYear: (1 - service) * HOURS_PER_YEAR,
    downMinutesPerMonth: (1 - service) * MINUTES_PER_MONTH,
    instances: l.replicasPerZone * l.zonesPerRegion * l.regions,
  };
}

/** "99.95%" style text with enough nines to tell layouts apart. */
export function percent(p: number): string {
  if (p >= 1) return '100%';
  const nines = Math.max(2, Math.min(8, Math.floor(-Math.log10(1 - p)) + 1));
  return `${(p * 100).toFixed(nines - 1)}%`;
}

/** A duration in hours shown in the most readable unit. */
export function duration(hours: number): string {
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  if (hours >= 1) return `${hours.toFixed(1)} h`;
  const min = hours * 60;
  if (min >= 1) return `${min.toFixed(1)} min`;
  return `${(min * 60).toFixed(1)} s`;
}
