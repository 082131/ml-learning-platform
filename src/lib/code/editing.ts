/** Text editing for the plain code editor: Tab indents, Shift+Tab dedents (whole lines when text is selected). */
export const INDENT = '    ';

export interface EditState {
  value: string;
  start: number;
  end: number;
}

export function indent({ value, start, end }: EditState, dedent: boolean): EditState {
  if (!dedent && start === end) {
    return {
      value: value.slice(0, start) + INDENT + value.slice(end),
      start: start + INDENT.length,
      end: start + INDENT.length,
    };
  }
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const block = value.slice(lineStart, end);
  const lines = block.split('\n');
  let firstShift = 0;
  let total = 0;
  const changed = lines.map((line, i) => {
    if (!dedent) {
      if (i === 0) firstShift = INDENT.length;
      total += INDENT.length;
      return INDENT + line;
    }
    const remove = /^ {0,4}/.exec(line)?.[0].length ?? 0;
    if (i === 0) firstShift = -Math.min(remove, start - lineStart);
    total -= remove;
    return line.slice(remove);
  });
  return {
    value: value.slice(0, lineStart) + changed.join('\n') + value.slice(end),
    start: Math.max(lineStart, start + firstShift),
    end: end + total,
  };
}
