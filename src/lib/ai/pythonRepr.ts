const ESCAPES: Record<string, string> = { '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t' };

/**
 * A string as Python's repr() writes it: single quotes, unless the text contains a single quote
 * and no double quote. Backslashes, the chosen quote and \n, \r, \t are escaped.
 */
export function pyStr(text: string): string {
  const quote = text.includes("'") && !text.includes('"') ? '"' : "'";
  let out = '';
  for (const c of text) {
    if (c in ESCAPES) out += ESCAPES[c];
    else if (c === quote) out += `\\${c}`;
    else if (/^\p{Cc}$/u.test(c)) out += `\\x${c.codePointAt(0)!.toString(16).padStart(2, '0')}`;
    else out += c;
  }
  return quote + out + quote;
}

/** A list of strings or numbers as Python prints it: ['a', "it's"] or [101, 102]. */
export function pyList(items: readonly (string | number)[]): string {
  return `[${items.map((x) => (typeof x === 'string' ? pyStr(x) : String(x))).join(', ')}]`;
}
