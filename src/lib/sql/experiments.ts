// Experiment definitions for the SQL track's visualizations. Logic lives in the pure modules they call.
import type { ExperimentDef } from '../types';
import { fanout, fanoutSql, type FanoutResult, type FanoutState } from './fanout';
import { joinTables, type FilterPlace, type JoinKind, type JoinResult } from './joins';
import { NULL_CONDITIONS, nullFilter, type NullFilterResult } from './nulls';
import { groupedPipeline, groupedSql, plainPipeline, plainSql, type PipelineState, type Stage } from './pipeline';

export interface PipelineResult {
  stages: Stage[];
  sql: string;
  grouped: boolean;
}

/** The logical-order pipeline. `grouped` adds GROUP BY and HAVING (the aggregation lesson). */
export function pipelineExperiment(id: string, grouped: boolean): ExperimentDef<PipelineState, PipelineResult> {
  return {
    id,
    initial: { minPrice: grouped ? 5 : 10, limit: 2, minCount: 2 },
    controls: [
      { kind: 'slider', id: 'min', label: 'WHERE price >=', min: 0, max: 60, step: 1, get: (s) => s.minPrice, set: (s, v) => ({ ...s, minPrice: v }) },
      grouped
        ? { kind: 'slider', id: 'having', label: 'HAVING COUNT(*) >=', min: 1, max: 3, step: 1, get: (s) => s.minCount, set: (s, v) => ({ ...s, minCount: v }) }
        : { kind: 'slider', id: 'limit', label: 'LIMIT', min: 1, max: 7, step: 1, get: (s) => s.limit, set: (s, v) => ({ ...s, limit: v }) },
    ],
    compute: (s) => ({ stages: grouped ? groupedPipeline(s) : plainPipeline(s), sql: grouped ? groupedSql(s) : plainSql(s), grouped }),
    readout: (_s, r) => r.stages.map((st) => ({ label: `Rows after ${st.clause}`, value: String(st.out) })),
  };
}

export function nullExperiment(id: string): ExperimentDef<{ condition: string }, NullFilterResult> {
  return {
    id,
    initial: { condition: 'ne' },
    controls: [
      {
        kind: 'select',
        id: 'condition',
        label: 'WHERE',
        options: NULL_CONDITIONS.map((c) => ({ value: c.id, label: c.sql })),
        get: (s) => s.condition,
        set: (_s, v) => ({ condition: v }),
      },
    ],
    compute: (s) => nullFilter(s.condition),
    readout: (_s, r) => [
      { label: 'Rows kept (TRUE)', value: `${r.kept} of ${r.rows.length}` },
      { label: 'Rows where the test is UNKNOWN', value: String(r.unknown), status: r.unknown ? 'error' : 'ok' },
    ],
  };
}

export interface JoinLabState {
  kind: JoinKind;
  place: FilterPlace;
}

export function joinExperimentSql(id: string): ExperimentDef<JoinLabState, JoinResult> {
  return {
    id,
    initial: { kind: 'left', place: 'none' },
    controls: [
      {
        kind: 'select',
        id: 'kind',
        label: 'Join type',
        options: [
          { value: 'inner', label: 'INNER JOIN' },
          { value: 'left', label: 'LEFT JOIN' },
          { value: 'right', label: 'RIGHT JOIN' },
          { value: 'full', label: 'FULL JOIN' },
        ],
        get: (s) => s.kind,
        set: (s, v) => ({ ...s, kind: v as JoinKind }),
      },
      {
        kind: 'select',
        id: 'place',
        label: "status = 'shipped' goes in",
        options: [
          { value: 'none', label: 'nowhere (no filter)' },
          { value: 'on', label: 'the ON clause' },
          { value: 'where', label: 'the WHERE clause' },
        ],
        get: (s) => s.place,
        set: (s, v) => ({ ...s, place: v as FilterPlace }),
      },
    ],
    compute: (s) => joinTables(s.kind, s.place),
    readout: (_s, r) => [
      { label: 'Result rows', value: String(r.rows.length) },
      { label: 'Matched customer-order pairs', value: String(r.matchedPairs) },
      { label: 'Kept with no match (NULL-padded)', value: String(r.keptCustomersWithoutMatch + r.keptOrdersWithoutMatch) },
      { label: 'Removed afterwards by WHERE', value: String(r.removedByWhere), status: r.removedByWhere ? 'error' : 'ok' },
    ],
  };
}

export function fanoutExperiment(id: string): ExperimentDef<FanoutState, FanoutResult & { sql: string }> {
  return {
    id,
    initial: { items: 2, payments: 2, method: 'join-both' },
    controls: [
      { kind: 'slider', id: 'items', label: 'Items in the order', min: 1, max: 4, step: 1, get: (s) => s.items, set: (s, v) => ({ ...s, items: v }) },
      { kind: 'slider', id: 'payments', label: 'Payments for the order', min: 1, max: 4, step: 1, get: (s) => s.payments, set: (s, v) => ({ ...s, payments: v }) },
      {
        kind: 'select',
        id: 'method',
        label: 'Query',
        options: [
          { value: 'join-both', label: 'join items and payments, then SUM' },
          { value: 'pre-aggregate', label: 'SUM each side first, then join' },
        ],
        get: (s) => s.method,
        set: (s, v) => ({ ...s, method: v as FanoutState['method'] }),
      },
    ],
    compute: (s) => ({ ...fanout(s), sql: fanoutSql(s) }),
    readout: (_s, r) => [
      { label: 'Rows after the joins', value: String(r.pairs.length) },
      { label: 'items_total reported (true)', value: `${r.reportedItems} (${r.trueItems})`, status: r.reportedItems === r.trueItems ? 'ok' : 'error' },
      { label: 'paid reported (true)', value: `${r.reportedPaid} (${r.truePaid})`, status: r.reportedPaid === r.truePaid ? 'ok' : 'error' },
    ],
  };
}
