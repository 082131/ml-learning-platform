import { useId, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { indent } from '@/lib/code/editing';
import s from './PythonRunner.module.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const MIN_ROWS = 4;

/**
 * A plain textarea where Tab indents. Escape, then Tab, moves focus on, so the editor is never a keyboard trap.
 */
export function CodeEditor({ value, onChange, label }: CodeEditorProps) {
  const escaped = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  const hintId = useId();

  // Restore the cursor after an indent re-renders the controlled value.
  useLayoutEffect(() => {
    if (!selection.current) return;
    area.current?.setSelectionRange(selection.current.start, selection.current.end);
    selection.current = null;
  });

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      escaped.current = true;
      return;
    }
    if (e.key !== 'Tab' || escaped.current) {
      escaped.current = false;
      return;
    }
    e.preventDefault();
    const el = e.currentTarget;
    const next = indent({ value: el.value, start: el.selectionStart, end: el.selectionEnd }, e.shiftKey);
    selection.current = { start: next.start, end: next.end };
    onChange(next.value);
  };

  return (
    <div className={s.editor}>
      <textarea
        ref={area}
        className={s.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={Math.max(MIN_ROWS, value.split('\n').length + 1)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-label={label}
        aria-describedby={hintId}
      />
      <p id={hintId} className={s.hint}>
        Tab indents. Press Escape, then Tab, to leave the editor.
      </p>
    </div>
  );
}
