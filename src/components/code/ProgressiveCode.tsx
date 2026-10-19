import { useMemo } from 'react';
import { diffLines, type DiffOp } from '@/lib/code/diff';
import { splitSegments } from '@/lib/code/segments';
import type { CodeExample } from '@/lib/types';
import { cx, Tabs } from '@/components/ui';
import { Tokens } from './AnnotatedLines';
import { useHighlightedLines } from './useHighlightedLines';
import code from './Code.module.css';
import s from './ProgressiveCode.module.css';

type Stage = NonNullable<CodeExample['stages']>[number];

const MARK: Record<DiffOp['type'], { sign: string; label: string }> = {
  add: { sign: '+', label: 'Added: ' },
  del: { sign: '−', label: 'Removed: ' },
  same: { sign: ' ', label: '' },
};

/** Code that grows stage by stage. Each stage shows what changed from the one before, marked in text. */
export function ProgressiveCode({ example, title }: { example: CodeExample; title?: string }) {
  const stages = example.stages ?? [];
  return (
    <figure className={code.block} data-wide data-progressive={example.id}>
      <div className={code.frame}>
        <div className={code.header}>
          <span>
            {title ?? example.language} · {stages.length} stages
          </span>
          <span aria-hidden="true">+ added · − removed</span>
        </div>
        <Tabs
          label={`${title ?? 'Code'} stages`}
          tabs={stages.map((stage, i) => ({
            id: stage.id,
            label: `${i + 1}. ${stage.title}`,
            content: <StageDiff stage={stage} prev={stages[i - 1]} language={example.language} />,
          }))}
        />
      </div>
    </figure>
  );
}

function StageDiff({
  stage,
  prev,
  language,
}: {
  stage: Stage;
  prev?: Stage;
  language: CodeExample['language'];
}) {
  const after = useHighlightedLines(stage.source, language);
  const before = useHighlightedLines(prev?.source ?? '', language);
  const ops: DiffOp[] = useMemo(
    () =>
      prev
        ? diffLines(prev.source, stage.source)
        : stage.source.split('\n').map((text, i) => ({ type: 'same', text, oldLine: i + 1, newLine: i + 1 })),
    [prev, stage.source],
  );
  const added = ops.filter((o) => o.type === 'add').length;
  const removed = ops.filter((o) => o.type === 'del').length;
  const newSegs = useMemo(() => splitSegments(after, []), [after]);
  const oldSegs = useMemo(() => splitSegments(before, []), [before]);

  return (
    <div className={s.stage}>
      <p className={s.note}>{stage.note}</p>
      {prev && (
        <p className={s.summary}>
          Compared with “{prev.title}”: {added} line{added === 1 ? '' : 's'} added, {removed} removed.
        </p>
      )}
      <pre className={code.pre} tabIndex={0} role="group" aria-label={`Stage ${stage.title} code`}>
        <code>
          {ops.map((op, i) => {
            const segs = op.type === 'del' ? oldSegs[op.oldLine - 1] : newSegs[op.newLine - 1];
            return (
              <span key={i} className={cx(code.line, s[op.type])} data-diff={op.type}>
                <span className={s.sign} aria-hidden="true">
                  {MARK[op.type].sign}
                </span>
                <span className={code.gutter} aria-hidden="true">
                  {op.type === 'del' ? '' : op.newLine}
                </span>
                <span className={code.content}>
                  {MARK[op.type].label && <span className="visually-hidden">{MARK[op.type].label}</span>}
                  {segs?.length ? <Tokens segments={segs} /> : op.text || ' '}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
