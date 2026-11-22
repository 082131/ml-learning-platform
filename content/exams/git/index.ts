import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const gitExam: ExamDef = {
  track: 'git',
  title: 'Git, GitHub and Documentation certification exam',
  summary:
    'Scenario questions at the level of the GitHub Foundations and GitHub Actions certifications, extended with the release, ML versioning and documentation practice of this track: Git internals, branching and recovery, collaboration on GitHub, CI, semantic versioning, and docs as code.',
  certifications: [
    {
      name: 'GitHub Foundations',
      vendor: 'GitHub',
      url: 'https://resources.github.com/learn/certifications/',
      format:
        'Multiple-choice exam on Git and GitHub basics, repositories, collaboration (issues, pull requests, reviews), modern development with GitHub Actions, project management, and privacy, security and administration.',
    },
    {
      name: 'GitHub Actions',
      vendor: 'GitHub',
      url: 'https://resources.github.com/learn/certifications/',
      format:
        'Multiple-choice exam on authoring and maintaining workflows, consuming workflows, authoring and maintaining actions, and managing GitHub Actions in an organization.',
    },
  ],
  domains: [
    { id: 'core', title: 'Git fundamentals and internals', count: 18, maps: 'GitHub Foundations: Git and GitHub basics' },
    { id: 'branch', title: 'Branching, merging and rebasing', count: 20, maps: 'GitHub Foundations: working with repositories' },
    { id: 'undo', title: 'Undoing and recovering', count: 12, maps: 'GitHub Foundations: working with repositories' },
    { id: 'collab', title: 'Remotes, pull requests and review', count: 18, maps: 'GitHub Foundations: collaboration features, security and administration' },
    { id: 'ci', title: 'GitHub Actions and CI', count: 12, maps: 'GitHub Actions: authoring, consuming and securing workflows' },
    { id: 'release', title: 'Versioning, releases and ML artifacts', count: 12, maps: 'Track content: SemVer, tags, Git LFS and DVC' },
    { id: 'docs', title: 'Documentation', count: 8, maps: 'Track content: READMEs, docstrings, docs sites' },
  ],
  minutes: 150,
  passPercent: 75,
  questions,
  handsOn: { minutes: 120, passPercent: 70, tasks },
};
