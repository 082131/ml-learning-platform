import { useMemo } from 'react';
import { assertInBounds, chars, splitLines, splitSegments, type Segment } from '@/lib/code/segments';
import type { CodeExample, CodeRange } from '@/lib/types';
import { cx } from '@/components/ui';
import { Tokens } from './AnnotatedLines';
import { useHighlightedLines } from './useHighlightedLines';
import s from './Code.module.css';

interface PlainCodeProps {
  source: string;
  language: CodeExample['language'];
  label: string;
  /** The range to highlight, such as the active line of a step-through. */
  active?: CodeRange;
}

const STEP = '__step';

/** Consecutive segments inside the active column range render as one <mark>. */
function groupRuns(segments: Segment[], partial: boolean) {
  const runs: { marked: boolean; segments: Segment[] }[] = [];
  for (const seg of segments) {
    const marked = partial && seg.marks.includes(STEP);
    const last = runs.at(-1);
    if (last && last.marked === marked) last.segments.push(seg);
    else runs.push({ marked, segments: [seg] });
  }
  return runs;
}

/** Highlighted, read-only code with an optional active range. Scrolls by keyboard when it overflows. */
export function PlainCode({ source, language, label, active }: PlainCodeProps) {
  const tokens = useHighlightedLines(source, language);
  const mark = useMemo(() => {
    if (!active) return [];
    try {
      assertInBounds(
        { id: STEP, range: active },
        splitLines(source).map((l) => chars(l).length),
      );
      return [{ id: STEP, range: active }];
    } catch {
      return []; // A stale range must not break the lesson; validateTrace catches it in tests.
    }
  }, [active, source]);
  const lines = useMemo(() => splitSegments(tokens, mark), [tokens, mark]);
  const partial = active?.startCol !== undefined;

  return (
    <pre className={s.pre} tabIndex={0} role="group" aria-label={label}>
      <code>
        {lines.map((segments, i) => {
          const isActive = mark.length > 0 && active?.line === i + 1;
          return (
            <span
              key={i}
              className={cx(s.line, isActive && s.activeLine)}
              data-active-line={isActive || undefined}
            >
              <span className={s.gutter} aria-hidden="true">
                {i + 1}
              </span>
              <span className={s.content}>
                {isActive && <span className="visually-hidden">Current line: </span>}
                {groupRuns(segments, partial).map((run) =>
                  run.marked ? (
                    <mark key={run.segments[0]?.start} className={s.step}>
                      <Tokens segments={run.segments} />
                    </mark>
                  ) : (
                    <Tokens key={run.segments[0]?.start} segments={run.segments} />
                  ),
                )}
                {segments.length === 0 && ' '}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}
