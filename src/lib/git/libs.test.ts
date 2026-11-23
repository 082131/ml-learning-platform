import { describe, expect, it } from 'vitest';
import { checkParams, parseDocstring } from './docstring';
import { ownersFor, parseCodeowners, patternRegex } from './codeowners';
import { expandMatrix, wallClock } from './matrix';
import { evaluateProtection, type ProtectionState } from './protection';
import { bump, changelogSection, classifyCommit, compareVersions, formatVersion, nextVersion, npmRange, parseVersion, satisfies } from './semver';

describe('codeowners (GitHub documentation examples)', () => {
  const rules = parseCodeowners(`# comment
*       @global-owner1 @global-owner2
*.js    @js-owner #This is an inline comment.
/build/logs/ @doctocat
docs/*  docs@example.com
apps/ @octocat
/docs/ @doctocat
**/logs @octocat
/apps/ @octocat
/apps/github
`);
  it('last match wins', () => {
    expect(ownersFor(rules, 'README.md').owners).toEqual(['@global-owner1', '@global-owner2']);
    expect(ownersFor(rules, 'src/app.js').owners).toEqual(['@js-owner']);
  });
  it('directory and wildcard rules', () => {
    expect(ownersFor(rules, 'build/logs/x/y.txt').owners).toEqual(['@octocat']); // **/logs is later than /build/logs/
    expect(patternRegex('docs/*').test('docs/getting-started.md')).toBe(true);
    expect(patternRegex('docs/*').test('docs/build-app/troubleshooting.md')).toBe(false);
    expect(patternRegex('apps/').test('src/apps/main.py')).toBe(true);
    expect(patternRegex('/docs/').test('src/docs/a.md')).toBe(false);
    expect(patternRegex('**/logs').test('deeply/nested/logs/a.log')).toBe(true);
  });
  it('a line with no owners leaves the path unowned', () => {
    expect(ownersFor(rules, 'apps/github/x.ts').owners).toEqual([]);
    expect(ownersFor(rules, 'apps/web/x.ts').owners).toEqual(['@octocat']);
  });
});

describe('branch protection', () => {
  const base: ProtectionState = { requiredApprovals: 1, approvals: 1, changesRequested: false, requireCodeOwner: false, codeOwnerApproved: false, checks: 'passing', requireUpToDate: false, behind: false, requireLinear: false, requireResolved: false, openThreads: 0 };
  it('passes when every rule is met', () => {
    const r = evaluateProtection(base);
    expect(r.mergeable).toBe(true);
    expect(r.methods.map((m) => m.allowed)).toEqual([true, true, true]);
  });
  it('lists each blocker', () => {
    const r = evaluateProtection({ ...base, approvals: 0, checks: 'failing', requireUpToDate: true, behind: true });
    expect(r.blockers).toHaveLength(3);
  });
  it('linear history forbids merge commits only', () => {
    expect(evaluateProtection({ ...base, requireLinear: true }).methods.map((m) => m.allowed)).toEqual([false, true, true]);
  });
});

describe('matrix (GitHub documentation example)', () => {
  it('expands include as documented', () => {
    const r = expandMatrix({
      vars: { fruit: ['apple', 'pear'], animal: ['cat', 'dog'] },
      include: [{ color: 'green' }, { color: 'pink', animal: 'cat' }, { fruit: 'apple', shape: 'circle' }, { fruit: 'banana' }, { fruit: 'banana', animal: 'cat' }],
    });
    expect(r).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle' },
      { fruit: 'pear', animal: 'cat', color: 'pink' },
      { fruit: 'pear', animal: 'dog', color: 'green' },
      { fruit: 'banana' },
      { fruit: 'banana', animal: 'cat' },
    ]);
  });
  it('excludes partial matches and orders by the first variable', () => {
    const r = expandMatrix({ vars: { os: ['macos-latest', 'windows-latest'], version: ['12', '14', '16'], environment: ['staging', 'production'] }, exclude: [{ os: 'macos-latest', version: '12', environment: 'production' }, { os: 'windows-latest', version: '16' }] });
    expect(r).toHaveLength(12 - 1 - 2);
    expect(r[0]).toEqual({ os: 'macos-latest', version: '12', environment: 'staging' });
  });
  it('wall clock with limited parallelism', () => {
    expect(wallClock([4, 4, 4, 4], 2)).toBe(8);
    expect(wallClock([7, 4, 4], 3)).toBe(7);
    expect(wallClock([], 3)).toBe(0);
  });
});

