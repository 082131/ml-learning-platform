/** An arithmetic error with the position (0-based character index) where it was found. */
export class CalcError extends Error {}

type Tok = { kind: 'num'; value: number; pos: number } | { kind: 'op'; value: string; pos: number };

function tokenize(src: string): Tok[] {
  const tokens: Tok[] = [];
  const chars = [...src];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i]!;
    if (c === ' ') i++;
    else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < chars.length && /[0-9.]/.test(chars[j]!)) j++;
      const text = chars.slice(i, j).join('');
      if (!/^\d+(\.\d+)?$|^\.\d+$/.test(text)) throw new CalcError(`Malformed number "${text}" at position ${i}`);
      tokens.push({ kind: 'num', value: Number(text), pos: i });
      i = j;
    } else if ('+-*/()'.includes(c)) tokens.push({ kind: 'op', value: c, pos: i++ });
    else throw new CalcError(`Unexpected character "${c}" at position ${i}: use digits, + - * / and parentheses`);
  }
  return tokens;
}

/**
 * Evaluates + − × ÷ (written + - * /), unary minus and parentheses, with the usual precedence.
 * A small recursive-descent parser: it never runs code, unlike eval().
 */
export function calculate(expression: string): number {
  const tokens = tokenize(expression);
  let p = 0;
  const peek = () => tokens[p];
  const fail = (what: string): never => {
    const t = peek();
    throw new CalcError(t ? `Unexpected "${t.value}" at position ${t.pos}: expected ${what}` : `Expression ended early: expected ${what}`);
  };
  const isOp = (v: string) => peek()?.kind === 'op' && peek()!.value === v;
  function primary(): number {
    const t = peek();
    if (t?.kind === 'num') {
      p++;
      return t.value;
    }
    if (isOp('-')) {
      p++;
      return -primary();
    }
    if (isOp('(')) {
      p++;
      const v = sum();
      if (!isOp(')')) fail('")"');
      p++;
      return v;
    }
    return fail('a number');
  }
  function product(): number {
    let v = primary();
    while (isOp('*') || isOp('/')) {
      const op = tokens[p++]!.value;
      const r = primary();
      if (op === '/' && r === 0) throw new CalcError('Division by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function sum(): number {
    let v = product();
    while (isOp('+') || isOp('-')) v = tokens[p++]!.value === '+' ? v + product() : v - product();
    return v;
  }
  if (tokens.length === 0) throw new CalcError('Empty expression');
  const value = sum();
  if (p < tokens.length) fail('an operator');
  return value;
}

const DECIMALS = 10;
/** Rounds away floating-point noise (0.1 + 0.2 → 0.3) and prints whole numbers without a decimal point. */
export const formatResult = (x: number) => String(Number(x.toFixed(DECIMALS)));
