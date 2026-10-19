import { useState } from 'react';
import { cellError } from '@/lib/experiment';
import { formatNumber } from '@/lib/trace/values';
import { cx } from '@/components/ui';
import s from './MatrixGrid.module.css';

type Cell = readonly [number, number];

export interface MatrixGridProps {
  /** The matrix name used in labels, for example "A". Cells are labeled A[0][1], as in Python. */
  name: string;
  values: readonly (readonly number[])[];
  /** Makes cells editable. Only valid values (see `limits`) are reported. */
  onChange?: (i: number, j: number, value: number) => void;
  limits?: { min?: number; max?: number; integer?: boolean };
  /** Makes cells selectable buttons (when not editable). */
  onSelect?: (i: number, j: number) => void;
  selected?: Cell;
  highlightRows?: number[];
  highlightCols?: number[];
  highlightCells?: Cell[];
  /** Text under the grid. Defaults to the shape. */
  caption?: string;
}

const has = (cells: Cell[] | undefined, i: number, j: number) =>
  !!cells?.some(([a, b]) => a === i && b === j);

/**
 * A matrix as a table with 0-based row and column indices. Highlighted rows and columns get a
 * marker in their index header too, so the highlight is never color alone (constitution VIII).
 */
export function MatrixGrid(props: MatrixGridProps) {
  const { name, values, highlightRows = [], highlightCols = [], highlightCells, selected } = props;
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = (key: string, error: string | undefined) =>
    setErrors(({ [key]: _, ...rest }) => (error ? { ...rest, [key]: error } : rest));
  const shape = `shape (${rows}, ${cols})`;

  return (
    <div className={s.wrap} data-matrix={name}>
      <table className={s.table}>
        <caption className={s.caption}>
          <span className={s.name}>{name}</span> {props.caption ?? shape}
        </caption>
        <thead>
          <tr>
            <td />
            {Array.from({ length: cols }, (_, j) => (
              <th
                key={j}
                scope="col"
                className={s.index}
                data-highlight={highlightCols.includes(j) || undefined}
                aria-label={indexLabel('column', j, highlightCols.includes(j))}
              >
                {j}
                {highlightCols.includes(j) && ' ▾'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={s.body}>
          {values.map((row, i) => (
            <tr key={i}>
              <th
                scope="row"
                className={s.index}
                data-highlight={highlightRows.includes(i) || undefined}
                aria-label={indexLabel('row', i, highlightRows.includes(i))}
              >
                {highlightRows.includes(i) && '▸ '}
                {i}
              </th>
              {row.map((x, j) => {
                const hot =
                  highlightRows.includes(i) || highlightCols.includes(j) || has(highlightCells, i, j);
                const isSelected = selected?.[0] === i && selected[1] === j;
                return (
                  <td
                    key={j}
                    className={cx(s.cell, hot && s.hot, isSelected && s.selected)}
                    data-cell={`${i},${j}`}
                  >
                    <CellContent {...props} i={i} j={j} value={x} selected={isSelected} onError={setError} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {Object.entries(errors).map(([key, error]) => (
        <p key={key} role="alert" className={s.error}>
          {key}: {error}
        </p>
      ))}
    </div>
  );
}

interface CellProps extends Omit<MatrixGridProps, 'selected'> {
  i: number;
  j: number;
  value: number;
  selected: boolean;
  onError: (key: string, error: string | undefined) => void;
}

function CellContent({ name, i, j, value, onChange, onSelect, selected, limits = {}, onError }: CellProps) {
  const label = `${name}[${i}][${j}]`;
  if (onChange)
    return (
      <CellInput
        label={label}
        value={value}
        limits={limits}
        onChange={(v) => onChange(i, j, v)}
        onError={onError}
      />
    );
  if (onSelect)
    return (
      <button
        type="button"
        className={s.button}
        aria-pressed={selected}
        aria-label={`${label} = ${formatNumber(value)}`}
        onClick={() => onSelect(i, j)}
      >
        {formatNumber(value)}
      </button>
    );
  return <span className={s.value}>{formatNumber(value)}</span>;
}

function CellInput({
  label,
  value,
  limits,
  onChange,
  onError,
}: {
  label: string;
  value: number;
  limits: NonNullable<MatrixGridProps['limits']>;
  onChange: (value: number) => void;
  onError: (key: string, error: string | undefined) => void;
}) {
  const [text, setText] = useState(String(value));
  const [prev, setPrev] = useState(value);
  // Follow outside changes (a reset) without overwriting what the learner is typing.
  if (value !== prev) {
    setPrev(value);
    if (Number(text) !== value) setText(String(value));
  }
  const error = cellError(limits, text);
  return (
    <input
      className={s.input}
      type="text"
      inputMode="numeric"
      aria-label={label}
      aria-invalid={error ? true : undefined}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const problem = cellError(limits, next);
        onError(label, problem);
        if (!problem) onChange(Number(next));
      }}
      onBlur={() => {
        // Leaving an invalid cell puts back the last valid value, so state and display agree.
        if (error) {
          setText(String(value));
          onError(label, undefined);
        }
      }}
    />
  );
}

const indexLabel = (axis: string, n: number, hot: boolean) => `${axis} ${n}${hot ? ' (highlighted)' : ''}`;
