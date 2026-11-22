// Experiment definitions for the Git track's non-sandbox visuals. The logic lives in the modules they import,
// each with its own unit tests.
import type { ExperimentDef, ReadoutItem } from '../types';
import { checkParams, parseDocstring, type ParsedDoc } from './docstring';
import { ownersFor, parseCodeowners, type OwnerMatch } from './codeowners';
import { expandMatrix, wallClock } from './matrix';
import { evaluateProtection, type ProtectionResult, type ProtectionState } from './protection';
import { changelogSection, nextVersion, npmRange, satisfies, type Bump, type CommitClass } from './semver';

const yesNo = [
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
];

// ---------- branch protection ----------

export function protectionExperiment(id: string): ExperimentDef<ProtectionState, ProtectionResult> {
  return {
    id,
    initial: { requiredApprovals: 1, approvals: 0, changesRequested: false, requireCodeOwner: true, codeOwnerApproved: false, checks: 'pending', requireUpToDate: true, behind: true, requireLinear: false, requireResolved: true, openThreads: 1 },
    controls: [
      { kind: 'slider', id: 'required', label: 'Rule: approvals required', min: 0, max: 3, step: 1, get: (s) => s.requiredApprovals, set: (s, v) => ({ ...s, requiredApprovals: v }) },
      { kind: 'slider', id: 'approvals', label: 'PR: approvals given', min: 0, max: 3, step: 1, get: (s) => s.approvals, set: (s, v) => ({ ...s, approvals: v }) },
      { kind: 'select', id: 'changes', label: 'PR: a reviewer requested changes', options: yesNo, get: (s) => (s.changesRequested ? 'yes' : 'no'), set: (s, v) => ({ ...s, changesRequested: v === 'yes' }) },
      { kind: 'select', id: 'owner-rule', label: 'Rule: require code owner review', options: yesNo, get: (s) => (s.requireCodeOwner ? 'yes' : 'no'), set: (s, v) => ({ ...s, requireCodeOwner: v === 'yes' }) },
      { kind: 'select', id: 'owner', label: 'PR: a code owner approved', options: yesNo, get: (s) => (s.codeOwnerApproved ? 'yes' : 'no'), set: (s, v) => ({ ...s, codeOwnerApproved: v === 'yes' }) },
      {
        kind: 'select',
        id: 'checks',
        label: 'PR: required checks (CI)',
        options: [
          { value: 'passing', label: 'passing' },
          { value: 'pending', label: 'still running' },
          { value: 'failing', label: 'failing' },
        ],
        get: (s) => s.checks,
        set: (s, v) => ({ ...s, checks: v as ProtectionState['checks'] }),
      },
      { kind: 'select', id: 'uptodate', label: 'Rule: branch must be up to date', options: yesNo, get: (s) => (s.requireUpToDate ? 'yes' : 'no'), set: (s, v) => ({ ...s, requireUpToDate: v === 'yes' }) },
      { kind: 'select', id: 'behind', label: 'PR: branch is behind main', options: yesNo, get: (s) => (s.behind ? 'yes' : 'no'), set: (s, v) => ({ ...s, behind: v === 'yes' }) },
      { kind: 'select', id: 'resolved-rule', label: 'Rule: conversations must be resolved', options: yesNo, get: (s) => (s.requireResolved ? 'yes' : 'no'), set: (s, v) => ({ ...s, requireResolved: v === 'yes' }) },
      { kind: 'slider', id: 'threads', label: 'PR: unresolved conversations', min: 0, max: 3, step: 1, get: (s) => s.openThreads, set: (s, v) => ({ ...s, openThreads: v }) },
      { kind: 'select', id: 'linear', label: 'Rule: require linear history', options: yesNo, get: (s) => (s.requireLinear ? 'yes' : 'no'), set: (s, v) => ({ ...s, requireLinear: v === 'yes' }) },
    ],
    compute: evaluateProtection,
    readout: (_s, r) => [
      { label: 'Merge button', value: r.mergeable ? 'enabled' : `blocked (${r.blockers.length} rule${r.blockers.length > 1 ? 's' : ''})`, status: r.mergeable ? 'ok' : 'error' },
      { label: 'Allowed methods', value: r.methods.filter((m) => m.allowed).map((m) => m.method).join(', ') || 'none' },
    ],
  };
}

// ---------- CODEOWNERS ----------

export const CODEOWNERS_FILE = `# Each line: a pattern, then owners. The last matching line wins.
*                     @ada
*.py                  @ml-team
/data/                @data-team
/src/serving/         @platform-team @ada
docs/*                @docs-team
**/params.yaml        @ml-team @grace
/src/serving/vendor/`;