describe('semver', () => {
  it('orders the SemVer 2.0.0 spec example', () => {
    const order = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
    const shuffled = [...order].reverse();
    expect(shuffled.sort((a, b) => compareVersions(parseVersion(a)!, parseVersion(b)!))).toEqual(order);
    expect(compareVersions(parseVersion('1.0.0+build.5')!, parseVersion('1.0.0')!)).toBe(0);
    expect(parseVersion('01.2.3')).toBeUndefined();
  });
  it('bumps like node-semver inc', () => {
    const b = (v: string, l: 'major' | 'minor' | 'patch') => formatVersion(bump(parseVersion(v)!, l));
    expect(b('1.4.2', 'minor')).toBe('1.5.0');
    expect(b('1.4.2', 'major')).toBe('2.0.0');
    expect(b('2.0.0-rc.1', 'patch')).toBe('2.0.0');
    expect(b('1.2.0-rc.1', 'minor')).toBe('1.2.0');
    expect(b('1.2.3-rc.1', 'minor')).toBe('1.3.0');
  });
  it('next version from Conventional Commits', () => {
    expect(classifyCommit('feat(api)!: drop Python 3.9').bump).toBe('major');
    expect(classifyCommit('fix: handle empty batches\n\nBREAKING CHANGE: returns None now').bump).toBe('major');
    expect(classifyCommit('docs: fix typo').bump).toBe('none');
    expect(nextVersion('1.4.2', ['fix: a', 'feat: b', 'chore: c']).version).toBe('1.5.0');
    expect(nextVersion('1.4.2', ['docs: a']).version).toBe('1.4.2');
    expect(changelogSection('1.5.0', '2026-01-01', nextVersion('1.4.2', ['fix: handle empty batches', 'feat: add early stopping']).commits)).toBe(
      '## [1.5.0] - 2026-01-01\n\n### Added\n- Add early stopping\n\n### Fixed\n- Handle empty batches',
    );
  });
  it('npm caret and tilde ranges as documented', () => {
    expect(npmRange('^1.2.3').text).toBe('>=1.2.3 <2.0.0-0');
    expect(npmRange('^0.2.3').text).toBe('>=0.2.3 <0.3.0-0');
    expect(npmRange('^0.0.3').text).toBe('>=0.0.3 <0.0.4-0');
    expect(npmRange('~1.2.3').text).toBe('>=1.2.3 <1.3.0-0');
    expect(satisfies('1.9.0', '^1.2.3')).toBe(true);
    expect(satisfies('2.0.0-rc.1', '^1.2.3')).toBe(false);
    expect(satisfies('1.2.4-beta.2', '^1.2.4-beta.1')).toBe(true);
    expect(satisfies('1.3.0-beta.1', '^1.2.4-beta.1')).toBe(false);
  });
});

describe('docstrings', () => {
  const google = `Split rows into train and test sets.

    Rows are shuffled with a fixed seed.

    Args:
        rows (list): The examples to split.
        test_size (float): Share of rows for the test set,
            between 0 and 1.

    Returns:
        tuple: The train rows and the test rows.

    Raises:
        ValueError: If test_size is not between 0 and 1.

    Examples:
        >>> split([1, 2, 3, 4], 0.25)
        ([4, 1, 3], [2])
    `;
  it('parses a Google-style docstring', () => {
    const d = parseDocstring(google);
    expect(d.style).toBe('google');
    expect(d.summary).toBe('Split rows into train and test sets.');
    expect(d.params).toEqual([
      { name: 'rows', type: 'list', description: 'The examples to split.' },
      { name: 'test_size', type: 'float', description: 'Share of rows for the test set, between 0 and 1.' },
    ]);
    expect(d.returns).toEqual({ type: 'tuple', description: 'The train rows and the test rows.' });
    expect(d.raises).toEqual([{ type: 'ValueError', description: 'If test_size is not between 0 and 1.' }]);
    expect(d.examples).toEqual(['>>> split([1, 2, 3, 4], 0.25)', '([4, 1, 3], [2])']);
  });
  it('parses a NumPy-style docstring', () => {
    const d = parseDocstring(`Split rows into train and test sets.

    Parameters
    ----------
    rows : list
        The examples to split.
    test_size : float
        Share of rows for the test set.

    Returns
    -------
    tuple
        The train rows and the test rows.
    `);
    expect(d.style).toBe('numpy');
    expect(d.params.map((p) => [p.name, p.type, p.description])).toEqual([
      ['rows', 'list', 'The examples to split.'],
      ['test_size', 'float', 'Share of rows for the test set.'],
    ]);
    expect(d.returns).toEqual({ type: 'tuple', description: 'The train rows and the test rows.' });
  });
  it('finds undocumented and stale parameters', () => {
    expect(checkParams(['rows', 'test_size', 'seed'], parseDocstring(google))).toEqual({ missing: ['seed'], extra: [] });
  });
});
