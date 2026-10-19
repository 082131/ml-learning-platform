import type { Annotation } from '@/lib/types';
import { Badge, Button } from '@/components/ui';
import { KIND_LABEL } from './kinds';
import s from './ExplanationPanel.module.css';

interface ExplanationPanelProps {
  annotation: Annotation | undefined;
  pinned: boolean;
  onUnpin: () => void;
  /** In the bottom sheet the sheet already has a title and a Close button. */
  inSheet?: boolean;
}

export const EXPLAIN_HINT =
  'Select underlined code to see what it does and why. Keyboard: Tab into the code, use the arrow keys, Enter pins, Escape unpins.';

/** What, why, inputs and output of one annotation, with its kind spelled out. */
export function ExplanationPanel({ annotation: a, pinned, onUnpin, inSheet }: ExplanationPanelProps) {
  if (!a)
    return (
      <div className={s.panel} aria-live="polite">
        <p className={s.hint}>{EXPLAIN_HINT}</p>
      </div>
    );
  const rows: [string, string | undefined][] = [
    ['What it does', a.what],
    ['Why it’s here', a.why],
    ['Inputs', a.inputs],
    ['Output', a.output],
  ];
  return (
    <div className={s.panel} aria-live="polite" data-annotation-panel={a.id}>
      <div className={s.head}>
        <Badge tone={pinned ? 'accent' : 'neutral'}>{KIND_LABEL[a.kind]}</Badge>
        {!inSheet && (
          <span className={s.state}>{pinned ? 'Pinned' : 'Preview · click or press Enter to pin'}</span>
        )}
        {pinned && !inSheet && (
          <Button variant="ghost" size="sm" onClick={onUnpin}>
            Unpin
          </Button>
        )}
      </div>
      {!inSheet && <h3 className={s.title}>{a.title}</h3>}
      <dl className={s.list}>
        {rows.map(([label, text]) =>
          text ? (
            <div key={label} className={s.row}>
              <dt>{label}</dt>
              <dd>{text}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  );
}
