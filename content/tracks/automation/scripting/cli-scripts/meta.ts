import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/scripting/cli-scripts',
  title: 'Command-line scripts with argparse, pathlib and logging',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Turn a notebook chore into a script with arguments, a --dry-run mode and a --help page',
    'Work with files safely using pathlib: plan first, never overwrite, create folders idempotently',
    'Report what happened with logging and meaningful exit codes',
    'Run the same script by hand, from a shell chain, or from a scheduler',
  ],
  prerequisites: ['automation/scripting/what-to-automate'],
  concepts: ['cli', 'dry-run', 'exit-code', 'idempotent'],
  references: [
    { title: 'Python documentation: argparse', url: 'https://docs.python.org/3/library/argparse.html', version: '3.13' },
    { title: 'Python documentation: pathlib', url: 'https://docs.python.org/3/library/pathlib.html', version: '3.13' },
    { title: 'Python documentation: logging HOWTO', url: 'https://docs.python.org/3/howto/logging.html', version: '3.13' },
    { title: 'Python documentation: sys.exit', url: 'https://docs.python.org/3/library/sys.html#sys.exit', version: '3.13' },
  ],
} satisfies LessonMeta;