export interface OwnersState {
  path: string;
}

export function codeownersExperiment(id: string): ExperimentDef<OwnersState, OwnerMatch & { path: string }> {
  const rules = parseCodeowners(CODEOWNERS_FILE);
  return {
    id,
    initial: { path: 'src/serving/app.py' },
    controls: [{ kind: 'text', id: 'path', label: 'Changed file', maxLength: 80, get: (s) => s.path, set: (_s, v) => ({ path: v }) }],
    compute: (s) => ({ ...ownersFor(rules, s.path.trim()), path: s.path.trim() }),
    readout: (_s, r) => [
      { label: 'Matching line', value: r.rule ? `line ${r.rule.line}: ${r.rule.pattern}` : 'none' },
      { label: 'Review requested from', value: r.owners.join(' ') || 'nobody (no owner)' },
    ],
  };
}

// ---------- build matrix ----------

export interface MatrixState {
  pythons: string;
  oses: string;
  excludeWin: boolean;
  includeExp: boolean;
  parallel: number;
}

export interface MatrixResult {
  jobs: { os?: string; python?: string; experimental?: string; minutes: number }[];
  wall: number;
  total: number;
  yaml: string;
}

/** Assumed job durations in minutes (install, lint, test) by runner: a stated assumption, not a measurement. */
export const JOB_MINUTES: Record<string, number> = { 'ubuntu-latest': 4, 'windows-latest': 7, 'macos-latest': 6 };

export function matrixYaml(s: MatrixState): string {
  const lines = ['strategy:', '  max-parallel: ' + s.parallel, '  matrix:', `    os: [${s.oses}]`, `    python: [${s.pythons.split(',').map((v) => `"${v.trim()}"`).join(', ')}]`];
  if (s.excludeWin) lines.push('    exclude:', '      - os: windows-latest', '        python: "3.11"');
  if (s.includeExp) lines.push('    include:', '      - os: ubuntu-latest', '        python: "3.14"', '        experimental: true');
  return lines.join('\n');
}

export function runMatrix(s: MatrixState): MatrixResult {
  const combos = expandMatrix({
    vars: { os: s.oses.split(',').map((x) => x.trim()), python: s.pythons.split(',').map((x) => x.trim()) },
    exclude: s.excludeWin ? [{ os: 'windows-latest', python: '3.11' }] : [],
    include: s.includeExp ? [{ os: 'ubuntu-latest', python: '3.14', experimental: 'true' }] : [],
  });
  const jobs = combos.map((c) => ({ ...c, minutes: JOB_MINUTES[c.os ?? 'ubuntu-latest'] ?? 4 }));
  return { jobs, wall: wallClock(jobs.map((j) => j.minutes), s.parallel), total: jobs.reduce((a, j) => a + j.minutes, 0), yaml: matrixYaml(s) };
}

export function matrixExperiment(id: string): ExperimentDef<MatrixState, MatrixResult> {
  return {
    id,
    initial: { pythons: '3.11, 3.12, 3.13', oses: 'ubuntu-latest', excludeWin: false, includeExp: false, parallel: 4 },
    controls: [
      {
        kind: 'select',
        id: 'pythons',
        label: 'python',
        options: ['3.12, 3.13', '3.11, 3.12, 3.13'].map((v) => ({ value: v, label: v })),
        get: (s) => s.pythons,
        set: (s, v) => ({ ...s, pythons: v }),
      },
      {
        kind: 'select',
        id: 'oses',
        label: 'os',
        options: ['ubuntu-latest', 'ubuntu-latest, windows-latest', 'ubuntu-latest, windows-latest, macos-latest'].map((v) => ({ value: v, label: v })),
        get: (s) => s.oses,
        set: (s, v) => ({ ...s, oses: v }),
      },
      { kind: 'select', id: 'exclude', label: 'exclude windows + 3.11', options: yesNo, get: (s) => (s.excludeWin ? 'yes' : 'no'), set: (s, v) => ({ ...s, excludeWin: v === 'yes' }) },
      { kind: 'select', id: 'include', label: 'include 3.14 on ubuntu (experimental)', options: yesNo, get: (s) => (s.includeExp ? 'yes' : 'no'), set: (s, v) => ({ ...s, includeExp: v === 'yes' }) },
      { kind: 'slider', id: 'parallel', label: 'max-parallel', min: 1, max: 10, step: 1, get: (s) => s.parallel, set: (s, v) => ({ ...s, parallel: v }) },
    ],
    compute: runMatrix,
    readout: (_s, r) => [
      { label: 'Jobs', value: String(r.jobs.length) },
      { label: 'Wall clock (estimate)', value: `${r.wall} min` },
      { label: 'Runner minutes (estimate)', value: `${r.total} min` },
    ],
  };
}

