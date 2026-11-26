import type { ReactNode } from 'react';
import { ACTION_ARROW, cellName, type Action, type Grid } from '@/lib/rl/grid';
import s from './RlTrack.module.css';

const KIND_LABEL: Record<string, string> = { start: 'start', goal: 'goal', pit: 'pit', cliff: 'cliff', wall: 'wall', empty: '' };

export interface BoardProps {
  grid: Grid;
  /** A number to print in each cell (state values, max Q). */
  values?: readonly number[];
  arrows?: readonly (Action | undefined)[];
  /** Cells whose arrow disagrees with a reference policy (marked in color and in the cell's label). */
  mismatch?: readonly boolean[];
  agent?: number;
  path?: readonly number[];
  /** A second path, drawn dashed (for comparing two algorithms). */
  path2?: readonly number[];
  /** Extra text per cell, e.g. a landing probability. Cells with a label are highlighted. */
  labels?: ReadonlyMap<number, string>;
  /** Hide numbers on wide boards where they would not fit. */
  compact?: boolean;
  /** Extra text for the screen-reader label of a cell. */
  describe?: (cell: number) => string;
}

const kindText = (g: Grid, i: number) => {
  const k = g.kinds[i]!;
  if (k === 'goal') return `goal ${fmtReward(g.spec.goalReward)}`;
  if (k === 'pit') return `pit ${fmtReward(g.spec.pitReward)}`;
  if (k === 'cliff') return 'cliff';
  return KIND_LABEL[k] ?? '';
};
const fmtReward = (r: number) => (r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '0');
export const fmtValue = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2));

/** The grid world as an accessible list of cells: walls, terminals, the agent, values, arrows and paths. */
export function Board({ grid: g, values, arrows, mismatch, agent, path, path2, labels, compact, describe }: BoardProps) {
  const onPath = new Set(path ?? []);
  const onPath2 = new Set(path2 ?? []);
  return (
    <div
      className={s.board}
      data-wide={compact || undefined}
      role="list"
      aria-label={`Grid world, ${g.rows} rows by ${g.cols} columns`}
      style={{ gridTemplateColumns: `repeat(${g.cols}, minmax(0, 1fr))` }}
    >
      {g.kinds.map((k, i) => {
        const showValue = values && !compact && k !== 'wall' && k !== 'cliff';
        const arrow = arrows?.[i];
        const label = labels?.get(i);
        const parts: ReactNode[] = [];
        const name = [cellName(g, i), kindText(g, i)];
        if (i === agent) name.push('agent here');
        if (arrow) name.push(`action ${arrow}${mismatch?.[i] ? ' (differs from the optimal policy)' : ''}`);
        if (showValue) name.push(`value ${fmtValue(values[i]!)}`);
        if (label) name.push(label);
        if (onPath.has(i)) name.push('on the route');
        if (describe) name.push(describe(i));
        const kt = kindText(g, i);
        if (kt && (!compact || k !== 'empty')) parts.push(<span key="k" className={s.cellKind}>{compact && k === 'cliff' ? '' : kt}</span>);
        if (arrow) parts.push(<span key="a" className={s.arrow} aria-hidden="true">{ACTION_ARROW[arrow]}</span>);
        if (showValue) parts.push(<span key="v" className={s.value}>{fmtValue(values[i]!)}</span>);
        if (label) parts.push(<span key="l" className={s.prob}>{label}</span>);
        return (
          <div
            key={i}
            role="listitem"
            className={s.cell}
            data-cell={i}
            data-kind={k}
            data-agent={i === agent || undefined}
            data-on-path={onPath.has(i) ? 'first' : onPath2.has(i) ? 'second' : undefined}
            data-target={label ? true : undefined}
            data-mismatch={mismatch?.[i] || undefined}
            aria-label={name.filter(Boolean).join(', ')}
          >
            {parts}
          </div>
        );
      })}
    </div>
  );
}
