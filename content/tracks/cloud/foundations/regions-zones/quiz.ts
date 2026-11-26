import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'third-copy',
    type: 'choice',
    prompt: 'A service runs 2 VMs in one zone (zone 99.9%, each VM 99%). A teammate adds a third VM in the same zone. What happens to the yearly downtime, and why?',
    options: [
      { text: 'It falls by about a third, since each VM carries a third of the risk', correct: false, explain: 'Copies do not share risk evenly; they fail together only rarely. The real limit here is the zone, not the VMs.' },
      { text: 'It barely changes: the zone’s own 99.9% is now the ceiling', correct: true, explain: 'With two VMs the chance both are down is already 0.0001. The zone’s 0.001 dominates, and a third VM in the same building cannot help with that. A VM in a second zone would.' },
      { text: 'It rises, because more machines mean more things to fail', correct: false, explain: 'More copies in parallel never lower the chance that at least one is up. They add cost, not risk.' },
    ],
  },
  {
    id: 'nines-hours',
    type: 'numeric',
    prompt: 'A model endpoint is 99.95% available. How many hours a year is it expected to be down? (Use 8,760 hours per year.)',
    answer: 4.38,
    tolerance: 0.01,
    hint: 'Down fraction = 1 − 0.9995. Multiply by the hours in a year.',
    explain: '0.0005 × 8,760 = 4.38 hours a year, about 22 minutes a month.',
  },
  {
    id: 'parallel-math',
    type: 'numeric',
    prompt: 'Three independent copies, each up 90% of the time, and any one of them is enough. What is the chance the service is up, as a percentage?',
    answer: 99.9,
    tolerance: 0.001,
    hint: 'All three must be down together for the service to be down: 0.1 × 0.1 × 0.1.',
    explain: '1 − 0.1³ = 1 − 0.001 = 0.999, so 99.9%. Three unreliable copies make one reliable service, if their failures really are independent.',
  },
  {
    id: 'independence',
    type: 'choice',
    prompt: 'Your service runs in three zones. A config change with a typo is deployed to all copies and every one of them crashes. Why did the redundancy not help?',
    options: [
      { text: 'Three zones are too few; four would have kept one copy running', correct: false, explain: 'Every copy got the same bad config, so a fourth zone would have crashed too.' },
      { text: 'The failures were not independent: one cause hit every copy at once', correct: true, explain: 'The 1 − (1 − p)ⁿ formula assumes copies fail separately. A shared cause (a bad deploy, an expired certificate) makes them fail together. Staged rollouts and canaries address this, not more zones.' },
      { text: 'Zones share a control plane, so a crash in one spreads to all three', correct: false, explain: 'Zones are built to fail separately. The common cause here was your deploy, not the provider.' },
    ],
  },
  {
    id: 'region-choice',
    type: 'choice',
    prompt: 'You will fine-tune a model weekly on 30 TB of logs stored in eu-west-1. Your team sits in California and the GPUs you want are also offered in eu-west-1. Where should training run?',
    options: [
      { text: 'us-west-1, close to the team, for faster notebooks', correct: false, explain: 'Notebook latency is a minor cost. Reading 30 TB across regions every week is a large transfer bill and a slow start for every run.' },
      { text: 'eu-west-1, where the data already is', correct: true, explain: 'Training reads the data many times. Keeping compute next to the data avoids cross-region transfer charges and time; the GPUs are available there too.' },
      { text: 'Both regions, and split the dataset between them', correct: false, explain: 'Splitting doubles the operational work and still moves data whenever a run needs all of it.' },
    ],
  },
  {
    id: 'responsibility',
    type: 'choice',
    prompt: 'A training bucket is readable by anyone on the internet because of its access settings. Under the shared responsibility model, whose problem is it?',
    options: [
      { text: 'The provider’s, because storage security is part of the cloud', correct: false, explain: 'The provider secures the storage service itself. Who you let in is your configuration.' },
      { text: 'Yours, because access to your data is configured by you', correct: true, explain: 'Security “in” the cloud (data, identities, access settings, network rules) is the customer’s side. The provider gives you the controls, such as Block Public Access, but you must use them.' },
      { text: 'Nobody’s, because the bucket’s settings allowed it', correct: false, explain: 'Allowed is not the same as intended. The setting was a choice on your side of the model.' },
    ],
  },
];

export const layoutExercise: Exercise = {
  id: 'cloud-layout-availability',
  prompt:
    'Write `layout_availability(instance, zone, region, per_zone, zones, regions=1)`. It returns the chance the service is up when `per_zone` copies run in each of `zones` zones in each of `regions` regions, using the two rules: layers in series multiply, and copies in parallel give 1 − (1 − p)ⁿ. Then write `downtime_hours(p)`, the expected hours down per year (8,760 hours).',
  starter: `def layout_availability(instance, zone, region, per_zone, zones, regions=1):
    return instance

def downtime_hours(p):
    return 0`,
  hints: [
    'Write any_up(p, n) = 1 − (1 − p) ** n first.',
    'zone_ok = zone × any_up(instance, per_zone); region_ok = region × any_up(zone_ok, zones); then any_up(region_ok, regions).',
  ],
  solution: `def any_up(p, n):
    return 1 - (1 - p) ** n

def layout_availability(instance, zone, region, per_zone, zones, regions=1):
    zone_ok = zone * any_up(instance, per_zone)
    region_ok = region * any_up(zone_ok, zones)
    return any_up(region_ok, regions)

def downtime_hours(p):
    return (1 - p) * 8760`,
  explanation:
    'The function mirrors the layout from the inside out: copies inside a zone, zones inside a region, regions in the world. Each level is “this layer is up AND one of the things inside it serves”.',
  tests: `assert abs(layout_availability(0.99, 0.999, 0.9999, 1, 1) - 0.988911099) < 1e-9
assert abs(downtime_hours(layout_availability(0.99, 0.999, 0.9999, 2, 1)) - 10.5) < 0.05
assert abs(downtime_hours(layout_availability(0.99, 0.999, 0.9999, 1, 2)) - 1.93) < 0.01
assert layout_availability(0.99, 0.999, 0.9999, 1, 2, 2) > layout_availability(0.99, 0.999, 0.9999, 1, 2, 1)
assert abs(downtime_hours(0.999) - 8.76) < 1e-9`,
};