// ---------- semantic versioning ----------

export const COMMIT_SETS: Record<string, { label: string; messages: string[] }> = {
  fixes: { label: 'two bug fixes', messages: ['fix: handle empty batches in predict()', 'fix(cli): exit with status 1 on a bad config'] },
  feature: { label: 'a feature, a fix, docs', messages: ['feat: add early stopping to train()', 'fix: handle empty batches in predict()', 'docs: document the early stopping options'] },
  breaking: { label: 'a breaking change (feat!)', messages: ['feat!: predict() returns probabilities, not labels', 'fix: handle empty batches in predict()'] },
  footer: { label: 'BREAKING CHANGE footer', messages: ['refactor: rename load_model to load\n\nBREAKING CHANGE: load_model() is removed; call load().', 'test: cover the new loader'] },
  chores: { label: 'docs, tests and chores only', messages: ['docs: fix a typo in the README', 'chore: update pre-commit hooks', 'test: add a test for the tokenizer'] },
};

export interface SemverState {
  current: string;
  set: string;
}

export interface SemverResult {
  version: string;
  bump: Bump;
  commits: CommitClass[];
  changelog: string;
}

export function semverExperiment(id: string): ExperimentDef<SemverState, SemverResult> {
  return {
    id,
    initial: { current: '1.4.2', set: 'feature' },
    controls: [
      { kind: 'select', id: 'current', label: 'Current version', options: ['0.4.2', '1.4.2', '2.0.0-rc.1'].map((v) => ({ value: v, label: v })), get: (s) => s.current, set: (s, v) => ({ ...s, current: v }) },
      { kind: 'select', id: 'set', label: 'Commits since the last release', options: Object.entries(COMMIT_SETS).map(([value, x]) => ({ value, label: x.label })), get: (s) => s.set, set: (s, v) => ({ ...s, set: v }) },
    ],
    compute: (s) => {
      const r = nextVersion(s.current, COMMIT_SETS[s.set]!.messages);
      return { ...r, changelog: changelogSection(r.version, '2026-03-02', r.commits) };
    },
    readout: (s, r) => [
      { label: 'Release type', value: r.bump === 'none' ? 'no release' : r.bump },
      { label: 'Next version', value: r.bump === 'none' ? `${s.current} (unchanged)` : r.version },
    ],
  };
}

export const RANGE_VERSIONS = ['0.2.3', '0.2.9', '0.3.0', '1.2.2', '1.2.3', '1.2.9', '1.3.0', '1.9.0', '2.0.0-rc.1', '2.0.0'];

export interface RangeState {
  range: string;
}

export function rangeExperiment(id: string): ExperimentDef<RangeState, { text: string; ok: Record<string, boolean> }> {
  return {
    id,
    initial: { range: '^1.2.3' },
    controls: [{ kind: 'select', id: 'range', label: 'npm range', options: ['^1.2.3', '~1.2.3', '^0.2.3'].map((v) => ({ value: v, label: v })), get: (s) => s.range, set: (_s, v) => ({ range: v }) }],
    compute: (s) => ({ text: npmRange(s.range).text, ok: Object.fromEntries(RANGE_VERSIONS.map((v) => [v, satisfies(v, s.range)])) }),
    readout: (s, r) => [
      { label: `${s.range} means`, value: r.text },
      { label: 'Matching versions', value: RANGE_VERSIONS.filter((v) => r.ok[v]).join(', ') || 'none' },
    ],
  };
}

// ---------- storing model versions ----------

export interface StorageState {
  sizeGb: number;
  versions: number;
}

export interface StorageRow {
  approach: string;
  clone: number;
  stored: number;
  note: string;
}

/**
 * What one clone downloads and what the server stores after `versions` releases of a model file of `sizeGb`.
 * Assumption: each version's weights differ throughout (retrained weights do not delta-compress), so Git's
 * packfiles cannot shrink them.
 */
export function storageRows(s: StorageState): StorageRow[] {
  const all = s.sizeGb * s.versions;
  return [
    { approach: 'plain Git', clone: all, stored: all, note: 'every version is in history, and every clone downloads all of them' },
    { approach: 'Git LFS', clone: s.sizeGb, stored: all, note: 'Git holds pointers; a checkout downloads only the version it needs' },
    { approach: 'DVC (S3 remote)', clone: s.sizeGb, stored: all, note: 'dvc pull fetches the version dvc.lock names; storage is your bucket' },
  ];
}

