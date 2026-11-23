/**
 * CODEOWNERS matching as GitHub documents it: gitignore-style patterns, the last matching line wins, and a line
 * with no owners leaves matching paths unowned. Differences from .gitignore that GitHub lists are kept: no "!"
 * negation and no [ ] ranges, and "docs/*" matches files directly in docs/ but not deeper ones.
 */
export interface OwnerRule {
  pattern: string;
  owners: string[];
  line: number;
}

export function parseCodeowners(text: string): OwnerRule[] {
  const rules: OwnerRule[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\s#.*$/, '').trim();
    if (!line || line.startsWith('#')) return;
    const [pattern, ...owners] = line.split(/\s+/);
    rules.push({ pattern: pattern!, owners, line: i + 1 });
  });
  return rules;
}

const esc = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');

/** A regular expression for one pattern, matched against a repository path without a leading slash. */
export function patternRegex(pattern: string): RegExp {
  let p = pattern;
  const dirOnly = p.endsWith('/');
  if (dirOnly) p = p.slice(0, -1);
  const anchored = p.startsWith('/') || p.includes('/');
  if (p.startsWith('/')) p = p.slice(1);
  let re = '';
  for (let i = 0; i < p.length; i++) {
    if (p.startsWith('**/', i)) {
      re += '(?:.*/)?';
      i += 2;
    } else if (p.startsWith('/**', i) && i + 3 === p.length) {
      re += '/.*';
      i += 2;
    } else if (p[i] === '*') re += '[^/]*';
    else if (p[i] === '?') re += '[^/]';
    else re += esc(p[i]!);
  }
  const last = p.split('/').pop() ?? '';
  // A directory match covers everything inside it; a wildcard in the last segment matches one level only.
  const suffix = dirOnly ? '/.*' : last.includes('*') && p !== '*' ? '' : '(?:/.*)?';
  return new RegExp(`${anchored ? '^' : '(?:^|/)'}${re}${suffix}$`);
}

export interface OwnerMatch {
  rule?: OwnerRule;
  owners: string[];
}

export function ownersFor(rules: OwnerRule[], path: string): OwnerMatch {
  const clean = path.replace(/^\/+/, '');
  let hit: OwnerRule | undefined;
  for (const r of rules) if (patternRegex(r.pattern).test(clean)) hit = r;
  return { rule: hit, owners: hit?.owners ?? [] };
}
