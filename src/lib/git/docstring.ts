/**
 * A small parser for Google-style and NumPy-style docstrings (the two styles Sphinx's napoleon extension reads),
 * plus the check documentation linters such as pydoclint make: do the documented parameters match the
 * signature? It covers the sections lessons use: Args/Parameters, Returns, Raises and Examples.
 */
export interface DocParam {
  name: string;
  type: string;
  description: string;
}

export interface ParsedDoc {
  style: 'google' | 'numpy' | 'none';
  summary: string;
  description: string;
  params: DocParam[];
  returns?: { type: string; description: string };
  raises: { type: string; description: string }[];
  examples: string[];
}

const GOOGLE_SECTIONS = new Set(['Args', 'Arguments', 'Parameters', 'Returns', 'Raises', 'Examples', 'Example', 'Yields', 'Note', 'Notes']);

function dedent(lines: string[]): string[] {
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length));
  return lines.map((l) => l.slice(Number.isFinite(ind) ? ind : 0));
}

export function parseDocstring(doc: string): ParsedDoc {
  const empty: ParsedDoc = { style: 'none', summary: '', description: '', params: [], raises: [], examples: [] };
  if (!doc.trim()) return empty;
  const raw = doc.replace(/\r/g, '').split('\n');
  const first = raw[0]!.trim();
  const lines = [first, ...dedent(raw.slice(1))];
  const isNumpy = lines.some((l, i) => /^-{3,}$/.test(l.trim()) && i > 0 && lines[i - 1]!.trim().length > 0);
  const style: ParsedDoc['style'] = isNumpy ? 'numpy' : lines.some((l) => /^(\w+):\s*$/.test(l) && GOOGLE_SECTIONS.has(l.trim().slice(0, -1))) ? 'google' : 'none';
  const sections: Record<string, string[]> = {};
  const head: string[] = [];
  let cur: string[] = head;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (style === 'numpy' && lines[i + 1] && /^-{3,}$/.test(lines[i + 1]!.trim()) && l.trim()) {
      cur = sections[l.trim()] = [];
      i++;
      continue;
    }
    const g = /^(\w+):\s*$/.exec(l);
    if (style === 'google' && g && GOOGLE_SECTIONS.has(g[1]!)) {
      cur = sections[g[1]!] = [];
      continue;
    }
    cur.push(l);
  }
  const headText = head.join('\n').trim().split(/\n\s*\n/);
  const out: ParsedDoc = { ...empty, style, summary: headText[0]!.replace(/\s+/g, ' ').trim(), description: headText.slice(1).join('\n\n').trim() };
  const block = (name: string[]) => {
    for (const n of name) if (sections[n]) return dedent(sections[n]!);
    return undefined;
  };
  // Entries: a line at the section's base indent starts an entry; deeper lines continue it.
  const entries = (ls: string[] | undefined): string[][] => {
    if (!ls) return [];
    const res: string[][] = [];
    for (const l of ls) {
      if (!l.trim()) continue;
      if (!/^\s/.test(l)) res.push([l.trim()]);
      else res[res.length - 1]?.push(l.trim());
    }
    return res;
  };
  const params = block(['Args', 'Arguments', 'Parameters']);
  for (const e of entries(params)) {
    if (style === 'google') {
      const m = /^(\*{0,2}\w+)\s*(?:\(([^)]*)\))?:\s*(.*)$/.exec(e[0]!);
      if (m) out.params.push({ name: m[1]!, type: m[2] ?? '', description: [m[3], ...e.slice(1)].join(' ').trim() });
    } else {
      const m = /^(\*{0,2}\w+)\s*(?::\s*(.*))?$/.exec(e[0]!);
      if (m) out.params.push({ name: m[1]!, type: m[2] ?? '', description: e.slice(1).join(' ') });
    }
  }
  const ret = entries(block(['Returns']));
  if (ret.length) {
    const e = ret[0]!;
    if (style === 'google') {
      const m = /^([^:]+):\s*(.*)$/.exec(e[0]!);
      out.returns = m ? { type: m[1]!.trim(), description: [m[2], ...e.slice(1)].join(' ').trim() } : { type: '', description: e.join(' ') };
    } else {
      const m = /^(?:(\w+)\s*:\s*)?(.+)$/.exec(e[0]!);
      out.returns = { type: m?.[2]?.trim() ?? '', description: e.slice(1).join(' ') };
    }
  }
  for (const e of entries(block(['Raises']))) {
    if (style === 'google') {
      const m = /^(\w+):\s*(.*)$/.exec(e[0]!);
      if (m) out.raises.push({ type: m[1]!, description: [m[2], ...e.slice(1)].join(' ').trim() });
    } else out.raises.push({ type: e[0]!, description: e.slice(1).join(' ') });
  }
  const ex = block(['Examples', 'Example']);
  if (ex) out.examples = ex.filter((l) => l.trim()).map((l) => l.trim());
  return out;
}

/** Parameters in the signature but not documented, and documented but not in the signature. */
export function checkParams(signature: string[], doc: ParsedDoc): { missing: string[]; extra: string[] } {
  const sig = signature.filter((p) => p !== 'self' && p !== 'cls');
  const documented = doc.params.map((p) => p.name.replace(/^\*+/, ''));
  return {
    missing: sig.map((p) => p.replace(/^\*+/, '')).filter((p) => !documented.includes(p)),
    extra: documented.filter((p) => !sig.map((x) => x.replace(/^\*+/, '')).includes(p)),
  };
}
