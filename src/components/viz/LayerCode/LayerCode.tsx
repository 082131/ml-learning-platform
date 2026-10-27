import { useMemo } from 'react';
import { fillExample } from '@/lib/code/slots';
import { splitSegments } from '@/lib/code/segments';
import type { CodeExample } from '@/lib/types';
import { Tokens } from '@/components/code/AnnotatedLines';
import { useHighlightedLines } from '@/components/code/useHighlightedLines';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { cx } from '@/components/ui';
import code from '@/components/code/Code.module.css';
import s from './LayerCode.module.css';

interface LayerCodeProps {
  example: CodeExample;
  /** The code lines (1-based) that belong to each layer index. */
  lines: Record<number, number[]>;
  /** Names of the layers, for the header. */
  names: readonly string[];
  title?: string;
}

/**
 * The experiment's code with the selected layer's lines marked (state.layer). Selecting a layer in
 * the network diagram moves the mark, so each part of the picture points at the code that computes it.
 */
export function LayerCode({ example, lines, names, title }: LayerCodeProps) {
  const { state } = useExperimentContext<{ layer: number }, unknown>('LayerCode');
  const { source } = useMemo(() => fillExample(example, state), [example, state]);
  const tokens = useHighlightedLines(source, example.language);
  const segments = useMemo(() => splitSegments(tokens, []), [tokens]);
  const marked = new Set(lines[state.layer] ?? []);
  const name = names[state.layer] ?? '';
  return (
    <figure className={code.block} data-wide data-layer-code={example.id}>
      <div className={code.frame}>
        <div className={code.header}>
          <span>{title ?? example.language}</span>
          <span aria-live="polite">Marked: {name.toLowerCase()}</span>
        </div>
        <pre
          className={code.pre}
          tabIndex={0}
          role="group"
          aria-label={`${title ?? 'Code'}, lines for the ${name.toLowerCase()} marked`}
        >
          <code>
            {segments.map((segs, i) => {
              const on = marked.has(i + 1);
              return (
                <span
                  key={i}
                  className={cx(code.line, on && code.activeLine, on && s.marked)}
                  data-layer-line={on || undefined}
                >
                  <span className={code.gutter} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={code.content}>
                    {on && <span className="visually-hidden">{name}: </span>}
                    <Tokens segments={segs} />
                    {segs.length === 0 && ' '}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </figure>
  );
}
