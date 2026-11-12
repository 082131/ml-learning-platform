# Generates snapshots-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/snapshots.py
import json, pathlib
from fill import run

SOURCE = """class LCG:  # the same generator as the lesson's TypeScript
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


N_ROWS, VERSIONS = 100_000, 10
PATTERN = "{{pattern}}"  # which rows each version changes: "random" or "clustered" (one block)
SHARE = {{share}}  # row updates per version, as a share of the table
FILE_ROWS = {{fileRows}}  # rows per data file

rng = LCG(11)
count = round(N_ROWS * SHARE)
cow = mor = N_ROWS  # both start from one full copy of version 0
files_rewritten = 0
for version in range(VERSIONS):
    if PATTERN == "random":
        changed = {int(rng.random() * N_ROWS) for _ in range(count)}
    else:
        start = int(rng.random() * (N_ROWS - count))
        changed = set(range(start, start + count))
    files = {row // FILE_ROWS for row in changed}  # data files holding at least one changed row
    files_rewritten += len(files)
    cow += len(files) * FILE_ROWS  # copy-on-write: rewrite every touched file in full
    mor += len(changed)  # merge-on-read: write only the changed rows to a delta file

full = N_ROWS * (VERSIONS + 1)
print(f"{VERSIONS} versions, {count:,} row updates each ({PATTERN}), files of {FILE_ROWS:,} rows")
print(f"full copy:     {full:>9,} rows stored, {full / N_ROWS:.2f}x the table")
print(f"copy-on-write: {cow:>9,} rows stored, {cow / N_ROWS:.2f}x the table; "
      f"{files_rewritten / VERSIONS:.1f} files rewritten per version")
print(f"merge-on-read: {mor:>9,} rows stored, {mor / N_ROWS:.2f}x the table; a full scan reads {mor:,} rows")"""

out = {}
for pattern in ("random", "clustered"):
    for share in (0.001, 0.01, 0.1):
        for file_rows in (1000, 10000):
            out[f"{pattern},{share},{file_rows}"] = run(SOURCE, {"pattern": pattern, "share": share, "fileRows": file_rows})
pathlib.Path(__file__).with_name("snapshots-python.json").write_text(json.dumps(out, indent=1) + "\n")
