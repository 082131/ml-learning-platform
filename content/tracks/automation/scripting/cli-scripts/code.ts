// Code for "Command-line scripts". organize.py was run under CPython 3.13: the output below is copied from that run
// and checked by content/tracks/automation/python-outputs.test.ts. It uses only the standard library, so it also
// runs in the browser (Pyodide has an in-memory file system). The plan view uses src/lib/automation/organize.ts,
// which follows the same rules.
import { organizeExperiment } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const organize = organizeExperiment('auto-organize');

export const organizeScript: CodeExample = {
  id: 'organize-py',
  language: 'python',
  run: 'pyodide',
  source: `import argparse
import logging
import sys
import tempfile
from pathlib import Path

RULES = {".csv": "data", ".parquet": "data", ".py": "code", ".ipynb": "code", ".png": "figures", ".jpg": "figures"}
log = logging.getLogger("organize")

def plan(folder):
    """Yield (source, destination) for every top-level file a rule covers."""
    for path in sorted(folder.iterdir()):
        target = RULES.get(path.suffix.lower())
        if path.is_file() and target:
            yield path, folder / target / path.name

def main(argv=None):
    parser = argparse.ArgumentParser(description="Sort files into folders by type.")
    parser.add_argument("folder", type=Path, help="the folder to organize")
    parser.add_argument("--dry-run", action="store_true", help="print the plan, change nothing")
    args = parser.parse_args(argv)
    if not args.folder.is_dir():
        log.error("not a folder: %s", args.folder)
        return 2
    conflicts = moved = 0
    for src, dst in plan(args.folder):
        if dst.exists():
            log.warning("skip %s: %s already exists", src.name, dst.relative_to(args.folder))
            conflicts += 1
            continue
        log.info("%s %s -> %s", "would move" if args.dry_run else "move", src.name, dst.relative_to(args.folder))
        if not args.dry_run:
            dst.parent.mkdir(exist_ok=True)
            src.rename(dst)
        moved += 1
    log.info("%d %s, %d conflicts", moved, "planned" if args.dry_run else "moved", conflicts)
    return 1 if conflicts else 0

logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(message)s", stream=sys.stdout, force=True)
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    for name in ["sales.csv", "churn.ipynb", "loss.png", "README.txt", "train.py"]:
        (root / name).write_text("demo")
    (root / "data").mkdir()
    (root / "data" / "sales.csv").write_text("older copy")
    for argv in ([tmp, "--dry-run"], [tmp], [tmp]):
        print(f"$ organize {' '.join(a if a != tmp else 'downloads/' for a in argv)}")
        print(f"exit code {main(argv)}")`,
  expectedOutput: `$ organize downloads/ --dry-run
INFO    would move churn.ipynb -> code/churn.ipynb
INFO    would move loss.png -> figures/loss.png
WARNING skip sales.csv: data/sales.csv already exists
INFO    would move train.py -> code/train.py
INFO    3 planned, 1 conflicts
exit code 1
$ organize downloads/
INFO    move churn.ipynb -> code/churn.ipynb
INFO    move loss.png -> figures/loss.png
WARNING skip sales.csv: data/sales.csv already exists
INFO    move train.py -> code/train.py
INFO    3 moved, 1 conflicts
exit code 1
$ organize downloads/
WARNING skip sales.csv: data/sales.csv already exists
INFO    0 moved, 1 conflicts
exit code 1`,
  annotations: [
    {
      id: 'rules-as-data',
      range: { line: 7 },
      kind: 'variable',
      title: 'Rules as data',
      what: 'A dict from file extension to folder.',
      why: 'Changing the behaviour means editing data, not logic, and the rules are easy to print or test.',
    },
    {
      id: 'plan-then-act',
      range: { line: 10 },
      kind: 'function',
      title: 'Plan, then act',
      what: 'plan() only decides; main() does the moving.',
      why: 'Separating the decision from the side effect is what makes a dry run trivial and testable.',
    },
    {
      id: 'sorted',
      range: { line: 12 },
      kind: 'function',
      title: 'sorted()',
      what: 'iterdir() returns files in arbitrary order; sorting makes runs and logs reproducible.',
      why: 'Deterministic output is easier to review and to compare between runs.',
    },
    {
      id: 'argparse',
      range: { line: 18 },
      kind: 'framework',
      title: 'argparse',
      what: 'The standard-library parser: it builds --help and checks arguments for you.',
      why: 'A CLI instead of edited constants means the same script works on any folder, and in a scheduler.',
    },
    {
      id: 'dry-run',
      range: { line: 20 },
      kind: 'parameter',
      title: '--dry-run',
      what: 'A flag: True when given, False otherwise.',
      why: 'Every script that moves, deletes or sends should be able to say what it would do first.',
    },
    {
      id: 'exit-code-2',
      range: { line: 24 },
      kind: 'syntax',
      title: 'Exit code 2',
      what: 'By convention 2 means the script was called wrongly (argparse itself exits with 2 on bad arguments).',
      why: 'Schedulers and CI read exit codes: 0 is success, anything else is a failure worth alerting on.',
    },
    {
      id: 'never-overwrite',
      range: { line: 27 },
      kind: 'syntax',
      title: 'Never overwrite',
      what: 'A file already at the destination is reported and left alone.',
      why: 'rename() silently replaces an existing file on POSIX systems. Checking first turns data loss into a warning.',
    },
    {
      id: 'exist_ok-true',
      range: { line: 33 },
      kind: 'function',
      title: 'exist_ok=True',
      what: 'Creates the folder unless it exists.',
      why: 'Idempotent by design: the second run does not crash on a folder the first run made.',
    },
    {
      id: 'partial-success',
      range: { line: 37 },
      kind: 'syntax',
      title: 'Partial success',
      what: 'Exit 1 when some files were skipped.',
      why: 'A run that left work undone should not look like success to whatever runs it.',
    },
    {
      id: 'logging-not-print',
      range: { line: 39 },
      kind: 'framework',
      title: 'logging, not print',
      what: 'Levels (INFO, WARNING, ERROR), one format, one place to change where logs go.',
      why: 'A scheduled job has no one watching its screen. Logs are how you find out what it did at 3 a.m.',
    },
  ],
};

export const shellUse: CodeExample = {
  id: 'organize-shell',
  language: 'bash',
  source: `python organize.py ~/Downloads --dry-run      # read the plan first
python organize.py ~/Downloads && echo "all sorted" || echo "needs attention (exit $?)"
python organize.py --help                        # argparse writes this for you
python organize.py                               # missing argument: argparse prints usage, exits 2`,
  annotations: [
    {
      id: 'and-or',
      range: { line: 2 },
      kind: 'syntax',
      title: '&& and ||',
      what: '&& runs the next command only if the previous one exited 0; || only if it did not.',
      why: 'This is how shells, cron wrappers and CI steps chain work. A script that always exits 0 breaks every chain it is in.',
    },
    {
      id: 'exit2',
      range: { line: 4 },
      kind: 'syntax',
      title: 'Usage errors',
      what: 'argparse prints "error: the following arguments are required: folder" and exits with status 2.',
      why: 'You get argument checking and a help page without writing either.',
    },
  ],
};
