import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Git, GitHub and Documentation exam: 5 tasks, 100 points. Standard-library Python only, so
// every task runs in the browser. Every solution passes all its checks and every starter fails them
// (content/exams/exams-python.test.ts). Object ids in the checks come from real Git 2.43 runs.

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'git-h1',
    title: 'Compute Git object ids from scratch',
    domain: 'core',
    brief: `Rebuild Git's object hashing with hashlib.

\`object_id(kind, data)\` returns the SHA-1 hex id of an object: the hash of \`"<kind> <len(data)>"\`, a zero byte, then \`data\` (bytes).

\`tree_id(files)\` takes a dict of path -> bytes (paths use \`/\` for folders) and returns the id of the root tree. A tree's content is its entries sorted by name, where a folder sorts as if its name ended in \`/\`. Each entry is \`"<mode> <name>"\`, a zero byte, and the 20 raw bytes of the entry's id. Files have mode \`100644\`; folders have mode \`40000\` and the id of their own tree.

\`commit_id(tree, parents, person, timestamp, message)\` returns the id of a commit whose author and committer are both \`person\` (like \`"Ada Lovelace <ada@example.com>"\`) at \`timestamp\` seconds in time zone \`+0000\`. The text is a \`tree\` line, one \`parent\` line per parent, the \`author\` and \`committer\` lines, a blank line, then the message, which must end with exactly one newline.`,
    starter: `import hashlib

def object_id(kind, data):
    ${NOT_DONE}

def tree_id(files):
    ${NOT_DONE}

def commit_id(tree, parents, person, timestamp, message):
    ${NOT_DONE}
`,
    solution: `import hashlib

def object_id(kind, data):
    return hashlib.sha1(f"{kind} {len(data)}".encode() + b"\\0" + data).hexdigest()

def tree_id(files):
    blobs, folders = {}, {}
    for path, data in files.items():
        head, _, rest = path.partition("/")
        if rest:
            folders.setdefault(head, {})[rest] = data
        else:
            blobs[head] = data
    entries = [(name, b"100644", object_id("blob", data)) for name, data in blobs.items()]
    entries += [(name + "/", b"40000", tree_id(sub)) for name, sub in folders.items()]
    body = b""
    for key, mode, oid in sorted(entries):
        body += mode + b" " + key.rstrip("/").encode() + b"\\0" + bytes.fromhex(oid)
    return object_id("tree", body)

def commit_id(tree, parents, person, timestamp, message):
    lines = [f"tree {tree}"] + [f"parent {p}" for p in parents]
    lines += [f"author {person} {timestamp} +0000", f"committer {person} {timestamp} +0000", "", message.rstrip("\\n")]
    return object_id("commit", ("\\n".join(lines) + "\\n").encode())
`,
    checks: [
      {
        name: 'Blob ids match Git',
        points: 5,
        tests: `assert object_id("blob", b"hello\\n") == "ce013625030ba8dba906f756967f9e9ca394464a"
assert object_id("blob", b"") == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
assert object_id("tree", b"") == "4b825dc642cb6eb9a060e54bf8d69288fbee4904", "the type is part of the hash"
`,
      },
      {
        name: 'Tree ids, including nested folders and sort order',
        points: 8,
        tests: `assert tree_id({"greeting.txt": b"hello\\n"}) == "57e9529754dc514a3ec10db2ff882018fbe1fcbf"
_files = {"README.md": b"# Churn\\n", "src/train.py": b"lr = 0.01\\n", "src.txt": b"x\\n"}
assert tree_id({"train.py": b"lr = 0.01\\n"}) == "c87307951247f2a2582934036934f0ca8f4d8573"
assert tree_id(_files) == "f39b56f8ebe6b763f4c2566caff385c018ffa698", "src.txt sorts before the folder src/"
`,
      },
      {
        name: 'Commit ids, with and without a parent',
        points: 7,
        tests: `_ada = "Ada Lovelace <ada@example.com>"
_c1 = commit_id("f39b56f8ebe6b763f4c2566caff385c018ffa698", [], _ada, 1767225600, "Initial project")
assert _c1 == "4f26ee1d152a14039c2a9a8feb4f67598992c2be", _c1
_c2 = commit_id("e971e2ab31a61b936c88b41acef33c7c2f197426", [_c1], _ada, 1767225660, "Update src.txt\\n")
assert _c2 == "4b8f286a12d0b5920c33db824b58536e48c475a9", _c2
assert commit_id("57e9529754dc514a3ec10db2ff882018fbe1fcbf", [], _ada, 1767225600, "Add greeting") == "85665b295d0bd35cd1546fd79a281e8b6f6601ea"
`,
      },
    ],
  },
  {
    id: 'git-h2',
    title: 'Answer history questions from the commit graph',
    domain: 'branch',
    brief: `\`parents\` maps every commit id to the list of its parent ids (a merge has two).

\`reachable(parents, start)\` returns the set of commits reachable from \`start\`, including it.

\`log_range(parents, a, b)\` returns the set of commits in \`git log a..b\`: reachable from \`b\` but not from \`a\`.

\`merge_base(parents, a, b)\` returns the best common ancestor: a common ancestor that is not an ancestor of another common ancestor. If there are several, return the smallest id; if none, return \`None\`.

\`integrate(parents, current, other)\` describes \`git merge other\` run on \`current\`: \`"up-to-date"\` if \`other\` is already reachable from \`current\`, \`"fast-forward"\` if \`current\` is reachable from \`other\`, otherwise \`"merge"\`.`,
    starter: `def reachable(parents, start):
    ${NOT_DONE}

def log_range(parents, a, b):
    ${NOT_DONE}

def merge_base(parents, a, b):
    ${NOT_DONE}

def integrate(parents, current, other):
    ${NOT_DONE}
`,
    solution: `def reachable(parents, start):
    seen, stack = set(), [start]
    while stack:
        c = stack.pop()
        if c not in seen:
            seen.add(c)
            stack.extend(parents[c])
    return seen

def log_range(parents, a, b):
    return reachable(parents, b) - reachable(parents, a)

def merge_base(parents, a, b):
    common = reachable(parents, a) & reachable(parents, b)
    best = [c for c in common if not any(c != d and c in reachable(parents, d) for d in common)]
    return min(best) if best else None

def integrate(parents, current, other):
    if other in reachable(parents, current):
        return "up-to-date"
    if current in reachable(parents, other):
        return "fast-forward"
    return "merge"
`,
    checks: [
      {
        name: 'Ranges list what a merge would bring in',
        points: 6,
        tests: `_p = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"], "E": ["D"], "M": ["C", "E"], "F": ["M"]}
assert reachable(_p, "E") == {"A", "B", "D", "E"}
assert log_range(_p, "C", "E") == {"D", "E"}
assert log_range(_p, "E", "F") == {"C", "M", "F"}
assert log_range(_p, "F", "C") == set()
`,
      },
      {
        name: 'Merge bases, including criss-cross histories',
        points: 8,
        tests: `_p = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"], "E": ["D"], "M": ["C", "E"], "F": ["M"], "G": ["E"]}
assert merge_base(_p, "C", "E") == "B"
assert merge_base(_p, "F", "G") == "E"
assert merge_base(_p, "A", "F") == "A"
_x = {"R": [], "X1": ["R"], "Y1": ["R"], "X2": ["X1", "Y1"], "Y2": ["Y1", "X1"]}
assert merge_base(_x, "X2", "Y2") == "X1", "two best bases: return the smallest id"
assert merge_base({"P": [], "Q": []}, "P", "Q") is None
`,
      },
      {
        name: 'Fast-forward, merge or nothing to do',
        points: 6,
        tests: `_p = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"]}
assert integrate(_p, "B", "C") == "fast-forward"
assert integrate(_p, "C", "B") == "up-to-date"
assert integrate(_p, "C", "D") == "merge"
assert integrate(_p, "C", "C") == "up-to-date"
`,
      },
    ],
  },
  {
    id: 'git-h3',
    title: 'Read status output and simulate reset',
    domain: 'undo',
    brief: `\`parse_status(lines)\` reads \`git status --porcelain\` (v1) lines: two status letters, a space, then the path. A rename shows as \`R  old -> new\` (report the new path). Return a dict of sorted lists:

- \`"conflicted"\`: codes \`UU\`, \`AA\`, \`DD\`, \`AU\`, \`UA\`, \`DU\`, \`UD\` (only here, nowhere else);
- \`"untracked"\`: code \`??\`;
- \`"staged"\`: other lines whose first letter is not a space;
- \`"unstaged"\`: other lines whose second letter is not a space.

\`reset(repo, commits, mode, target)\`: \`commits\` maps commit ids to snapshots (dicts of path -> content). \`repo\` has \`"head"\` (a commit id), \`"index"\` and \`"work"\` (snapshots). Return a new repo after \`git reset --<mode> <target>\` for mode \`"soft"\`, \`"mixed"\` or \`"hard"\`. For \`"hard"\`, files that were tracked (in the old index) but are not in the target are removed from the working tree, and untracked files (in work but not in the old index) are kept. Never modify the inputs.`,
    starter: `def parse_status(lines):
    ${NOT_DONE}

def reset(repo, commits, mode, target):
    ${NOT_DONE}
`,
    solution: `CONFLICT = {"UU", "AA", "DD", "AU", "UA", "DU", "UD"}

def parse_status(lines):
    out = {"conflicted": [], "untracked": [], "staged": [], "unstaged": []}
    for line in lines:
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
    return {k: sorted(v) for k, v in out.items()}

def reset(repo, commits, mode, target):
    snap = commits[target]
    index, work = dict(repo["index"]), dict(repo["work"])
    if mode in ("mixed", "hard"):
        index = dict(snap)
    if mode == "hard":
        untracked = {p: c for p, c in repo["work"].items() if p not in repo["index"]}
        work = dict(snap)
        work.update({p: c for p, c in untracked.items() if p not in snap})
    return {"head": target, "index": index, "work": work}
`,
    checks: [
      {
        name: 'Status lines are classified correctly',
        points: 10,
        tests: `_s = parse_status(["M  train.py", " M README.md", "MM params.yaml", "?? notes.txt", "UU eval.py", "R  old.py -> new.py", "A  data.dvc", " D gone.py"])
assert _s["staged"] == ["data.dvc", "new.py", "params.yaml", "train.py"], _s
assert _s["unstaged"] == ["README.md", "gone.py", "params.yaml"], _s
assert _s["untracked"] == ["notes.txt"] and _s["conflicted"] == ["eval.py"], _s
assert parse_status([]) == {"conflicted": [], "untracked": [], "staged": [], "unstaged": []}
assert parse_status(["AA both.py", "DU d.py"])["conflicted"] == ["both.py", "d.py"]
`,
      },
      {
        name: 'Soft, mixed and hard reset each change the right areas',
        points: 10,
        tests: `_commits = {"c1": {"a.py": "1"}, "c2": {"a.py": "2", "b.py": "x"}}
_repo = {"head": "c2", "index": {"a.py": "2", "b.py": "x"}, "work": {"a.py": "3", "b.py": "x", "notes.txt": "n"}}
assert reset(_repo, _commits, "soft", "c1") == {"head": "c1", "index": {"a.py": "2", "b.py": "x"}, "work": {"a.py": "3", "b.py": "x", "notes.txt": "n"}}
assert reset(_repo, _commits, "mixed", "c1") == {"head": "c1", "index": {"a.py": "1"}, "work": {"a.py": "3", "b.py": "x", "notes.txt": "n"}}
_h = reset(_repo, _commits, "hard", "c1")
assert _h == {"head": "c1", "index": {"a.py": "1"}, "work": {"a.py": "1", "notes.txt": "n"}}, _h
assert _repo["head"] == "c2" and _repo["work"]["a.py"] == "3" and "notes.txt" in _repo["work"]
_h["index"]["a.py"] = "changed"
assert _commits["c1"]["a.py"] == "1", "do not share dicts with the inputs"
`,
      },
    ],
  },
  {
    id: 'git-h4',
    title: 'Code owners and build matrices',
    domain: 'collab',
    brief: `\`owners_for(codeowners, path)\` takes the text of a CODEOWNERS file and a path. Skip blank lines and lines starting with \`#\`. Each line is a pattern followed by owners (possibly none). Supported patterns: \`*\` (everything); \`*.ext\` (files ending in .ext, at any depth); \`/dir/\` (paths under dir at the root); \`dir/\` (paths under a folder named dir at any depth); \`dir/*\` (files directly inside a folder named dir, at any depth, not deeper); anything else is an exact path, with an optional leading \`/\`. The last matching line wins. Return its owners as a list, or \`[]\`.

\`expand_matrix(variables, exclude=(), include=())\` follows GitHub Actions: cross product of \`variables\` (a dict of name -> values, first name varying slowest) as dicts; drop each combination matching all pairs of an exclude entry; then merge each include entry into every original combination it does not contradict on an original variable, or append it as a new combination if it fits none.`,
    starter: `def owners_for(codeowners, path):
    ${NOT_DONE}

def expand_matrix(variables, exclude=(), include=()):
    ${NOT_DONE}
`,
    solution: `from itertools import product

def _match(pattern, path):
    if pattern == "*":
        return True
    if pattern.startswith("*."):
        return path.endswith(pattern[1:])
    if pattern.startswith("/") and pattern.endswith("/"):
        return path.startswith(pattern[1:])
    if pattern.endswith("/*"):
        folder = pattern[:-2].lstrip("/")
        parts = path.split("/")
        return len(parts) >= 2 and parts[-2] == folder.split("/")[-1] and ("/" + "/".join(parts[:-1])).endswith("/" + folder)
    if pattern.endswith("/"):
        return ("/" + path).find("/" + pattern) >= 0
    return path == pattern.lstrip("/")

def owners_for(codeowners, path):
    owners = []
    for line in codeowners.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        pattern, *who = line.split()
        if _match(pattern, path):
            owners = who
    return owners

def expand_matrix(variables, exclude=(), include=()):
    keys = list(variables)
    combos = [dict(zip(keys, vals)) for vals in product(*variables.values())] if keys else []
    combos = [c for c in combos if not any(all(c.get(k) == v for k, v in e.items()) for e in exclude)]
    originals = [dict(c) for c in combos]
    extra = []
    for inc in include:
        fits = False
        for orig, combo in zip(originals, combos):
            if all(orig[k] == v for k, v in inc.items() if k in orig):
                combo.update(inc)
                fits = True
        if not fits:
            extra.append(dict(inc))
    return combos + extra
`,
    checks: [
      {
        name: 'CODEOWNERS: last match wins, every pattern kind',
        points: 10,
        tests: `_co = """# owners
*                     @ada
*.py                  @ml-team
/data/                @data-team
/src/serving/         @platform-team @ada
docs/*                @docs-team
configs/              @grace
/src/serving/vendor/
"""
assert owners_for(_co, "README.md") == ["@ada"]
assert owners_for(_co, "src/train.py") == ["@ml-team"]
assert owners_for(_co, "data/raw/customers.csv") == ["@data-team"]
assert owners_for(_co, "src/serving/app.py") == ["@platform-team", "@ada"]
assert owners_for(_co, "src/serving/vendor/fast.py") == [], "an ownerless last match clears owners"
assert owners_for(_co, "docs/index.md") == ["@docs-team"]
assert owners_for(_co, "docs/api/train.md") == ["@ada"], "docs/* does not match deeper files"
assert owners_for(_co, "exp/configs/xgb.yaml") == ["@grace"]
assert owners_for("", "a.py") == []
`,
      },
      {
        name: 'Matrix expansion matches GitHub’s documented example',
        points: 10,
        tests: `_r = expand_matrix({"fruit": ["apple", "pear"], "animal": ["cat", "dog"]},
    include=[{"color": "green"}, {"color": "pink", "animal": "cat"}, {"fruit": "apple", "shape": "circle"},
             {"fruit": "banana"}, {"fruit": "banana", "animal": "cat"}])
assert _r == [
    {"fruit": "apple", "animal": "cat", "color": "pink", "shape": "circle"},
    {"fruit": "apple", "animal": "dog", "color": "green", "shape": "circle"},
    {"fruit": "pear", "animal": "cat", "color": "pink"},
    {"fruit": "pear", "animal": "dog", "color": "green"},
    {"fruit": "banana"},
    {"fruit": "banana", "animal": "cat"},
], _r
_m = expand_matrix({"os": ["ubuntu", "windows", "macos"], "py": ["3.11", "3.12", "3.13"]}, exclude=[{"os": "windows", "py": "3.11"}],
                   include=[{"os": "ubuntu", "py": "3.14", "experimental": True}])
assert len(_m) == 9 and _m[-1] == {"os": "ubuntu", "py": "3.14", "experimental": True}, _m
`,
      },
    ],
  },
  {
    id: 'git-h5',
    title: 'Release tooling: versions, ranges and changelogs',
    domain: 'release',
    brief: `\`semver_key(version)\` returns a sort key implementing SemVer 2.0.0 precedence for \`MAJOR.MINOR.PATCH\`, an optional \`-pre.release\` and optional \`+build\` metadata (ignored). Numeric pre-release identifiers compare as numbers and sort before alphanumeric ones; a release sorts after its pre-releases; a shorter identifier list sorts first when the rest is equal.

\`next_version(current, messages)\`: \`current\` is \`MAJOR.MINOR.PATCH\` with no pre-release. Conventional Commits rules: \`type!:\` or \`type(scope)!:\` on the first line, or a body line starting with \`BREAKING CHANGE: \`, is major; \`feat\` minor; \`fix\` and \`perf\` patch; others nothing. Return the bumped version, or \`current\`.

\`satisfies(version, rng)\` supports npm ranges \`^X.Y.Z\` and \`~X.Y.Z\`. Caret allows changes that keep the left-most non-zero part (\`^1.2.3\` is \`<2.0.0\`, \`^0.2.3\` is \`<0.3.0\`, \`^0.0.3\` is \`<0.0.4\`); tilde allows patch changes (\`~1.2.3\` is \`<1.3.0\`). A pre-release version never satisfies these ranges.`,
    starter: `import re

def semver_key(version):
    ${NOT_DONE}

def next_version(current, messages):
    ${NOT_DONE}

def satisfies(version, rng):
    ${NOT_DONE}
`,
    solution: `import re

def semver_key(version):
    core, _, pre = version.split("+")[0].partition("-")
    major, minor, patch = (int(x) for x in core.split("."))
    if not pre:
        return (major, minor, patch, 1, ())
    ids = tuple((0, int(p), "") if p.isdigit() else (1, 0, p) for p in pre.split("."))
    return (major, minor, patch, 0, ids)

def next_version(current, messages):
    rank = 0
    for msg in messages:
        lines = msg.split("\\n")
        m = re.match(r"^(\\w+)(\\([^)]*\\))?(!)?: ", lines[0])
        if (m and m.group(3)) or any(l.startswith("BREAKING CHANGE: ") for l in lines[1:]):
            rank = max(rank, 3)
        elif m and m.group(1) == "feat":
            rank = max(rank, 2)
        elif m and m.group(1) in ("fix", "perf"):
            rank = max(rank, 1)
    a, b, c = (int(x) for x in current.split("."))
    return [current, f"{a}.{b}.{c + 1}", f"{a}.{b + 1}.0", f"{a + 1}.0.0"][rank]

def satisfies(version, rng):
    if "-" in version.split("+")[0]:
        return False
    op, base = rng[0], rng[1:]
    a, b, c = (int(x) for x in base.split("."))
    if op == "~" or (op == "^" and a == 0 and b > 0):
        upper = (a, b + 1, 0)
    elif op == "^" and a > 0:
        upper = (a + 1, 0, 0)
    elif op == "^":
        upper = (0, 0, c + 1)
    else:
        raise ValueError(rng)
    v = tuple(int(x) for x in version.split("+")[0].split("."))
    return (a, b, c) <= v < upper
`,
    checks: [
      {
        name: 'Versions sort by SemVer precedence',
        points: 7,
        tests: `_v = ["1.0.0", "1.0.0-rc.1", "1.0.0-beta.11", "1.0.0-alpha", "1.0.0-beta", "1.0.0-alpha.beta", "1.0.0-beta.2", "1.0.0-alpha.1", "0.9.12", "1.10.0", "1.9.0"]
assert sorted(_v, key=semver_key) == ["0.9.12", "1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0", "1.9.0", "1.10.0"], sorted(_v, key=semver_key)
assert semver_key("1.0.0+build.7") == semver_key("1.0.0")
`,
      },
      {
        name: 'Next version from Conventional Commits',
        points: 7,
        tests: `assert next_version("1.4.2", ["fix: empty batch", "docs: typo"]) == "1.4.3"
assert next_version("1.4.2", ["feat: early stopping", "fix: x"]) == "1.5.0"
assert next_version("1.4.2", ["feat(api)!: return probabilities"]) == "2.0.0"
assert next_version("1.4.2", ["refactor: rename\\n\\nBREAKING CHANGE: load_model is gone"]) == "2.0.0"
assert next_version("1.4.2", ["chore: deps", "Update stuff"]) == "1.4.2"
assert next_version("0.9.9", ["perf: faster"]) == "0.9.10"
`,
      },
      {
        name: 'Caret and tilde ranges',
        points: 6,
        tests: `assert [v for v in ["1.2.2", "1.2.3", "1.2.9", "1.3.0", "1.9.0", "2.0.0", "2.0.0-rc.1"] if satisfies(v, "^1.2.3")] == ["1.2.3", "1.2.9", "1.3.0", "1.9.0"]
assert [v for v in ["1.2.3", "1.2.9", "1.3.0"] if satisfies(v, "~1.2.3")] == ["1.2.3", "1.2.9"]
assert [v for v in ["0.2.3", "0.2.9", "0.3.0"] if satisfies(v, "^0.2.3")] == ["0.2.3", "0.2.9"]
assert [v for v in ["0.0.3", "0.0.4"] if satisfies(v, "^0.0.3")] == ["0.0.3"]
assert not satisfies("1.3.0-beta.1", "^1.2.3")
`,
      },
    ],
  },
];
