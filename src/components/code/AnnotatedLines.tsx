import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { Segment } from '@/lib/code/segments';
import type { Annotation } from '@/lib/types';
import { cx } from '@/components/ui';
import { KIND_LABEL } from './kinds';
import s from './Code.module.css';

interface AnnotatedLinesProps {
  label: string;
  lines: Segment[][];
  annotations: Annotation[];
  /** The roving tab stop: the one annotation reachable with Tab. */
  focusId: string;
  /** Highlighted: the pinned annotation, or the one being previewed. */
  activeId: string | null;
  pinnedId: string | null;
  onFocusId: (id: string) => void;
  onPreview: (id: string | null) => void;
  onToggle: (id: string) => void;
  onEscape: () => void;
}

const isWholeLine = (a: Annotation) => a.range.startCol === undefined;

/** Annotation IDs in reading order: a line's gutter note first, then its spans left to right. */
export function readingOrder(annotations: Annotation[]): Annotation[] {
  return [...annotations].sort(
    (a, b) =>
      a.range.line - b.range.line ||
      (isWholeLine(a) ? -1 : (a.range.startCol ?? 0)) - (isWholeLine(b) ? -1 : (b.range.startCol ?? 0)),
  );
}

/** Groups a line's segments into runs that share one column annotation (they never overlap). */
function runs(segments: Segment[], spanIds: Set<string>) {
  const out: { id?: string; segments: Segment[] }[] = [];
  for (const seg of segments) {
    const id = seg.marks.find((m) => spanIds.has(m));
    const last = out.at(-1);
    if (last && last.id === id) last.segments.push(seg);
    else out.push({ id, segments: [seg] });
  }
  return out;
}

export function Tokens({ segments }: { segments: Segment[] }) {
  return segments.map((seg) => (
    <span key={seg.start} className={seg.cls ? s[seg.cls] : undefined}>
      {seg.text}
    </span>
  ));
}

/** Code with focusable annotations: roving tabindex, arrows move, Enter pins, Escape unpins. */
export function AnnotatedLines(props: AnnotatedLinesProps) {
  const { lines, annotations, focusId, activeId } = props;
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const byId = new Map(annotations.map((a) => [a.id, a]));
  const order = readingOrder(annotations).map((a) => a.id);
  const spanIds = new Set(annotations.filter((a) => !isWholeLine(a)).map((a) => a.id));
  const activeLine = activeId ? byId.get(activeId)?.range.line : undefined;

  const moveTo = (id: string | undefined) => {
    if (!id) return;
    props.onFocusId(id);
    refs.current.get(id)?.focus();
  };
  const lineOf = (id: string) => byId.get(id)?.range.line ?? 0;

  const onKeyDown = (e: KeyboardEvent) => {
    const i = order.indexOf(focusId);
    const line = lineOf(focusId);
    const handlers: Record<string, () => string | undefined> = {
      ArrowRight: () => order[Math.min(i + 1, order.length - 1)],
      ArrowLeft: () => order[Math.max(i - 1, 0)],
      ArrowDown: () => order.find((id) => lineOf(id) > line),
      ArrowUp: () => {
        const above = order.findLast((id) => lineOf(id) < line);
        return above && order.find((id) => lineOf(id) === lineOf(above));
      },
      Home: () => order[0],
      End: () => order.at(-1),
    };
    if (e.key === 'Escape') {
      props.onEscape();
      return;
    }
    const handler = handlers[e.key];
    if (!handler) return;
    e.preventDefault();
    moveTo(handler());
  };

  const button = (a: Annotation, className: string | undefined, children: ReactNode, label?: string) => (
    <button
      key={a.id}
      ref={(el) => {
        if (el) refs.current.set(a.id, el);
        else refs.current.delete(a.id);
      }}
      type="button"
      className={cx(className, s[a.kind])}
      tabIndex={a.id === focusId ? 0 : -1}
      aria-pressed={a.id === props.pinnedId}
      aria-label={label}
      aria-description={`${KIND_LABEL[a.kind]}: ${a.title}`}
      data-active={a.id === activeId}
      data-annotation={a.id}
      onClick={() => props.onToggle(a.id)}
      onFocus={() => {
        props.onFocusId(a.id);
        props.onPreview(a.id);
      }}
      onBlur={() => props.onPreview(null)}
      onMouseEnter={() => props.onPreview(a.id)}
      onMouseLeave={() => props.onPreview(null)}
    >
      {children}
    </button>
  );

  return (
    <pre className={s.pre} role="group" aria-label={props.label} onKeyDown={onKeyDown}>
      <code>
        {lines.map((segments, i) => {
          const lineNo = i + 1;
          const note = annotations.find((a) => isWholeLine(a) && a.range.line === lineNo);
          return (
            <span key={lineNo} className={cx(s.line, activeLine === lineNo && s.activeLine)}>
              <span className={s.gutter}>
                {note ? (
                  button(note, s.lineNote, lineNo, `Line ${lineNo}: ${note.title}`)
                ) : (
                  <span aria-hidden="true">{lineNo}</span>
                )}
              </span>
              <span className={s.content}>
                {runs(segments, spanIds).map((run) => {
                  const a = run.id ? byId.get(run.id) : undefined;
                  const tokens = <Tokens segments={run.segments} />;
                  return a ? button(a, s.ann, tokens) : <span key={run.segments[0]?.start}>{tokens}</span>;
                })}
                {segments.length === 0 && ' '}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}
