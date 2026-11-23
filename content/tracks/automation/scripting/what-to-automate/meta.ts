import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/scripting/what-to-automate',
  title: 'What to automate, and when it pays',
  level: 'beginner',
  minutes: 30,
  kind: 'lesson',
  objectives: [
    'Recognise toil in ML and data work, and the parts of a task that should stay manual',
    'Estimate whether an automation pays back, including its maintenance',
    'Climb the automation ladder: runbook, script, scheduled job, pipeline, self-service',
    'Name the properties every automation needs: idempotent, observable, safe to stop',
  ],
  prerequisites: [],
  concepts: ['toil', 'break-even-point', 'runbook', 'idempotent'],
  references: [
    { title: 'Google SRE book, chapter 5: Eliminating Toil', url: 'https://sre.google/sre-book/eliminating-toil/' },
    { title: 'Google SRE workbook: Eliminating Toil', url: 'https://sre.google/workbook/eliminating-toil/' },
    { title: 'Python documentation: pathlib', url: 'https://docs.python.org/3/library/pathlib.html', version: '3.13' },
  ],
} satisfies LessonMeta;
