/**
 * Whether a pull request can merge under a set of branch protection rules, following GitHub's documented
 * behaviour for protected branches. Each blocking rule is reported in words, so the learner sees why.
 */
export interface ProtectionState {
  requiredApprovals: number;
  approvals: number;
  changesRequested: boolean;
  requireCodeOwner: boolean;
  codeOwnerApproved: boolean;
  checks: 'passing' | 'failing' | 'pending';
  requireUpToDate: boolean;
  behind: boolean;
  requireLinear: boolean;
  requireResolved: boolean;
  openThreads: number;
}

export interface ProtectionResult {
  mergeable: boolean;
  blockers: string[];
  methods: { method: 'merge commit' | 'squash and merge' | 'rebase and merge'; allowed: boolean; why: string }[];
}

export function evaluateProtection(s: ProtectionState): ProtectionResult {
  const blockers: string[] = [];
  if (s.requiredApprovals > 0) {
    if (s.approvals < s.requiredApprovals)
      blockers.push(`${s.requiredApprovals} approving review${s.requiredApprovals > 1 ? 's' : ''} required, ${s.approvals} given`);
    if (s.changesRequested) blockers.push('a reviewer requested changes: they must approve, or the review must be dismissed');
  }
  if (s.requireCodeOwner && !s.codeOwnerApproved) blockers.push('a code owner of a changed file must approve');
  if (s.checks === 'failing') blockers.push('a required status check is failing');
  if (s.checks === 'pending') blockers.push('a required status check has not finished');
  if (s.requireUpToDate && s.behind) blockers.push('the branch is behind main: update it so the checks run on the merged code');
  if (s.requireResolved && s.openThreads > 0)
    blockers.push(`${s.openThreads} review conversation${s.openThreads > 1 ? 's are' : ' is'} unresolved`);
  const ok = blockers.length === 0;
  const methods: ProtectionResult['methods'] = [
    {
      method: 'merge commit',
      allowed: ok && !s.requireLinear,
      why: s.requireLinear ? 'linear history is required, so merge commits are not allowed' : ok ? 'adds a merge commit with two parents' : 'blocked',
    },
    { method: 'squash and merge', allowed: ok, why: ok ? 'one new commit on main with all the changes' : 'blocked' },
    { method: 'rebase and merge', allowed: ok, why: ok ? 'replays each commit onto main with new ids' : 'blocked' },
  ];
  return { mergeable: ok, blockers, methods };
}
