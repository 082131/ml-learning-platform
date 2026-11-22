import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'blob-name',
    type: 'choice',
    prompt: 'You rename data_prep.py to prepare.py without changing its content, and commit. What happens to the blob?',
    options: [
      { text: 'Git stores a second blob, because the path is part of the blob', correct: false, explain: 'Blobs hold only content. The name lives in the tree that points at the blob.' },
      { text: 'The commit records the rename in the blob’s header', correct: false, explain: 'Blobs have no metadata besides type and size. Git detects renames later by comparing content.' },
      { text: 'Nothing: the new tree lists the same blob under a new name', correct: true, explain: 'Same bytes, same id. Only the tree (and so the commit) gets a new id.' },
    ],
  },
  {
    id: 'amend-date',
    type: 'choice',
    prompt: 'Two people commit identical files with identical messages from different laptops. Do the commits get the same id?',
    options: [
      { text: 'Only if the author, committer and both timestamps also match', correct: true, explain: 'The commit text includes names, emails and dates. The trees would match; the commits almost never do.' },
      { text: 'Yes, because a commit id depends only on the files it contains', correct: false, explain: 'That is true of the tree id, not the commit id, which also covers people, dates, parents and message.' },
      { text: 'No, because Git adds a random number to every commit', correct: false, explain: 'Git is fully deterministic: the sandbox and real Git agree on ids because nothing is random.' },
    ],
  },
  {
    id: 'history-change',
    type: 'choice',
    prompt: 'Someone edits the message of a commit five commits back and rewrites history. Which ids change?',
    options: [
      { text: 'Only that commit’s id', correct: false, explain: 'Each later commit contains its parent’s id, so a new id ripples forward.' },
      { text: 'That commit and every commit after it', correct: true, explain: 'This is why rewriting shared history breaks everyone else’s clones: their commits have the old ids.' },
      { text: 'None: messages are stored outside the hashed content', correct: false, explain: 'The message is the last part of the commit text, which is what gets hashed.' },
    ],
  },
  {
    id: 'blob-size',
    type: 'numeric',
    prompt: 'A file contains the text "lr = 0.01" and a newline. What is the number in its blob header ("blob N\\0")?',
    answer: 10,
    tolerance: 0,
    hint: 'Count bytes: letters, spaces, digits, the dot and the newline.',
    explain: '"lr = 0.01" is 9 bytes, plus 1 for the newline: blob 10.',
  },
  {
    id: 'order-objects',
    type: 'order',
    prompt: 'Put the objects git commit writes in the order it must compute them.',
    items: ['A blob for each file’s content (already written by git add)', 'A tree for each subfolder', 'The root tree, which lists the subfolder trees', 'The commit, which names the root tree and its parent'],
    explain: 'Each object contains the ids of the objects below it, so ids are computed from the leaves up.',
  },
];

export const objectExercise: Exercise = {
  id: 'object-id',
  prompt:
    'Write `object_id(kind, content)` that returns Git’s 40-character id for an object of type `kind` ("blob", "tree", "commit" or "tag") with the bytes `content`. Use hashlib.',
  starter: `import hashlib

def object_id(kind, content):
    pass`,
  hints: [
    'The hashed bytes are a header, "<kind> <size>" followed by a zero byte, and then the content.',
    'The size is len(content) in bytes, and hashlib.sha1(...).hexdigest() gives the hex id.',
  ],
  solution: `import hashlib

def object_id(kind, content):
    header = f"{kind} {len(content)}\\0".encode()
    return hashlib.sha1(header + content).hexdigest()`,
  explanation:
    'Every object id is SHA-1 over a typed header and the content. Since a tree contains blob ids and a commit contains a tree id and parent ids, the commit id covers the whole snapshot and its history.',
  tests: `assert object_id("blob", b"hello\\n") == "ce013625030ba8dba906f756967f9e9ca394464a"
assert object_id("blob", b"") == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
assert object_id("tree", b"") == "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
text = (b"tree 57e9529754dc514a3ec10db2ff882018fbe1fcbf\\n"
        b"author Ada Lovelace <ada@example.com> 1767225600 +0000\\n"
        b"committer Ada Lovelace <ada@example.com> 1767225600 +0000\\n\\nAdd greeting\\n")
assert object_id("commit", text) == "85665b295d0bd35cd1546fd79a281e8b6f6601ea"`,
};
