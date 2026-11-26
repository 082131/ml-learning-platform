// Experiment definitions for the SQL track's visualizations. Logic lives in the pure modules they call.
import type { ExperimentDef } from '../types';
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
