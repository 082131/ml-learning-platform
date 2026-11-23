// Code for "Remotes, fetch, pull and push". The sandbox scenario (remote) and its extra scripts (pull, fetch +
// merge, push -u, --force-with-lease accepted and refused) are replayed in real Git 2.43 against a bare repository
// by sim.test.ts. The transcripts below are from Git 2.43.0 with a local bare repository standing in for GitHub;
// the URL is shown as the GitHub URL it replaced.
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const remote = gitSandboxExperiment('git-remote', 'remote');

export const connectShell: CodeExample = {
  id: 'remote-connect',
  language: 'bash',
  source: `$ git remote add origin https://github.com/ada/churn-model.git
$ git push -u origin main
To https://github.com/ada/churn-model.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
$ git remote -v
origin	https://github.com/ada/churn-model.git (fetch)
origin	https://github.com/ada/churn-model.git (push)
$ git clone https://github.com/ada/churn-model.git   # on another machine: copy everything, set up origin`,
  annotations: [
    {
      id: 'origin',
      range: { line: 1, startCol: 15, endCol: 21 },
      kind: 'variable',
      title: 'origin',
      what: 'A short name for the remote URL. "origin" is only a convention: git clone uses it by default.',
      why: 'A fork workflow often has two: origin (your fork) and upstream (the original repository).',
    },
    {
      id: 'u',
      range: { line: 2, startCol: 9, endCol: 11 },
      kind: 'parameter',
      title: '-u',
      what: 'Sets origin/main as the upstream of your main.',
      why: 'Afterwards plain git push, git pull and the ahead/behind counts in git status know which remote branch to use.',
    },
  ],
};

export const rejectShell: CodeExample = {
  id: 'push-rejected',
  language: 'bash',
  source: `$ git push                     # a teammate pushed since your last fetch
To https://github.com/ada/churn-model.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/ada/churn-model.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
$ git fetch
From https://github.com/ada/churn-model
   cd537e5..6b30484  main       -> origin/main
$ git status -sb
## main...origin/main [ahead 1, behind 1]
$ git pull                     # with no pull.rebase setting, Git asks you to choose
hint: You have divergent branches and need to specify how to reconcile them.
hint:   git config pull.rebase false  # merge
hint:   git config pull.rebase true   # rebase
hint:   git config pull.ff only       # fast-forward only
$ git pull --rebase && git push   # replay your commit on top of origin/main, then push`,
  annotations: [
    {
      id: 'ff',
      range: { line: 3 },
      kind: 'framework',
      title: 'Fast-forward only',
      what: 'A normal push succeeds only if the remote branch is an ancestor of what you push.',
      why: 'Otherwise the push would drop commits from the remote. Git refuses and leaves the integration to you.',
    },
    {
      id: 'fetch',
      range: { line: 11 },
      kind: 'function',
      title: 'git fetch',
      what: 'Downloads new objects and moves origin/main. It never touches your branches or files.',
      why: 'Always safe. Fetch first, look (git log main..origin/main), then decide how to integrate.',
    },
  ],
};

export const forceShell: CodeExample = {
  id: 'force-with-lease',
  language: 'bash',
  source: `git push --force                       # overwrite the remote branch, whatever is there
git push --force-with-lease            # overwrite only if it is still where my origin/feature says
git push --force-with-lease=feature:6b30484   # ... only if it is exactly at 6b30484
git config --global pull.rebase true   # make git pull rebase by default
git config --global push.autoSetupRemote true   # first git push of a branch sets its upstream`,
  annotations: [
    {
      id: 'lease',
      range: { line: 2 },
      kind: 'parameter',
      title: '--force-with-lease',
      what: 'A conditional force push: refused if someone pushed after your last fetch.',
      why: 'Plain --force silently deletes their commits. Note that a background git fetch (some editors do this) refreshes the lease, so fetch, look, then push.',
    },
  ],
};
