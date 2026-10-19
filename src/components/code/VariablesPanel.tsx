import { changesFrom, formatNumber, formatValue, removedFrom, type VarChange } from '@/lib/trace/values';
import type { TraceStep, TraceValue } from '@/lib/types';
import { cx } from '@/components/ui';
import s from './StepThrough.module.css';

const CHANGE_LABEL: Record<VarChange, string> = { new: 'new', changed: 'changed', same: '' };

/** Variables in scope at a step, with array shapes and what changed since the previous step. */
export function VariablesPanel({ step, prev }: { step: TraceStep; prev: TraceStep | undefined }) {
  const changes = changesFrom(prev, step);
  const removed = removedFrom(prev, step);
  const names = Object.keys(step.vars);
  return (
    <div className={s.vars}>
      <table className={s.table}>
        <caption className={s.caption}>Variables after this step</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
            <th scope="col">Shape</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {names.map((name) => (
            <tr
              key={name}
              data-change={changes[name]}
              className={cx(changes[name] !== 'same' && s.changedRow)}
            >
              <th scope="row" className={s.mono}>
                {name}
              </th>
              <td>
                <Value value={step.vars[name]!} cells={step.highlight?.[name]} />
              </td>
              <td className={s.mono}>{shapeOf(step.vars[name]!)}</td>
              <td>
                {changes[name] !== 'same' && <span className={s.change}>{CHANGE_LABEL[changes[name]!]}</span>}
              </td>
            </tr>
          ))}
          {names.length === 0 && (
            <tr>
              <td colSpan={4}>No variables yet.</td>
            </tr>
          )}
        </tbody>
      </table>
      {removed.length > 0 && <p className={s.removed}>Out of scope now: {removed.join(', ')}</p>}
    </div>
  );
}

function shapeOf(v: TraceValue): string {
  if (v.kind === 'array') return `(${v.shape.join(', ')}${v.shape.length === 1 ? ',' : ''})`;
  return v.kind === 'scalar' ? 'scalar' : 'text';
}

const isCell = (cells: number[][] | undefined, ...index: number[]) =>
  !!cells?.some((c) => c.length === index.length && c.every((x, i) => x === index[i]));

/** Scalars and text inline; arrays as a small grid with highlighted cells marked in text too. */
function Value({ value, cells }: { value: TraceValue; cells?: number[][] }) {
  if (value.kind !== 'array') return <span className={s.mono}>{formatValue(value)}</span>;
  const rows = value.shape.length === 2 ? (value.data as number[][]) : [value.data as number[]];
  return (
    <span
      className={s.grid}
      role="img"
      aria-label={`${formatValue(value)}${cells?.length ? `, highlighted ${cells.map((c) => `[${c.join(', ')}]`).join(' ')}` : ''}`}
    >
      {rows.map((row, r) => (
        <span key={r} className={s.gridRow}>
          {row.map((x, c) => {
            const hit = value.shape.length === 2 ? isCell(cells, r, c) : isCell(cells, c);
            return (
              <span key={c} className={cx(s.cell, hit && s.cellHit)}>
                {formatNumber(x)}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
