// Code for "Scheduling with cron". The explorer's next-run times come from src/lib/automation/cron.ts, which follows
// Vixie cron / cronie semantics and is checked against croniter 7.0.0 in automation.test.ts (croniter differs from
// cronie on "*/n" in a day field; the lesson says so). The crontab and workflow files are configuration, not run here.
import { cronExperiment, type CronState } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const cron = cronExperiment('auto-cron');

export const crontab: CodeExample = {
  id: 'crontab',
  language: 'bash',
  source: `# crontab -e   (fields: minute hour day-of-month month day-of-week   command)
CRON_TZ=UTC
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=""

# Nightly feature export at 02:00 UTC. flock skips the run if last night's is still going.
0 2 * * *  cd /srv/ml && flock -n /tmp/export.lock .venv/bin/python export_features.py >> logs/export.log 2>&1

# Weekdays every 15 minutes during working hours: check the serving endpoint, then ping the heartbeat on success.
*/15 9-17 * * 1-5  /srv/ml/.venv/bin/python /srv/ml/check_endpoint.py && curl -fsS -m 10 https://hc.example.com/ping/endpoint-check`,
  annotations: [
    {
      id: 'tz',
      range: { line: 2 },
      kind: 'syntax',
      title: 'CRON_TZ',
      what: 'cronie evaluates the schedule lines below in this time zone. Without it, cron uses the system time zone.',
      why: 'In a zone with daylight saving time, a 02:30 job is shifted, skipped or run twice on the changeover nights, depending on the scheduler. UTC has no changeovers.',
    },
    {
      id: 'path',
      range: { line: 4 },
      kind: 'syntax',
      title: 'A minimal environment',
      what: 'cron starts jobs with a tiny PATH and none of your shell profile.',
      why: '"Works in my terminal, fails from cron" is almost always a missing PATH entry, virtual environment or variable. Use absolute paths.',
    },
    {
      id: 'flock',
      range: { line: 8, startCol: 25, endCol: 50 },
      kind: 'function',
      title: 'flock -n',
      what: 'Takes an exclusive lock on the file, or exits at once (-n) if another process holds it.',
      why: 'cron starts a new run on schedule whether or not the previous one finished. The lock prevents overlapping runs.',
    },
    {
      id: 'redirect',
      range: { line: 8, startCol: 87, endCol: 110 },
      match: '>> logs/export.log 2>&1',
      kind: 'syntax',
      title: 'Keep the output',
      what: 'Appends stdout and stderr to a log file.',
      why: 'Otherwise cron mails the output (if mail is set up) or throws it away, and you have nothing to debug with.',
    },
    {
      id: 'heartbeat',
      range: { line: 11, startCol: 70, endCol: 131 },
      match: '&& curl -fsS -m 10 https://hc.example.com/ping/endpoint-check',
      kind: 'function',
      title: 'Heartbeat ping',
      what: 'Pings a monitoring service only if the check exited 0.',
      why: 'The monitor alerts when pings STOP arriving, which catches the job that never ran: a dead machine, a broken crontab, a full disk.',
    },
  ],
};

export const ghSchedule: CodeExample = {
  id: 'gh-schedule',
  language: 'yaml',
  source: `# .github/workflows/nightly.yml
name: nightly-retrain-check
on:
  schedule:
    - cron: "{{expr}}"     # always UTC
  workflow_dispatch:                # a "Run workflow" button for manual runs
concurrency:
  group: nightly
  cancel-in-progress: false         # queue a new run rather than overlap
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v5
      - run: python scripts/check_drift.py --fail-on-drift`,
  slots: { expr: (s) => (s as CronState).expr },
  annotations: [
    {
      id: 'cron',
      range: { line: 5 },
      kind: 'syntax',
      title: 'schedule: cron',
      what: 'The expression from the explorer. GitHub evaluates it in UTC and runs the workflow file on the default branch.',
      why: 'GitHub documents that scheduled runs can be delayed during periods of high load, that the shortest interval is every 5 minutes, and that in public repositories schedules are disabled after 60 days without repository activity.',
    },
    {
      id: 'dispatch',
      range: { line: 6 },
      kind: 'syntax',
      title: 'workflow_dispatch',
      what: 'Adds a button (and an API call) to run the workflow on demand.',
      why: 'You will want to rerun a scheduled job by hand after fixing it, without waiting for tomorrow.',
    },
    {
      id: 'concurrency',
      range: { line: 7 },
      kind: 'syntax',
      title: 'concurrency',
      what: 'At most one run in the group at a time; a new one waits (cancel-in-progress: false).',
      why: 'The workflow equivalent of flock: no overlapping runs.',
    },
    {
      id: 'timeout',
      range: { line: 13 },
      kind: 'parameter',
      title: 'timeout-minutes',
      what: 'Kills the job after 30 minutes (the default is 360).',
      why: 'A hung job should fail fast and loudly, not hold a runner and block tomorrow’s run.',
    },
  ],
};

export const systemdTimer: CodeExample = {
  id: 'systemd-timer',
  language: 'toml',
  source: `# /etc/systemd/system/export-features.timer   (INI syntax; pairs with export-features.service)
[Unit]
Description=Nightly feature export

[Timer]
OnCalendar=*-*-* 02:00:00 UTC
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target`,
  annotations: [
    {
      id: 'oncalendar',
      range: { line: 6 },
      kind: 'syntax',
      title: 'OnCalendar',
      what: 'systemd’s calendar syntax: every day at 02:00 UTC.',
      why: 'Same idea as cron, with an explicit time zone and seconds.',
    },
    {
      id: 'persistent',
      range: { line: 7 },
      kind: 'parameter',
      title: 'Persistent=true',
      what: 'If the machine was off at 02:00, run once as soon as it is back.',
      why: 'Plain cron simply skips runs it missed while the machine was down.',
    },
    {
      id: 'random',
      range: { line: 8 },
      kind: 'parameter',
      title: 'RandomizedDelaySec',
      what: 'Delays each run by a random amount up to 5 minutes.',
      why: 'Spreads load when many machines share the same schedule: jitter, as in the retries lesson.',
    },
  ],
};
