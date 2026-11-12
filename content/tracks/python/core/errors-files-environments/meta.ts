import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/core/errors-files-environments',
  title: 'Errors, files and environments',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Read a traceback from the bottom up and find the line that failed',
    'Raise and catch specific exceptions, and know when not to catch one',
    'Read and write text, CSV and JSON files with pathlib and with-blocks',
    'Set up a virtual environment with pinned requirements so a project runs the same elsewhere',
  ],
  prerequisites: ['python/core/classes-dataclasses'],
  concepts: ['exception', 'traceback', 'context-manager', 'virtual-environment'],
  references: [
    {
      title: 'Python tutorial: errors and exceptions',
      url: 'https://docs.python.org/3.13/tutorial/errors.html',
      version: 'Python 3.13',
    },
    {
      title: 'pathlib',
      url: 'https://docs.python.org/3.13/library/pathlib.html',
      version: 'Python 3.13',
    },
    {
      title: 'csv',
      url: 'https://docs.python.org/3.13/library/csv.html',
      version: 'Python 3.13',
    },
    {
      title: 'venv: creation of virtual environments',
      url: 'https://docs.python.org/3.13/library/venv.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
