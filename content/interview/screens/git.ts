import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// Tooling rounds ask for small, exact versions of the tools you use daily: here a status parser, a line merge and
// git bisect.
export const gitScreen: ScreenDef = {
  id: 'git',
  role: 'git',
  title: 'Git tooling coding screen',
  summary:
    'Three pieces of everyday Git, implemented exactly: reading status with ahead/behind counts, a three-way line merge with conflict markers, and git bisect’s binary search.',
  minutes: 45,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-git-status',
      title: 'Parse git status --porcelain -b',
      domain: 'git',
      brief: `Write \`parse_status(text)\` for the output of \`git status --porcelain -b\`. The first line is a branch header such as \`## main...origin/main [ahead 2, behind 1]\`, \`## main...origin/main\`, \`## feature\` (no upstream) or \`## HEAD (no branch)\` (detached). Each other line is two status letters, a space, and a path; a rename is \`R  old -> new\`.

Return a dict with:
- \`"branch"\`: the branch name, or \`None\` when detached;
- \`"upstream"\`: the upstream name, or \`None\`;
- \`"ahead"\`, \`"behind"\`: integers, 0 when not shown;
- \`"staged"\`, \`"unstaged"\`, \`"untracked"\`, \`"conflicted"\`: sorted lists of paths (new path for renames). Conflict codes are \`UU AA DD AU UA DU UD\` and go only in \`"conflicted"\`; \`??\` is untracked; otherwise a non-space first letter means staged and a non-space second letter means unstaged.`,
      starter: `import re

def parse_status(text):
    ${NOT_DONE}
`,
      solution: `import re

CONFLICT = {"UU", "AA", "DD", "AU", "UA", "DU", "UD"}

def parse_status(text):
    lines = text.splitlines()
    out = {"branch": None, "upstream": None, "ahead": 0, "behind": 0,
           "staged": [], "unstaged": [], "untracked": [], "conflicted": []}
    head = lines[0][3:] if lines and lines[0].startswith("## ") else None
    if head is not None:
        lines = lines[1:]
        m = re.match(r"^(.*?)(?:\\.\\.\\.(\\S+))?(?: \\[(.*)\\])?$", head)
        name, upstream, counts = m.group(1), m.group(2), m.group(3) or ""
        out["branch"] = None if name.startswith("HEAD (no branch)") else name
        out["upstream"] = upstream
        a = re.search(r"ahead (\\d+)", counts)
        b = re.search(r"behind (\\d+)", counts)
        out["ahead"] = int(a.group(1)) if a else 0
        out["behind"] = int(b.group(1)) if b else 0
    for line in lines:
        if not line:
            continue
        code, path = line[:2], line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if code in CONFLICT:
            out["conflicted"].append(path)
        elif code == "??":
            out["untracked"].append(path)
        else:
            if code[0] != " ":
                out["staged"].append(path)
            if code[1] != " ":
                out["unstaged"].append(path)
    for k in ("staged", "unstaged", "untracked", "conflicted"):
        out[k].sort()
    return out
`,
      checks: [
        {
          name: 'Branch header with upstream and counts',
          points: 15,
          tests: `_r = parse_status("## main...origin/main [ahead 2, behind 1]\\n")
assert (_r["branch"], _r["upstream"], _r["ahead"], _r["behind"]) == ("main", "origin/main", 2, 1), _r
_r = parse_status("## feat/x...origin/feat/x [behind 3]")
assert (_r["branch"], _r["upstream"], _r["ahead"], _r["behind"]) == ("feat/x", "origin/feat/x", 0, 3), _r
_r = parse_status("## feature")
assert (_r["branch"], _r["upstream"], _r["ahead"]) == ("feature", None, 0), _r
assert parse_status("## HEAD (no branch)")["branch"] is None
`,
        },
        {
          name: 'File lines go into the right lists',
          points: 18,
          tests: `_r = parse_status("## main...origin/main\\nM  train.py\\n M README.md\\nMM params.yaml\\n?? notes.txt\\nUU eval.py\\nR  old.py -> new.py\\n D gone.py\\n")
assert _r["staged"] == ["new.py", "params.yaml", "train.py"], _r
assert _r["unstaged"] == ["README.md", "gone.py", "params.yaml"], _r
assert _r["untracked"] == ["notes.txt"] and _r["conflicted"] == ["eval.py"], _r
`,
        },
      ],
    },
    {
      id: 'scr-git-merge3',
      title: 'Three-way merge of aligned lines',
      domain: 'git',
      brief: `Write \`merge3(base, ours, theirs)\` for three lists of lines of the same length (each version only replaced lines, never inserted or deleted). For each position: if ours and theirs agree, take it; if only one side differs from base, take that side; if both differ in different ways, it is a conflict.

Consecutive conflicting positions form one conflict block. Return \`(lines, conflicts)\`: the merged list of lines and the number of conflict blocks. A conflict block is written as \`<<<<<<< ours\`, the ours lines, \`=======\`, the theirs lines, \`>>>>>>> theirs\`.`,
      starter: `def merge3(base, ours, theirs):
    ${NOT_DONE}
`,
      solution: `def merge3(base, ours, theirs):
    out, conflicts, block = [], 0, None
    def flush():
        nonlocal block, conflicts
        if block:
            out.extend(["<<<<<<< ours", *block[0], "=======", *block[1], ">>>>>>> theirs"])
            conflicts += 1
        block = None
    for b, o, t in zip(base, ours, theirs):
        if o == t or t == b:
            flush()
            out.append(o)
        elif o == b:
            flush()
            out.append(t)
        else:
            if block is None:
                block = ([], [])
            block[0].append(o)
            block[1].append(t)
    flush()
    return out, conflicts
`,
      checks: [
        {
          name: 'Clean merges take each side’s change',
          points: 15,
          tests: `_b = ["model: logistic", "lr: 0.01", "epochs: 10", "seed: 42"]
assert merge3(_b, ["model: logistic", "lr: 0.02", "epochs: 10", "seed: 42"], ["model: logistic", "lr: 0.01", "epochs: 10", "seed: 7"]) == (["model: logistic", "lr: 0.02", "epochs: 10", "seed: 7"], 0)
assert merge3(_b, ["model: xgb", "lr: 0.01", "epochs: 10", "seed: 42"], ["model: xgb", "lr: 0.01", "epochs: 10", "seed: 42"]) == (["model: xgb", "lr: 0.01", "epochs: 10", "seed: 42"], 0)
assert merge3([], [], []) == ([], 0)
`,
        },
        {
          name: 'Conflicts are grouped into blocks with markers',
          points: 18,
          tests: `_b = ["a", "b", "c", "d", "e"]
_lines, _n = merge3(_b, ["a", "B1", "C1", "d", "E1"], ["a", "B2", "C2", "d", "E2"])
assert _n == 2, _n
assert _lines == ["a", "<<<<<<< ours", "B1", "C1", "=======", "B2", "C2", ">>>>>>> theirs", "d",
                  "<<<<<<< ours", "E1", "=======", "E2", ">>>>>>> theirs"], _lines
_lines, _n = merge3(["x", "y"], ["X", "y"], ["Z", "Y"])
assert (_lines, _n) == (["<<<<<<< ours", "X", "=======", "Z", ">>>>>>> theirs", "Y"], 1), _lines
`,
        },
      ],
    },
    {
      id: 'scr-git-bisect',
      title: 'Find the first bad commit like git bisect',
      domain: 'git',
      brief: `\`commits\` is a list of commit ids from oldest to newest. The first commit is known good and the last is known bad; once a commit is bad, every later one is bad too. \`is_bad(commit)\` runs the test (it is slow).

Write \`bisect(commits, is_bad)\` returning \`(first_bad, tests_run)\`: the first bad commit and how many times you called \`is_bad\`. Do not test the first or last commit (their state is known), and use binary search: at most \`ceil(log2(len(commits) - 1))\` calls.`,
      starter: `import math

def bisect(commits, is_bad):
    ${NOT_DONE}
`,
      solution: `import math

def bisect(commits, is_bad):
    good, bad = 0, len(commits) - 1
    runs = 0
    while bad - good > 1:
        mid = (good + bad) // 2
        runs += 1
        if is_bad(commits[mid]):
            bad = mid
        else:
            good = mid
    return commits[bad], runs
`,
      checks: [
        {
          name: 'Finds the first bad commit',
          points: 17,
          tests: `_c = [f"c{i:03d}" for i in range(100)]
for _first in (1, 2, 37, 50, 98, 99):
    _got, _ = bisect(_c, lambda c, f=_first: int(c[1:]) >= f)
    assert _got == _c[_first], (_first, _got)
assert bisect(["good", "bad"], lambda c: c == "bad") == ("bad", 0)
`,
        },
        {
          name: 'Uses a logarithmic number of tests and never tests the ends',
          points: 17,
          tests: `import math
_c = list(range(1025))
_seen = []
def _probe(c, _f=700):
    _seen.append(c)
    return c >= _f
_got, _runs = bisect(_c, _probe)
assert _got == 700 and _runs == len(_seen), (_got, _runs, len(_seen))
assert _runs <= math.ceil(math.log2(len(_c) - 1)), _runs
assert 0 not in _seen and 1024 not in _seen
`,
        },
      ],
    },
  ],
};
