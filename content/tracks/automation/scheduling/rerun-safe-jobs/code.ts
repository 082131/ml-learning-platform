// Code for "Jobs that are safe to rerun". The explorer uses src/lib/automation/rerun.ts (unit-tested). rerun_demo.py
// uses the standard library's sqlite3 (SQLite's ON CONFLICT upsert needs SQLite 3.24 or newer); it runs under
// CPython 3.13 and in Pyodide, and its output is checked by python-outputs.test.ts.
import { rerunExperiment } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const rerun = rerunExperiment('auto-rerun');

export const rerunDemo: CodeExample = {
  id: 'rerun-demo',
  language: 'python',
  run: 'pyodide',
  source: `import sqlite3

def load(db, rows, mode, crash_after=None):
    """Write scores for customers after the last checkpoint; save a checkpoint every 5 customers."""
    done = db.execute("SELECT COALESCE(MAX(last_id), 0) FROM checkpoint").fetchone()[0]
    for n, (cid, score) in enumerate(r for r in rows if r[0] > done):
        if n == crash_after:
            db.rollback()                         # the process dies: uncommitted work is lost
            return f"crashed after {n} rows"
        if mode == "upsert":
            db.execute("INSERT INTO scores VALUES (?, ?) "
                       "ON CONFLICT(customer_id) DO UPDATE SET score = excluded.score", (cid, score))
        else:
            db.execute("INSERT INTO scores VALUES (?, ?)", (cid, score))
        if mode != "one transaction":
            db.commit()                           # each row is committed on its own
        if cid % 5 == 0:
            db.execute("INSERT INTO checkpoint VALUES (?)", (cid,))
            db.commit()                           # in "one transaction" mode: rows + checkpoint together
    db.commit()
    return "finished"

rows = [(i, round(i * 0.07, 2)) for i in range(1, 13)]   # 12 customers
for mode in ("append", "upsert", "one transaction"):
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE scores (customer_id INTEGER %s, score REAL)" % ("PRIMARY KEY" if mode == "upsert" else ""))
    db.execute("CREATE TABLE checkpoint (last_id INTEGER)")
    first = load(db, rows, mode, crash_after=8)
    second = load(db, rows, mode)                 # the rerun resumes after the last checkpoint
    total, distinct = db.execute("SELECT COUNT(*), COUNT(DISTINCT customer_id) FROM scores").fetchone()
    print(f"{mode:16} run 1 {first}, run 2 {second}: {total} rows for {distinct} customers")`,
  expectedOutput: `append           run 1 crashed after 8 rows, run 2 finished: 15 rows for 12 customers
upsert           run 1 crashed after 8 rows, run 2 finished: 12 rows for 12 customers
one transaction  run 1 crashed after 8 rows, run 2 finished: 12 rows for 12 customers`,
  annotations: [
    {
      id: 'read-the-checkpoint',
      range: { line: 5 },
      kind: 'function',
      title: "Read the checkpoint",
      what: "The highest customer id a previous run committed as done (0 if none).",
      why: "The rerun skips work that is already durable instead of starting over.",
    },
    {
      id: 'simulated-crash',
      range: { line: 8 },
      kind: 'syntax',
      title: "Simulated crash",
      what: "A killed process loses everything it had not committed.",
      why: "Real crashes (out of memory, a pre-empted VM, a deploy) do exactly this, at the worst moment.",
    },
    {
      id: 'upsert',
      range: { line: 12 },
      kind: 'syntax',
      title: "Upsert",
      what: "Insert the row, or update it if the key already exists.",
      why: "Writing the same key twice leaves one row, so a rerun cannot duplicate.",
    },
    {
      id: 'commit-per-row',
      range: { line: 16 },
      kind: 'syntax',
      title: "Commit per row",
      what: "Every row is durable as soon as it is written, but the checkpoint only every 5 rows.",
      why: "The gap between the two is where duplicates come from: rows 6-8 are saved, the checkpoint still says 5.",
    },
    {
      id: 'rows-and-checkpoint-together',
      range: { line: 19 },
      kind: 'syntax',
      title: "Rows and checkpoint together",
      what: "In that mode rows are committed only with their checkpoint, in one transaction.",
      why: "Either both are saved or neither is, so the checkpoint never lags the data. Plain INSERT is then exactly-once.",
    },
  ],
};

export const atomicWrite: CodeExample = {
  id: 'atomic-write',
  language: 'python',
  source: `import os
import tempfile
from pathlib import Path

def write_atomically(path: Path, text: str) -> None:
    """Readers see the old file or the complete new one, never a half-written file."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())            # make sure the bytes are on disk
        os.replace(tmp, path)               # atomic rename on the same file system
    except BaseException:
        os.unlink(tmp)
        raise

# Partitioned output: rerunning a day replaces that day's file and nothing else.
day = "2026-11-22"
write_atomically(Path(f"scores/day={day}/part-0.csv"), "customer_id,score\\n1,0.07\\n")`,
  annotations: [
    {
      id: 'temp-file-next-to-the-target',
      range: { line: 7 },
      kind: 'function',
      title: "Temp file next to the target",
      what: "Creates a uniquely named temporary file in the same folder.",
      why: "os.replace is atomic only within one file system; a temp file in /tmp could be on another.",
    },
    {
      id: 'fsync',
      range: { line: 12 },
      kind: 'function',
      title: "fsync",
      what: "Asks the operating system to flush the file to disk.",
      why: "Without it, a power cut right after the rename can leave an empty file under the new name.",
    },
    {
      id: 'os-replace',
      range: { line: 13 },
      kind: 'function',
      title: "os.replace",
      what: "Renames the temp file over the target in one step, replacing it on every OS.",
      why: "Readers (and the next pipeline step) never observe a partial file.",
    },
    {
      id: 'one-partition-per-run',
      range: { line: 20 },
      kind: 'variable',
      title: "One partition per run",
      what: "Each daily run owns exactly one folder.",
      why: "Rerunning 2026-11-22 overwrites 2026-11-22 only: idempotent by construction, and the basis of backfills in the pipeline chapter.",
    },
  ],
};

export const lockCode: CodeExample = {
  id: 'job-lock',
  language: 'python',
  source: `import fcntl
import sys

with open("/tmp/nightly-scores.lock", "w") as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)   # Linux and macOS
    except BlockingIOError:
        print("previous run still going; skipping", file=sys.stderr)
        sys.exit(0)
    run_nightly_scores()                                  # the lock is released when the file closes`,
  annotations: [
    {
      id: 'exclusive-non-blocking',
      range: { line: 6 },
      kind: 'parameter',
      title: "Exclusive, non-blocking",
      what: "Take the lock, or fail at once if another process holds it.",
      why: "Two overlapping runs would both read checkpoint 5 and both write rows 6 to 12.",
    },
    {
      id: 'skip-do-not-fail',
      range: { line: 9 },
      kind: 'syntax',
      title: "Skip, do not fail",
      what: "Exit 0: an overlapping start is expected, not an error.",
      why: "Choose deliberately. If overlaps should never happen, exit non-zero so someone looks.",
    },
  ],
};
