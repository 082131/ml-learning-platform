import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/scheduling/cron-schedules',
  title: 'Scheduling with cron',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Read and write five-field cron expressions, including lists, ranges, steps and names',
    'Predict the day-of-month OR day-of-week rule and avoid its surprises',
    'Choose where a schedule runs: crontab, systemd timers, GitHub Actions, or an orchestrator',
    'Handle time zones, missed runs, overlapping runs and silent non-starts',
  ],
  prerequisites: ['automation/scripting/cli-scripts'],
  concepts: ['cron-expression', 'heartbeat-monitor', 'job-overlap', 'exit-code'],
  references: [
    { title: 'crontab(5), cronie', url: 'https://man7.org/linux/man-pages/man5/crontab.5.html' },
    { title: 'GitHub Docs: Events that trigger workflows (schedule)', url: 'https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule' },
    { title: 'systemd.timer(5)', url: 'https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html' },
    { title: 'croniter (used to cross-check the explorer)', url: 'https://pypi.org/project/croniter/', version: '7.0.0' },
  ],
} satisfies LessonMeta;
