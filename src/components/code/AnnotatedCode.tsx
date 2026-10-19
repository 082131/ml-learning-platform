import { useContext, useMemo, useState } from 'react';
import { splitSegments } from '@/lib/code/segments';
import { fillExample } from '@/lib/code/slots';
import type { AnnotationKind, CodeExample } from '@/lib/types';
import { PHONE_QUERY, Sheet, useMediaQuery } from '@/components/ui';
import { AnnotatedLines, readingOrder } from './AnnotatedLines';
import { EXPLAIN_HINT, ExplanationPanel } from './ExplanationPanel';
import { KIND_LABEL } from './kinds';
import { SlotStateContext } from './slotState';
import { useHighlightedLines } from './useHighlightedLines';
import s from './Code.module.css';
import layout from './AnnotatedCode.module.css';

interface AnnotatedCodeProps {
  example: CodeExample;
  /** Shown in the header, for example a file name. Defaults to the language. */
  title?: string;
}

/**
 * Code whose tokens, expressions and lines explain themselves on hover, focus and click (FR-004).
 * Pinned explanations dock beside the code on wide screens and open as a bottom sheet on phones.
 */
export function AnnotatedCode({ example, title }: AnnotatedCodeProps) {
  const state = useContext(SlotStateContext);
  const filled = useMemo(() => fillExample(example, state), [example, state]);
  const tokens = useHighlightedLines(filled.source, example.language);
  const lines = useMemo(() => splitSegments(tokens, filled.annotations), [tokens, filled.annotations]);
  const order = readingOrder(filled.annotations);
  const [pinned, setPinned] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [focusId, setFocusId] = useState(order[0]?.id ?? '');
  const phone = useMediaQuery(PHONE_QUERY);

  const byId = (id: string | null) => filled.annotations.find((a) => a.id === id);
  const shown = byId(pinned) ?? byId(preview);
  const kinds = [...new Set(filled.annotations.map((a) => a.kind))];
  const unpin = () => setPinned(null);

  return (
    <figure className={s.block} data-wide data-code-example={example.id}>
      <div className={layout.container}>
        <div className={layout.grid}>
          <div className={s.frame}>
            <div className={s.header}>
              <span>{title ?? example.language}</span>
              <span>{order.length} notes</span>
            </div>
            <AnnotatedLines
              label={`${title ?? example.language} code with ${order.length} explained parts`}
              lines={lines}
              annotations={filled.annotations}
              focusId={focusId}
              activeId={pinned ?? preview}
              pinnedId={pinned}
              onFocusId={setFocusId}
              onPreview={setPreview}
              onToggle={(id) => setPinned((p) => (p === id ? null : id))}
              onEscape={unpin}
            />
            <Legend kinds={kinds} />
          </div>
          {!phone && (
            <ExplanationPanel annotation={shown} pinned={!!pinned && shown?.id === pinned} onUnpin={unpin} />
          )}
        </div>
      </div>
      {phone && (
        <p className={layout.phoneHint} aria-live="polite">
          {shown
            ? `${KIND_LABEL[shown.kind]}: ${shown.title}. Tap or press Enter for details.`
            : EXPLAIN_HINT}
        </p>
      )}
      {example.expectedOutput && (
        <div className={s.frame}>
          <div className={s.header}>
            <span>Expected output</span>
          </div>
          <pre className={s.pre} tabIndex={0} role="group" aria-label="Expected output">
            <code className={layout.output}>{example.expectedOutput}</code>
          </pre>
        </div>
      )}
      <Sheet open={phone && !!pinned} onClose={unpin} title={byId(pinned)?.title ?? ''}>
        <ExplanationPanel annotation={byId(pinned)} pinned onUnpin={unpin} inSheet />
      </Sheet>
    </figure>
  );
}

function Legend({ kinds }: { kinds: AnnotationKind[] }) {
  if (kinds.length === 0) return null;
  return (
    <ul className={s.legend} aria-label="Underline styles">
      {kinds.map((k) => (
        <li key={k}>
          <span className={`${s.legendSample} ${s[k]}`} aria-hidden="true">
            abc
          </span>
          {KIND_LABEL[k]}
        </li>
      ))}
    </ul>
  );
}
