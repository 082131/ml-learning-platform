import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the git/releases chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'semantic-versioning',
    term: 'Semantic versioning',
    short: 'MAJOR.MINOR.PATCH version numbers: MAJOR for incompatible API changes, MINOR for backward-compatible features, PATCH for backward-compatible fixes.',
    introducedIn: 'git/releases/semver-releases',
    aliases: ['SemVer', 'semver'],
  },
  {
    id: 'git-tag',
    term: 'Tag',
    short: 'A fixed name for a commit, usually a release such as v1.2.0. Unlike a branch, it does not move.',
    introducedIn: 'git/releases/semver-releases',
    aliases: ['lightweight tag', 'release tag'],
  },
  {
    id: 'annotated-tag',
    term: 'Annotated tag',
    short: 'A tag stored as its own object with a tagger, date and message (and optionally a signature). Use these for releases.',
    introducedIn: 'git/releases/semver-releases',
  },
  {
    id: 'release',
    term: 'Release',
    short: 'A published version of a project: on GitHub, a tag plus release notes and downloadable assets.',
    introducedIn: 'git/releases/semver-releases',
    aliases: ['GitHub release'],
  },
  {
    id: 'changelog',
    term: 'Changelog',
    short: 'A file listing the notable changes in each version, newest first, grouped as Added, Changed, Deprecated, Removed, Fixed and Security.',
    introducedIn: 'git/releases/semver-releases',
    aliases: ['CHANGELOG.md', 'release notes'],
  },
  {
    id: 'conventional-commits',
    term: 'Conventional Commits',
    short: 'A commit message format, type(scope): description, where feat means a new feature, fix a bug fix, and a ! or BREAKING CHANGE footer a breaking change.',
    introducedIn: 'git/releases/semver-releases',
  },
  {
    id: 'git-lfs',
    term: 'Git LFS',
    short: 'Git Large File Storage: commits a small pointer file (the content’s SHA-256 and size) and keeps the real content on an LFS server.',
    introducedIn: 'git/releases/ml-versioning',
    aliases: ['Large File Storage'],
  },
  {
    id: 'dvc',
    term: 'DVC',
    short: 'Data Version Control: tracks data and models with small .dvc and dvc.lock files in Git and stores the content in a remote such as S3. Also runs pipelines.',
    introducedIn: 'git/releases/ml-versioning',
    aliases: ['Data Version Control'],
  },
  {
    id: 'pointer-file',
    term: 'Pointer file',
    short: 'A small text file committed in place of a large one, recording the large file’s hash and size so a tool can fetch it.',
    introducedIn: 'git/releases/ml-versioning',
  },
] satisfies GlossaryTerm[];
