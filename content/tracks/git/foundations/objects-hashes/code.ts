// Code for "Inside .git". The sandbox scenario (objects) is replayed in real Git 2.43 by sim.test.ts, including the
// output of every cat-file and hash-object command. The Python runner is checked under CPython by
// python-outputs.test.ts; its three ids match the real run in shellWalkthrough below.
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const objects = gitSandboxExperiment('git-objects', 'objects');

export const shellWalkthrough: CodeExample = {
  id: 'git-objects-shell',
  language: 'bash',
  source: `$ echo hello > greeting.txt
$ git add greeting.txt
$ find .git/objects -type f           # git add already stored the content
.git/objects/ce/013625030ba8dba906f756967f9e9ca394464a
$ git commit -q -m "Add greeting"     # dates fixed to 2026-01-01 00:00 UTC for this run
$ find .git/objects -type f | sort    # + one tree, + one commit
.git/objects/57/e9529754dc514a3ec10db2ff882018fbe1fcbf
.git/objects/85/665b295d0bd35cd1546fd79a281e8b6f6601ea
.git/objects/ce/013625030ba8dba906f756967f9e9ca394464a
$ git cat-file -t ce01362             # type of an object; a unique prefix of the id is enough
blob
$ git cat-file -p HEAD                # pretty-print the commit HEAD points to
tree 57e9529754dc514a3ec10db2ff882018fbe1fcbf
author Ada Lovelace <ada@example.com> 1767225600 +0000
committer Ada Lovelace <ada@example.com> 1767225600 +0000

Add greeting
$ git ls-tree HEAD                    # the tree: mode, type, id, name
100644 blob ce013625030ba8dba906f756967f9e9ca394464a	greeting.txt`,
  annotations: [
    {
      id: 'fanout',
      range: { line: 4 },
      kind: 'framework',
      title: 'Object path',
      what: 'An object is stored at .git/objects/<first 2 hex digits>/<other 38>, zlib-compressed.',
      why: 'Splitting by the first two digits keeps any one folder small. Later, git gc packs loose objects into packfiles.',
    },
    {
      id: 'unix-time',
      range: { line: 14 },
      kind: 'syntax',
      title: 'Timestamp',
      what: 'Seconds since 1970-01-01 UTC, then the time zone offset.',
      why: 'The date is part of the commit text. Commit the same tree a second later and the commit id is different.',
    },
    {
      id: 'mode',
      range: { line: 19, startCol: 0, endCol: 6 },
      kind: 'syntax',
      title: 'Mode',
      what: '100644 = normal file, 100755 = executable, 120000 = symlink, 040000 = folder (a tree).',
      why: 'Git tracks the executable bit and nothing else about permissions. Empty folders cannot be stored: a tree needs at least one entry.',
    },
  ],
};

/** Runs in the browser with Pyodide; the ids match the real Git run above. */
export const hashRunner: CodeExample = {
  id: 'git-object-ids',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib

def object_id(kind, content):
    """The SHA-1 Git uses as the object's name: header "<kind> <size>\\\\0", then the content."""
    header = f"{kind} {len(content)}\\0".encode()
    return hashlib.sha1(header + content).hexdigest()

blob = object_id("blob", b"hello\\n")
print("blob  ", blob)

# A tree entry is "<mode> <name>\\0" followed by the 20 raw bytes of the entry's id.
tree = object_id("tree", b"100644 greeting.txt\\0" + bytes.fromhex(blob))
print("tree  ", tree)

commit_text = (
    f"tree {tree}\\n"
    "author Ada Lovelace <ada@example.com> 1767225600 +0000\\n"
    "committer Ada Lovelace <ada@example.com> 1767225600 +0000\\n"
    "\\n"
    "Add greeting\\n"
)
print("commit", object_id("commit", commit_text.encode()))

# One changed byte anywhere gives an unrelated id.
print("Hello ", object_id("blob", b"Hello\\n"))`,
  annotations: [
    {
      id: 'header',
      range: { line: 5 },
      kind: 'framework',
      title: 'Header',
      what: 'The type and the size in bytes, then a zero byte.',
      why: 'Including the type means a blob and a tree with the same bytes still get different ids.',
    },
    {
      id: 'raw',
      range: { line: 12 },
      kind: 'syntax',
      title: 'Raw bytes in trees',
      what: 'Trees store each id as 20 bytes, not 40 hex characters.',
      why: 'git cat-file -p shows them as hex for reading; the stored form is binary.',
    },
  ],
  expectedOutput: `blob   ce013625030ba8dba906f756967f9e9ca394464a
tree   57e9529754dc514a3ec10db2ff882018fbe1fcbf
commit 85665b295d0bd35cd1546fd79a281e8b6f6601ea
Hello  e965047ad7c57865823c7d992b1d046ea66edf78`,
};

export const refsShell: CodeExample = {
  id: 'git-refs-files',
  language: 'bash',
  source: `$ cat .git/HEAD                 # HEAD names the current branch
ref: refs/heads/main
$ cat .git/refs/heads/main      # a branch is a file holding one commit id (41 bytes with the newline)
85665b295d0bd35cd1546fd79a281e8b6f6601ea
$ git rev-parse HEAD            # resolve any name to an id
85665b295d0bd35cd1546fd79a281e8b6f6601ea`,
  annotations: [],
};
