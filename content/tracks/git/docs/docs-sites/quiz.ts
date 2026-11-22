import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'kind-howto',
    type: 'choice',
    prompt: 'A page titled "Deploy the model to Kubernetes" lists the commands for building the image, pushing it and applying the manifests. Which Diataxis kind is it?',
    options: [
      { text: 'Tutorial, because it walks through the steps in order', correct: false, explain: 'Tutorials are for learning with a guaranteed outcome. This serves a reader who already has a task.' },
      { text: 'How-to guide, because it serves a task the reader has', correct: true, explain: 'A recipe for a goal the reader brings. It assumes they know what Kubernetes and an image are.' },
      { text: 'Explanation, because deployment is a complex topic', correct: false, explain: 'Explanation discusses why and how things relate; this page is a list of actions.' },
    ],
  },
  {
    id: 'generated-ref',
    type: 'choice',
    prompt: 'Why generate the API reference from docstrings instead of writing it as separate pages?',
    options: [
      { text: 'Generated pages rank higher in search engines', correct: false, explain: 'Search ranking has nothing to do with how the page was produced.' },
      { text: 'Docstrings are the only place Sphinx or MkDocs can read text from', correct: false, explain: 'Both read Markdown or reStructuredText pages too; most of a docs site is hand-written.' },
      { text: 'The reference then changes in the same commit as the code', correct: true, explain: 'One source of truth, next to the code, reviewed in the same pull request. Separate pages drift.' },
    ],
  },
  {
    id: 'adr-change',
    type: 'choice',
    prompt: 'A year after ADR 3 ("Use DVC for training data"), the team moves to Delta Lake. What do they do with ADR 3?',
    options: [
      { text: 'Write ADR 9 for Delta Lake and mark ADR 3 as superseded by it', correct: true, explain: 'ADRs are append-only. The old context and reasoning stay readable, linked to what replaced them.' },
      { text: 'Edit ADR 3 to describe Delta Lake, so there is one current record', correct: false, explain: 'That erases why DVC was chosen and what was learned. Git history has it, but nobody reads that.' },
      { text: 'Delete ADR 3 so readers are not confused by an old decision', correct: false, explain: 'Deleting loses the reasoning, the very thing ADRs exist to keep.' },
    ],
  },
  {
    id: 'strict-count',
    type: 'numeric',
    prompt: 'mkdocs build --strict finds 2 broken links and 1 page missing from nav that exists in docs/. With --strict, each warning is an error. How many problems must be fixed before the PR check passes?',
    answer: 3,
    tolerance: 0,
    hint: 'Count every warning.',
    explain: 'All three warnings fail a strict build: two broken links and the orphan page.',
  },
  {
    id: 'order-docs-pr',
    type: 'order',
    prompt: 'Put the docs-as-code flow for a documentation fix in order.',
    items: ['Click "edit this page" on the docs site', 'Edit the Markdown and open a pull request', 'CI builds the docs with --strict', 'A reviewer approves and it merges', 'The deploy job publishes the site from main'],
    explain: 'Docs follow the same branch, review and CI path as code.',
  },
];

export const linkExercise: Exercise = {
  id: 'broken-links',
  prompt:
    'Write `broken_links(pages)` for a docs folder. `pages` maps a page path (like "how-to/gpu.md") to its Markdown text. Find every Markdown link `[text](target)` whose target is a relative .md path (ignore links starting with "http" or "#", and drop any "#section" suffix). Resolve the target relative to the linking page’s folder (".." goes up one folder). Return a sorted list of (page, target) tuples for targets that are not in `pages`.',
  starter: `def broken_links(pages):
    pass`,
  hints: [
    're.findall(r"\\[[^\\]]*\\]\\(([^)\\s]+)\\)", text) gives the link targets.',
    'posixpath.normpath(posixpath.join(posixpath.dirname(page), target)) resolves "../" and "./".',
  ],
  solution: `import posixpath
import re

def broken_links(pages):
    out = []
    for page, text in pages.items():
        for target in re.findall(r"\\[[^\\]]*\\]\\(([^)\\s]+)\\)", text):
            if target.startswith(("http", "#")):
                continue
            path = target.split("#")[0]
            if not path.endswith(".md"):
                continue
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(page), path))
            if resolved not in pages:
                out.append((page, target))
    return sorted(out)`,
  explanation:
    'This is the check mkdocs build --strict and Sphinx’s nitpicky mode run on every build. In CI it turns a renamed page into a failing pull request instead of a 404 for readers.',
  tests: `pages = {
    "index.md": "Start with the [tutorial](tutorials/first.md) or [GPU guide](how-to/gpu.md#setup). [Site](https://example.com)",
    "tutorials/first.md": "Next: [reference](../reference/api.md) and [old page](../reference/cli.md). [Top](#top)",
    "how-to/gpu.md": "See [splits](../explanation/splits.md) and [first](./../tutorials/first.md).",
    "reference/api.md": "Back to [home](../index.md).",
}
assert broken_links(pages) == [("how-to/gpu.md", "../explanation/splits.md"), ("tutorials/first.md", "../reference/cli.md")], broken_links(pages)
assert broken_links({"a.md": "[b](b.md)", "b.md": "[a](a.md)"}) == []
assert broken_links({"a.md": "no links"}) == []`,
};
