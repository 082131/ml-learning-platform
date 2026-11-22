/**
 * Semantic Versioning 2.0.0 (parsing, precedence and bumps), next-version rules from Conventional Commits 1.0.0
 * as semantic-release applies them by default, and npm's caret and tilde ranges. semver.test.ts checks the
 * precedence example from the SemVer spec and npm's documented range expansions.
 */
export interface Version {
  major: number;
  minor: number;
  patch: number;
  pre: (string | number)[];
  build: string;
}

const RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function parseVersion(text: string): Version | undefined {
  const m = RE.exec(text.trim());
  if (!m) return undefined;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ? m[4].split('.').map((x) => (/^\d+$/.test(x) ? Number(x) : x)) : [],
    build: m[5] ?? '',
  };
}

export const formatVersion = (v: Version): string =>
  `${v.major}.${v.minor}.${v.patch}${v.pre.length ? `-${v.pre.join('.')}` : ''}${v.build ? `+${v.build}` : ''}`;

/** SemVer precedence (build metadata is ignored): negative if a < b. */
export function compareVersions(a: Version, b: Version): number {
  for (const k of ['major', 'minor', 'patch'] as const) if (a[k] !== b[k]) return a[k] - b[k];
  if (!a.pre.length || !b.pre.length) return (b.pre.length ? 1 : 0) - (a.pre.length ? 1 : 0);
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export type Bump = 'major' | 'minor' | 'patch' | 'none';

export function bump(v: Version, level: Bump): Version {
  if (level === 'none') return v;
  // A pre-release of the target version is released as that version (1.1.0-rc.1 + minor -> 1.1.0).
  if (v.pre.length) {
    const releaseOf = { ...v, pre: [], build: '' };
    if (level === 'patch' || (level === 'minor' && v.patch === 0) || (level === 'major' && v.minor === 0 && v.patch === 0)) return releaseOf;
  }
  if (level === 'major') return { major: v.major + 1, minor: 0, patch: 0, pre: [], build: '' };
  if (level === 'minor') return { major: v.major, minor: v.minor + 1, patch: 0, pre: [], build: '' };
  return { major: v.major, minor: v.minor, patch: v.patch + 1, pre: [], build: '' };
}

export interface CommitClass {
  message: string;
  type: string;
  scope?: string;
  breaking: boolean;
  bump: Bump;
  description: string;
}

const HEADER = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;

/** Classifies one commit message by Conventional Commits, with semantic-release's default release rules. */
export function classifyCommit(message: string): CommitClass {
  const [header = '', ...rest] = message.split('\n');
  const m = HEADER.exec(header.trim());
  const footerBreaking = rest.some((l) => /^BREAKING[ -]CHANGE: /.test(l));
  if (!m) return { message, type: '(none)', breaking: footerBreaking, bump: footerBreaking ? 'major' : 'none', description: header };
  const type = m[1]!.toLowerCase();
  const breaking = Boolean(m[3]) || footerBreaking;
  const b: Bump = breaking ? 'major' : type === 'feat' ? 'minor' : type === 'fix' || type === 'perf' ? 'patch' : 'none';
  return { message, type, scope: m[2], breaking, bump: b, description: m[4]! };
}

const RANK: Record<Bump, number> = { none: 0, patch: 1, minor: 2, major: 3 };

export function nextVersion(current: string, messages: string[]): { version: string; bump: Bump; commits: CommitClass[] } {
  const v = parseVersion(current);
  if (!v) throw new Error(`not a semantic version: ${current}`);
  const commits = messages.map(classifyCommit);
  const level = commits.reduce<Bump>((acc, c) => (RANK[c.bump] > RANK[acc] ? c.bump : acc), 'none');
  return { version: formatVersion(bump(v, level)), bump: level, commits };
}

/** A Keep a Changelog section for a release, from classified commits. */
export function changelogSection(version: string, date: string, commits: CommitClass[]): string {
  const groups: Record<string, string[]> = { Added: [], Changed: [], Fixed: [] };
  for (const c of commits) {
    const text = c.description.charAt(0).toUpperCase() + c.description.slice(1);
    if (c.breaking) groups.Changed!.push(`**Breaking:** ${text}`);
    else if (c.type === 'feat') groups.Added!.push(text);
    else if (c.type === 'fix') groups.Fixed!.push(text);
    else if (c.type === 'perf') groups.Changed!.push(text);
  }
  const lines = [`## [${version}] - ${date}`];
  for (const [g, items] of Object.entries(groups)) if (items.length) lines.push('', `### ${g}`, ...items.map((x) => `- ${x}`));
  if (lines.length === 1) lines.push('', '(no user-facing changes: no release)');
  return lines.join('\n');
}

/** npm range for ^ and ~, as [lower inclusive, upper exclusive] (node-semver's documented expansion). */
export function npmRange(range: string): { lower: Version; upper: Version; text: string } {
  const op = range[0];
  const v = parseVersion(range.slice(1));
  if ((op !== '^' && op !== '~') || !v) throw new Error(`unsupported range ${range}`);
  const lower = { ...v, build: '' };
  let upper: Version;
  if (op === '~') upper = { major: v.major, minor: v.minor + 1, patch: 0, pre: [0], build: '' };
  else if (v.major > 0) upper = { major: v.major + 1, minor: 0, patch: 0, pre: [0], build: '' };
  else if (v.minor > 0) upper = { major: 0, minor: v.minor + 1, patch: 0, pre: [0], build: '' };
  else upper = { major: 0, minor: 0, patch: v.patch + 1, pre: [0], build: '' };
  const text = `>=${formatVersion(lower)} <${upper.major}.${upper.minor}.${upper.patch}-0`;
  return { lower, upper, text };
}

/**
 * Does `version` satisfy the npm range? A pre-release only satisfies a range whose lower bound is a pre-release of
 * the same major.minor.patch (npm's default; --include-prerelease turns this off).
 */
export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;
  const { lower, upper } = npmRange(range);
  if (compareVersions(v, lower) < 0 || compareVersions(v, upper) >= 0) return false;
  if (v.pre.length && !(lower.pre.length && lower.major === v.major && lower.minor === v.minor && lower.patch === v.patch)) return false;
  return true;
}
