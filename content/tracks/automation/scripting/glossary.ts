import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the automation/scripting chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'toil',
    term: 'Toil',
    short: 'Manual, repetitive work that scales with the size of the system and leaves nothing lasting behind: the work automation is for.',
    long: 'The term comes from Google’s Site Reliability Engineering book, which describes toil as manual, repetitive, automatable, tactical, without enduring value, and growing linearly with the service.',
    introducedIn: 'automation/scripting/what-to-automate',
  },
  {
    id: 'break-even-point',
    term: 'Break-even point',
    short: 'The moment the time an automation has saved equals the time spent building and maintaining it. After it, the automation is a net gain.',
    introducedIn: 'automation/scripting/what-to-automate',
  },
  {
    id: 'runbook',
    term: 'Runbook',
    short: 'Written step-by-step instructions for a recurring operational task. A good runbook is the first draft of an automation.',
    introducedIn: 'automation/scripting/what-to-automate',
  },
  {
    id: 'cli',
    term: 'Command-line interface (CLI)',
    short: 'A program you run from a terminal, configured with arguments and options such as --dry-run, instead of by editing its code.',
    introducedIn: 'automation/scripting/cli-scripts',
    aliases: ['CLI', 'command-line tool'],
  },
  {
    id: 'dry-run',
    term: 'Dry run',
    short: 'A mode in which a script reports what it would do without changing anything. The safe first run of any automation that moves, deletes or sends.',
    introducedIn: 'automation/scripting/cli-scripts',
    aliases: ['--dry-run'],
  },
  {
    id: 'exit-code',
    term: 'Exit code',
    short: 'The number a process returns when it ends: 0 means success, anything else means failure. Schedulers, CI and shells decide what to do next from it.',
    introducedIn: 'automation/scripting/cli-scripts',
    aliases: ['exit status', 'return code'],
  },
] satisfies GlossaryTerm[];
