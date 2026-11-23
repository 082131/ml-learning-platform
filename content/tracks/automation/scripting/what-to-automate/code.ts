// Code for "What to automate, and when it pays". The worth experiment is pure arithmetic (src/lib/automation/worth.ts,
// unit-tested). worth.py prints exactly what the readout shows; it runs under CPython 3.13 and Pyodide.
import { worthExperiment } from '@/lib/automation/experiments';
import type { WorthInput } from '@/lib/automation/worth';
import type { CodeExample } from '@/lib/types';

export const worth = worthExperiment('auto-worth');

const num = (x: number) => String(x);

export const worthCode: CodeExample = {
  id: 'worth-py',
  language: 'python',
  source: `WEEKS_PER_MONTH = 52 / 12

manual_min, automated_min = {{manual}}, {{auto}}   # minutes per run, before and after
runs_per_week = {{runs}}
build_h, maintain_h_per_month = {{build}}, {{maintain}}

saved = (manual_min - automated_min) * runs_per_week * WEEKS_PER_MONTH / 60
net = saved - maintain_h_per_month
balance = -build_h
for month in range(1, 13):
    balance += net
    if balance >= 0:
        print(f"pays back in month {month}")
        break
else:
    print("does not pay back within a year")
print(f"saved {saved:.1f} h/month, net {net:.1f} h/month")`,
  slots: {
    manual: (s) => num((s as WorthInput).manualMinutes),
    auto: (s) => num((s as WorthInput).automatedMinutes),
    runs: (s) => num((s as WorthInput).runsPerWeek),
    build: (s) => num((s as WorthInput).buildHours),
    maintain: (s) => num((s as WorthInput).maintainHoursPerMonth),
  },
  annotations: [
    {
      id: 'weeks',
      range: { line: 1 },
      kind: 'math',
      title: 'Weeks per month',
      what: '52 weeks / 12 months ≈ 4.33.',
      why: 'Using 4 undercounts a year of savings by about 8%.',
    },
    {
      id: 'automated',
      range: { line: 3 },
      kind: 'variable',
      title: 'Minutes still spent',
      what: 'Automation rarely reaches zero: someone reads the report, checks the alert, fixes the odd failure.',
      why: 'Leaving this out is the most common reason automation estimates are too rosy.',
    },
    {
      id: 'maintain',
      range: { line: 5 },
      kind: 'variable',
      title: 'Maintenance',
      what: 'Hours per month spent keeping it working: an API changes, a path moves, a credential expires.',
      why: 'Scripts are software. They rot when the world around them changes.',
    },
    {
      id: 'saved',
      range: { line: 7 },
      kind: 'math',
      title: 'Hours saved per month',
      what: '(manual − automated) minutes × runs per week × 4.33 weeks ÷ 60.',
      why: 'The same formula as the chart above, with the same inputs.',
    },
    {
      id: 'loop',
      range: { line: 10 },
      kind: 'syntax',
      title: 'for ... else',
      what: 'The else branch runs only if the loop finished without break.',
      why: 'A neat way to say "never paid back" without a flag variable.',
    },
  ],
};

export const toilLog: CodeExample = {
  id: 'toil-log',
  language: 'python',
  run: 'pyodide',
  source: `# A week of a data scientist's chores, logged before deciding what to automate.
chores = [
    # (task, minutes each time, times per week, needs judgment?)
    ("download the sales export and rename it", 10, 5, False),
    ("rerun the notebook and paste the chart into slides", 25, 1, False),
    ("check the nightly training run finished", 5, 7, False),
    ("label 50 ambiguous support tickets", 40, 2, True),
    ("decide whether to ship the retrained model", 30, 1, True),
]

WEEKS_PER_MONTH = 52 / 12
candidates = [(t, m * n * WEEKS_PER_MONTH / 60) for t, m, n, judgment in chores if not judgment]
for task, hours in sorted(candidates, key=lambda c: -c[1]):
    print(f"{hours:5.1f} h/month  {task}")
print(f"{sum(h for _, h in candidates):5.1f} h/month of toil in total")`,
  expectedOutput: `  3.6 h/month  download the sales export and rename it
  2.5 h/month  check the nightly training run finished
  1.8 h/month  rerun the notebook and paste the chart into slides
  7.9 h/month of toil in total`,
  annotations: [
    {
      id: 'judgment',
      range: { line: 3 },
      kind: 'variable',
      title: 'Needs judgment?',
      what: 'Labelling hard cases and deciding to ship are judgment calls, not toil.',
      why: 'Automate the steps around a decision (gather the evidence, prepare the report) and keep the decision human.',
    },
    {
      id: 'sort',
      range: { line: 13 },
      kind: 'function',
      title: 'Biggest first',
      what: 'Sorts the candidates by hours per month, largest first.',
      why: 'Start with the chore that costs the most; small, rare chores rarely pay back.',
    },
  ],
};
