import type { ExperimentDef } from '../types';
import type { FlowEdge, FlowNode, NodeStatus } from '../viz/flow';
import {
  BAD_RECORDS,
  BASE_ROW,
  fateOf,
  pyFloatRepr,
  rowsWith,
  runPipeline,
  type BadRecord,
  type EtlMode,
  type PipelineRun,
} from './etl';

export interface EtlState {
  mode: EtlMode;
  bad: BadRecord;
  validation: 'on' | 'off';
}

const W = 150;
const H = 60;
const COL = 190;
const ROW = 110;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The pipeline as FlowDiagram nodes and edges, with each step's row count and status. */
export function pipelineDiagram(r: PipelineRun, bad: BadRecord): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const fate = fateOf(r, bad).fate;
  const passed = r.extracted - r.quarantine.length;
  const failedAt = (stage: 'transform' | 'load'): NodeStatus => (r.failure?.stage === stage ? 'error' : 'ok');
  const node = (
    id: string,
    label: string,
    detail: string,
    col: number,
    row: number,
    status: NodeStatus = 'ok',
  ) => ({ id, label, detail, x: col * COL, y: row * ROW, w: W, h: H, status }) satisfies FlowNode;
  const transformLabel = r.validation ? 'Validate + transform' : 'Transform (no checks)';
  const ordersNode = (col: number, row: number) =>
    node(
      'orders',
      'orders',
      r.failure ? 'no rows loaded' : `warehouse · ${plural(r.stored.length, 'row')}`,
      col,
      row,
      r.failure ? 'error' : fate === 'loaded-wrong' ? 'warn' : 'ok',
    );
  const nodes: FlowNode[] = [
    node('source', 'Source CSV', plural(r.extracted, 'record'), 0, 0),
    node('extract', 'Extract', `${r.extracted} rows read`, 1, 0),
  ];
  const edges: FlowEdge[] = [{ from: 'source', to: 'extract' }];
  if (r.mode === 'etl') {
    nodes.push(
      node(
        'transform',
        transformLabel,
        r.validation ? `Python · ${passed} pass` : 'Python',
        2,
        0,
        failedAt('transform'),
      ),
      node(
        'load',
        'Load',
        r.failure?.stage === 'load' ? 'rolled back' : `${passed} rows`,
        3,
        0,
        failedAt('load'),
      ),
      ordersNode(4, 0),
    );
    edges.push(
      { from: 'extract', to: 'transform' },
      { from: 'transform', to: 'load' },
      { from: 'load', to: 'orders' },
    );
  } else {
    nodes.push(
      node('load', 'Load raw', `${r.raw} rows as text`, 2, 0),
      node('raw', 'raw_orders', `warehouse · ${r.raw} rows`, 3, 0),
      node(
        'transform',
        transformLabel,
        r.validation ? `SQL · ${passed} pass` : 'SQL',
        3,
        1,
        failedAt('transform'),
      ),
      ordersNode(4, 1),
    );
    edges.push(
      { from: 'extract', to: 'load' },
      { from: 'load', to: 'raw' },
      { from: 'raw', to: 'transform', fromSide: 'bottom', toSide: 'top' },
      { from: 'transform', to: 'orders' },
    );
  }
  if (r.validation) {
    const q = r.quarantine.length;
    nodes.push(
      node(
        'quarantine',
        r.mode === 'etl' ? 'Quarantine file' : 'orders_quarantine',
        plural(q, 'row'),
        2,
        1,
        q > 0 ? 'warn' : 'ok',
      ),
    );
    edges.push(
      r.mode === 'etl'
        ? {
            from: 'transform',
            to: 'quarantine',
            fromSide: 'bottom',
            toSide: 'top',
            label: 'invalid',
            active: q > 0,
          }
        : {
            from: 'transform',
            to: 'quarantine',
            fromSide: 'left',
            toSide: 'right',
            label: 'invalid',
            active: q > 0,
          },
    );
  }
  return { nodes, edges };
}

/** One table row per record of the batch: its values and where it ended up. */
export function recordRows(r: PipelineRun, bad: BadRecord) {
  return rowsWith(bad).map((row, i) => {
    const q = r.quarantine.find((x) => x.orderId === row.order_id);
    const stored = r.stored.find(([id]) => id === Number(row.order_id));
    const where = q
      ? `quarantine: ${q.reason}`
      : r.failure
        ? 'not loaded: the batch failed'
        : stored
          ? `orders (amount ${pyFloatRepr(stored[1])})`
          : '';
    return { i, ...row, where };
  });
}

export function etlExperiment(id: string): ExperimentDef<EtlState, PipelineRun> {
  return {
    id,
    initial: { mode: 'etl', bad: 'comma', validation: 'on' },
    controls: [
      {
        kind: 'select',
        id: 'mode',
        label: 'Pipeline',
        options: [
          { value: 'etl', label: 'ETL: transform before loading' },
          { value: 'elt', label: 'ELT: load raw, transform in the warehouse' },
        ],
        get: (s) => s.mode,
        set: (s, v) => ({ ...s, mode: v as EtlMode }),
      },
      {
        kind: 'select',
        id: 'bad',
        label: `Inject into record ${BASE_ROW.order_id}`,
        options: (Object.keys(BAD_RECORDS) as BadRecord[]).map((k) => ({
          value: k,
          label: BAD_RECORDS[k].label,
        })),
        get: (s) => s.bad,
        set: (s, v) => ({ ...s, bad: v as BadRecord }),
      },
      {
        kind: 'select',
        id: 'validation',
        label: 'Validation rules',
        options: [
          { value: 'on', label: 'On: bad rows go to quarantine' },
          { value: 'off', label: 'Off: transform everything' },
        ],
        get: (s) => s.validation,
        set: (s, v) => ({ ...s, validation: v as 'on' | 'off' }),
      },
    ],
    compute: (s) => runPipeline(s.mode, s.bad, s.validation === 'on'),
    readout: (_s, r) => [
      { label: 'Rows extracted', value: String(r.extracted) },
      { label: 'Quarantined', value: String(r.quarantine.length) },
      {
        label: 'Rows in orders',
        value: String(r.stored.length),
        status: r.failure ? 'error' : undefined,
      },
      {
        label: 'Revenue by country (SQL on orders)',
        value: r.revenue.length
          ? r.revenue.map(([c, v]) => `('${c}', ${pyFloatRepr(v)})`).join('\n')
          : '(no rows)',
      },
    ],
  };
}