export function storageExperiment(id: string): ExperimentDef<StorageState, StorageRow[]> {
  return {
    id,
    initial: { sizeGb: 0.5, versions: 12 },
    controls: [
      { kind: 'slider', id: 'size', label: 'Model file size (GB)', min: 0.1, max: 5, step: 0.1, format: (v) => v.toFixed(1), get: (s) => s.sizeGb, set: (s, v) => ({ ...s, sizeGb: Number(v.toFixed(1)) }) },
      { kind: 'slider', id: 'versions', label: 'Versions released', min: 1, max: 52, step: 1, get: (s) => s.versions, set: (s, v) => ({ ...s, versions: v }) },
    ],
    compute: storageRows,
    readout: (s, r): ReadoutItem[] => [
      { label: 'One clone, plain Git', value: `${r[0]!.clone.toFixed(1)} GB` },
      { label: 'One clone, Git LFS or DVC', value: `${r[1]!.clone.toFixed(1)} GB` },
      { label: 'GitHub limit for one file in plain Git', value: s.sizeGb > 0.1 ? '100 MiB: this push would be rejected' : '100 MiB' },
    ],
  };
}

// ---------- docstrings ----------

export interface DocExample {
  label: string;
  signature: string[];
  source: string;
}

export const DOC_EXAMPLES: Record<string, DocExample> = {
  google: {
    label: 'Google style',
    signature: ['rows', 'test_size', 'seed'],
    source: `def split(rows, test_size=0.2, seed=0):
    """Split rows into a shuffled train set and test set.

    The shuffle uses random.Random(seed), so the split is reproducible.

    Args:
        rows (list): The examples to split.
        test_size (float): Share of rows for the test set, between 0 and 1.
        seed (int): Seed for the shuffle.

    Returns:
        tuple: The train rows and the test rows.

    Raises:
        ValueError: If test_size is not between 0 and 1.

    Examples:
        >>> split(list(range(10)), test_size=0.3)
        ([7, 4, 1, 2, 9, 3, 0], [5, 6, 8])
    """`,
  },
  numpy: {
    label: 'NumPy style',
    signature: ['rows', 'test_size', 'seed'],
    source: `def split(rows, test_size=0.2, seed=0):
    """Split rows into a shuffled train set and test set.

    Parameters
    ----------
    rows : list
        The examples to split.
    test_size : float
        Share of rows for the test set, between 0 and 1.
    seed : int
        Seed for the shuffle.

    Returns
    -------
    tuple
        The train rows and the test rows.

    Raises
    ------
    ValueError
        If test_size is not between 0 and 1.
    """`,
  },
  stale: {
    label: 'Stale: a parameter was renamed',
    signature: ['rows', 'test_fraction', 'seed'],
    source: `def split(rows, test_fraction=0.2, seed=0):
    """Split rows into a shuffled train set and test set.

    Args:
        rows (list): The examples to split.
        test_size (float): Share of rows for the test set.

    Returns:
        tuple: The train rows and the test rows.
    """`,
  },
  none: {
    label: 'One-liner only',
    signature: ['rows', 'test_size', 'seed'],
    source: `def split(rows, test_size=0.2, seed=0):
    """Split rows."""`,
  },
};

export function docstringBody(source: string): string {
  const m = /"""([\s\S]*?)"""/.exec(source);
  return m ? m[1]! : '';
}

export interface DocState {
  example: string;
}

export function docstringExperiment(id: string): ExperimentDef<DocState, { doc: ParsedDoc; missing: string[]; extra: string[] }> {
  return {
    id,
    initial: { example: 'google' },
    controls: [{ kind: 'select', id: 'example', label: 'Docstring', options: Object.entries(DOC_EXAMPLES).map(([value, x]) => ({ value, label: x.label })), get: (s) => s.example, set: (_s, v) => ({ example: v }) }],
    compute: (s) => {
      const ex = DOC_EXAMPLES[s.example]!;
      const doc = parseDocstring(docstringBody(ex.source));
      return { doc, ...checkParams(ex.signature, doc) };
    },
    readout: (_s, r) => [
      { label: 'Style detected', value: r.doc.style === 'none' ? 'summary only' : r.doc.style },
      {
        label: 'Parameter check (like pydoclint)',
        value: r.missing.length || r.extra.length ? [r.missing.length ? `undocumented: ${r.missing.join(', ')}` : '', r.extra.length ? `documented but not in the signature: ${r.extra.join(', ')}` : ''].filter(Boolean).join('; ') : 'every parameter documented',
        status: r.missing.length || r.extra.length ? 'error' : 'ok',
      },
    ],
  };
}
