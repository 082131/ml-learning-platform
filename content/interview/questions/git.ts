import type { InterviewQuestion } from '@/lib/interview/types';

// Git, GitHub and documentation: asked inside almost every engineering loop, usually as part of a project deep dive
// or a "how do you work in a team" round, and directly for MLOps and platform roles.
export const gitQuestions: InterviewQuestion[] = [
  {
    id: 'git-merge-rebase',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'Branching',
    prompt: 'What is the difference between merging and rebasing? When do you use each, and when is rebasing dangerous?',
    answer: `Both integrate the work of two branches; they differ in the history they leave. A merge finds the merge base, does a three-way merge, and records a merge commit with two parents. Nothing is rewritten, and the graph shows that work happened in parallel. If the current branch has nothing the other lacks, Git just fast-forwards.

A rebase takes the commits in \`main..feature\` and replays them on top of main. The changes and messages stay, but each commit gets a new parent and committer date, so new ids. The result is a straight history.

I rebase my own branch on main before asking for review, so reviewers and CI see the code that will land, and I use interactive rebase to tidy local commits. I merge, usually via the pull request button, to integrate into main.

Rebasing is dangerous on commits other people have: after a rebase and force-push, their clones contain the old commits, and their next pull produces duplicates and conflicts. So: rewrite only unpublished or personal branches, and use \`--force-with-lease\` rather than \`--force\` when I must.`,
    covers: [
      'Merge commit with two parents versus replayed commits with new ids',
      'Fast-forward when one branch contains the other',
      'Rebase own branch before review; merge into shared branches',
      'Never rewrite shared history; --force-with-lease',
    ],
    redFlags: ['Saying rebase "moves" commits without noting new ids', 'Force-pushing shared branches as routine', 'Not knowing what a merge base is'],
    followUps: ['How does squash merging change what git branch -d reports?', 'How do you recover if a rebase went wrong?'],
  },
  {
    id: 'git-commit-internals',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'Internals',
    prompt: 'What is a Git commit, physically? Why does amending only the message give the commit a new id?',
    answer: `Git is a content-addressed object store. There are four object types. A blob holds a file's bytes, without its name. A tree holds one folder: sorted entries of mode, name and the id of a blob or subtree. A commit holds the id of the root tree, the ids of its parents, the author and committer with timestamps, and the message. An annotated tag points at an object with a tagger and message.

Every object is named by the SHA-1 of a short header ("commit 245", a zero byte) plus its content. So a commit id covers the whole snapshot through the tree id, and the whole history through the parent ids.

Amending the message changes the commit's content, so it changes the hash: Git writes a new commit with the same tree and parent and moves the branch to it. The old one is still in the object database and the reflog. The same reasoning explains why rebased commits get new ids, why identical files are stored once, and why tampering with history is visible: every later id would change.

A branch, by contrast, is just a file with one commit id in it.`,
    covers: ['Blob, tree, commit, tag and what each stores', 'Ids are hashes of content, so they cover history through parents', 'Amend creates a new commit; old one stays in reflog', 'Branches are pointers'],
    redFlags: ['"Commits store diffs"', 'Thinking an amend edits the commit in place', 'Thinking branches copy files'],
    followUps: ['Why can Git not store an empty folder?', 'What changes when a repository uses SHA-256?'],
  },
  {
    id: 'git-undo-pushed',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'Recovery',
    prompt: 'A commit that breaks training was pushed to main an hour ago, and it also contains an API key. Walk me through what you do.',
    answer: `Two problems, and the secret comes first because it is already leaked: anyone who pulled, every CI log and any fork have it, and scanners find public keys within minutes. I revoke or rotate the key immediately, then check the provider's logs for use since the push.

For the code, main is shared, so I do not reset and force-push: teammates have the commit, and rewriting would break their clones and could reintroduce it. I run \`git revert <id>\`, which adds a commit with the inverse change, open a quick PR so CI runs, and merge it. If only part of the commit was bad, I fix forward instead.

Whether to also purge the key from history depends on the repository: for a private repo with rotated credentials, many teams stop there. For a public one, I would coordinate a rewrite with git filter-repo, force-push, ask everyone to re-clone, and ask GitHub to clear cached views. Rotation is the real fix either way.

Afterwards: add the key file to .gitignore, enable secret scanning and push protection, and add a pre-commit secret check.`,
    covers: ['Rotate the secret first; history keeps it', 'Revert on shared branches, not reset and force-push', 'History rewrite only with coordination, and it is not sufficient', 'Prevention: push protection, pre-commit, ignore files'],
    redFlags: ['Deleting the file in a new commit and calling it done', 'Force-pushing main without telling anyone', 'Not rotating the key'],
    followUps: ['How would you recover if someone did reset main by mistake?', 'What does the reflog give you, and what does it not?'],
  },
  {
    id: 'git-conflicts',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'Conflicts',
    prompt: 'How does Git decide that two changes conflict? How do you resolve conflicts safely, and how do you reduce them in an ML repository?',
    answer: `Git diffs the merge base against each side and lines up the changed regions. A region changed on one side only is taken from that side; identical changes on both sides are taken once; regions changed differently on both sides, or changes that touch, conflict. It also conflicts on modify/delete and some renames.

On a conflict the operation pauses. The file gets markers: ours between <<<<<<< and =======, theirs after it, and with zdiff3 the base in the middle, which I always enable because it shows what each side did. I resolve by writing the file I want, which is often a combination, not one side. Then I run the tests, because a textually clean merge can still be wrong, and git add plus commit or rebase --continue. If it gets messy I abort and start again. I remember that during a rebase "ours" is the branch I am replaying onto.

In ML repositories the usual offenders are notebooks, configs and lock files. I use nbdime and nbstripout for notebooks and move code into modules, keep configs one setting per line, regenerate lock files instead of hand-merging, and integrate main often with small PRs.`,
    covers: ['Three-way merge by region, adjacent changes conflict', 'Markers and zdiff3; ours/theirs swap during rebase', 'Run tests after resolving; abort is always available', 'Notebooks, configs and lock files strategies'],
    redFlags: ['Always taking one side', 'Committing leftover markers', 'Thinking conflicts are per file'],
    followUps: ['What is git rerere for?', 'How would you merge two long-lived branches that diverged for months?'],
  },
  {
    id: 'git-ci-ml',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'CI',
    prompt: 'What should CI run on every pull request of an ML training repository, and what should it not run?',
    answer: `The goal is fast, trustworthy feedback, ideally under ten minutes, on a clean machine. On every PR: lint and format checks, unit tests including tests of data schemas and feature functions, doctests, and a smoke run of the pipeline on a tiny fixed sample, which catches shape mismatches and missing columns between stages that unit tests miss. If the project is a library, a matrix over the supported Python versions. Dependencies come from a lock file and are cached on its hash, so CI does not test different software every week.

Those checks are marked required in branch protection, together with "branch must be up to date", so what passed is what lands.

It should not run full training, deployment or anything needing production secrets. Pull requests from forks get no secrets anyway. Full training goes in a scheduled or manual workflow on the right hardware, with results written to the experiment tracker, and deployment runs from main or from tags.

I also give workflows least-privilege permissions, pin third-party actions to commit SHAs, and use concurrency groups to cancel superseded runs.`,
    covers: ['Lint, unit tests, schema tests, doctests, smoke run', 'Required checks and up-to-date branches', 'No full training, deploys or secrets on PRs', 'Caching on lock file hash, pinning actions, least privilege'],
    redFlags: ['Training the real model in PR CI', 'Unpinned dependencies', 'Checks that are visible but not required'],
    followUps: ['How do you test a model in CI without the real data?', 'How do you keep CI under ten minutes as the repository grows?'],
  },
  {
    id: 'git-versioning-models',
    role: 'git',
    kind: 'technical',
    level: 'senior',
    topic: 'ML versioning',
    prompt: 'How do you version datasets and models alongside code so that any deployed model can be rebuilt?',
    answer: `A model is a function of code, data, configuration and environment, so all four have to be pinned to one record.

Code is Git, and the training run logs the full commit id and refuses to run from a dirty tree for anything that might ship. Large data and weights do not go into plain Git history: every clone would download every version, and GitHub rejects files over 100 MiB. Instead I commit pointers. With DVC, \`dvc add\` or a dvc.yaml pipeline writes small files with content hashes, dvc.lock records the hash of every stage's inputs and outputs, and the bytes go to a bucket we control. Git LFS works similarly for a few binary files on the Git host. For tables in a lake, Delta or Iceberg snapshot ids play the same role. Parameters live in a committed config, and the environment in a lock file and a container digest.

At training time the pipeline writes a lineage record: commit, data hashes, parameters, environment, metrics. The model registry stores it with the model version, and the release is tagged in Git. To rebuild, I check out the tag, \`dvc checkout\`, use the same image, and rerun.`,
    covers: ['Code, data, config, environment pinned together', 'Pointers with content hashes (DVC, LFS) instead of binaries in Git', 'Lineage record stored with the registry entry', 'Rebuild path from a tag'],
    redFlags: ['Committing large binaries to Git', 'Naming models by hand (final_v2)', 'Logging short or no commit ids'],
    followUps: ['Git LFS or DVC: how do you choose?', 'How do you handle data you are not allowed to keep (deletion requests)?'],
  },
  {
    id: 'git-semver-api',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'Releases',
    prompt: 'You maintain an internal Python package used by five teams. How do you version and release it, and how do you handle a breaking change?',
    answer: `I follow Semantic Versioning, which only works if the public API is defined: documented functions and classes, CLI flags, and for a model package the input and output schema. Breaking changes bump major, compatible features minor, fixes patch, and a published version never changes; a bad release is fixed by a new one.

To make it routine, commits follow Conventional Commits, so feat, fix and breaking markers decide the version, and a release tool such as release-please opens a release PR with the version bump and a generated changelog that I edit for users. Merging it tags the commit with an annotated tag, CI builds and publishes the wheel, and the GitHub release carries the notes.

For a breaking change, I deprecate first: add the new API in a minor release, keep the old one working with a DeprecationWarning that says what to use instead, announce it in the changelog, and remove it in the next major after the teams have moved. Consumers declare ranges like \`>=2.3,<3\`, so they get fixes automatically and choose when to take the major. Applications pin exact versions in their lock files.`,
    covers: ['Define the public API first', 'Major, minor, patch; immutable releases', 'Automation from Conventional Commits; changelog for users', 'Deprecate, then remove in a major; consumer ranges and lock files'],
    redFlags: ['Moving tags or republishing a version', 'Breaking changes in minor releases', 'Changelog copied from commit messages'],
    followUps: ['What does 0.y.z promise?', 'How would you release a model whose output schema changes?'],
  },
  {
    id: 'git-docs-stale',
    role: 'git',
    kind: 'technical',
    level: 'core',
    topic: 'Documentation',
    prompt: 'Documentation in your last team was always out of date. What would you change?',
    answer: `Docs go stale when nothing connects them to code changes, so I would make them part of the same workflow as the code.

First, location: docs live in the repository, in docs/ and in docstrings, not in a wiki. Then a code change and its documentation are one pull request, and the PR template asks whether docs were updated. Reviewers check them like code.

Second, generate what can be generated. The API reference comes from docstrings with mkdocstrings or Sphinx autodoc, so it cannot drift from signatures. Docstrings carry runnable examples, and doctests run in CI. A docstring linter such as pydoclint fails the build when documented parameters no longer match the signature. The docs site builds on every PR in strict mode so broken links fail, and it publishes from main.

Third, organise by reader need, using Diataxis: tutorials, how-to guides, reference and explanation, so pages stay short and each has an obvious owner. Significant design decisions get architecture decision records, which are superseded rather than edited. For models, a model card ships with every release. And the README quick start runs in CI.`,
    covers: ['Docs in the repo, changed in the same PR', 'Generated reference, doctests, docstring linting, strict builds', 'Diataxis structure and ownership', 'ADRs and model cards'],
    redFlags: ['"We should just write more docs"', 'A separate wiki nobody reviews', 'Hand-written API reference'],
    followUps: ['How do you version docs for several supported releases?', 'What goes in a README versus a docs site?'],
  },
  {
    id: 'git-workflow-design',
    role: 'git',
    kind: 'system-design',
    level: 'senior',
    topic: 'Workflow design',
    prompt:
      'Design the source control, review, CI and release workflow for an ML team of 30 that ships a model-backed service weekly and retrains models monthly.',
    answer: `I would start from the constraints: weekly service releases, monthly model releases, a team big enough that reviews and CI are the bottleneck, and the need to rebuild any model in production.

Branching: trunk-based, or GitHub flow. Short-lived branches off main, merged through pull requests within a day or two. Long-lived branches cause the expensive merges. Feature flags hide unfinished work instead of branches.

Review: main protected with one or two approvals, CODEOWNERS for areas such as serving, data pipelines and infra, required checks, up-to-date branches, resolved conversations, no force pushes. Squash merging with Conventional Commits PR titles, so main has one revertible commit per change and versioning can be automated. A PR template asks for tests and, for model changes, before and after metrics.

CI: fast PR checks under ten minutes (lint, unit and schema tests, doctests, smoke pipeline on a sample), with dependency caching and a merge queue once main gets busy. Nightly jobs run longer integration tests.

Releases: the service is released weekly from main by tag, with release-please generating the changelog; deploy to staging on merge, production on tag, with canary rollout. Models: data and pipelines versioned with DVC, training in a scheduled workflow on GPU runners, lineage written to the registry, promotion through registry aliases with an approval, and the model version recorded in the service config so a rollback is a config revert.

Docs: docs/ built strictly on PRs, ADRs for decisions, model cards per model version.`,
    covers: ['Trunk-based development with short-lived branches and feature flags', 'Protection, CODEOWNERS, squash merges, Conventional Commits', 'Fast PR CI, merge queue, nightly long tests', 'Separate but linked release paths for service and models, with lineage and rollback'],
    redFlags: ['Git flow with long-lived branches for a weekly-shipping service', 'Training in PR CI', 'No link between deployed model and code or data versions'],
    followUps: ['When would you introduce a merge queue?', 'How do you roll back a bad model without rolling back code?'],
  },
];
