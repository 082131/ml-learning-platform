import { MAX_PROBE, N_VECTORS, TOP_K, type IvfResult, type IvfState } from '@/lib/ai/ivf';
import { EVAL_KS, type RetrievalEvalResult, type RetrievalEvalState } from '@/lib/ai/retrievalEval';
import { CANDIDATES } from '@/lib/ai/ragExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame } from '../VizFrame/VizFrame';
import { Status } from './Status';
import s from './AiTrack.module.css';

/** Recall and work done as the index searches more clusters. */
export function IvfTradeoff() {
  const { state, result } = useExperimentContext<IvfState, IvfResult>('IvfTradeoff');
  const c = result.current;
  return (
    <LineChart
      title={`Recall@${TOP_K} and vectors compared, by nprobe (nlist = ${state.nlist})`}
      badge={<Badge tone="ok">Computed in your browser</Badge>}
      xLabel="clusters searched per query (nprobe)"
      yLabel="share (0 to 1)"
      xDomain={[1, MAX_PROBE]}
      yDomain={[0, 1]}
      series={[
        {
          id: 'recall',
          label: `recall@${TOP_K}`,
          points: result.curve.map((p) => [p.nprobe, p.recall] as const),
          tone: 'accent',
          dots: true,
        },
        {
          id: 'scanned',
          label: 'share of vectors compared',
          points: result.curve.map((p) => [p.nprobe, p.scannedShare] as const),
          tone: 'muted',
          dashed: true,
        },
      ]}
      overlay={(x, y) => (
        <g aria-hidden="true">
          <circle className={s.boxAccent} cx={x(c.nprobe)} cy={y(c.recall)} r={6} />
        </g>
      )}
      caption={`Searching ${c.nprobe} of ${state.nlist} clusters compares ${Math.round(c.scannedShare * N_VECTORS)} of ${N_VECTORS} vectors (${(c.scannedShare * 100).toFixed(1)}%) and finds ${(c.recall * 100).toFixed(1)}% of the exact top ${TOP_K}, averaged over 60 queries.`}
    />
  );
}

const rankText = (r?: number) => (r === undefined ? `not in top ${CANDIDATES}` : String(r));

/** Where the answer chunk ranks for each evaluation question, with recall@k and MRR. */
export function RetrievalEvalTable() {
  const { state, result } = useExperimentContext<RetrievalEvalState, RetrievalEvalResult>(
    'RetrievalEvalTable',
  );
  const k = EVAL_KS.map((n) => `recall@${n} ${result.recall[n]!.toFixed(2)}`).join(', ');
  return (
    <VizFrame
      title="Retrieval evaluation on the Lumen questions"
      badge={<Badge tone="ok">Computed with the RAG pipeline</Badge>}
      caption={`${k}, MRR ${result.mrr.toFixed(2)}. With the keyword weight at 0: recall@1 ${result.baseline.recall[1]!.toFixed(2)}, MRR ${result.baseline.mrr.toFixed(2)}.`}
    >
      <table className={s.table}>
        <caption className="visually-hidden">Answer chunk rank per question</caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col" className={s.num}>
              Answer rank
            </th>
            <th scope="col">In top 1 / 3</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr key={r.query} data-query={r.query}>
              <th scope="row">{r.text}</th>
              <td className={s.num}>{rankText(r.rank)}</td>
              <td>
                <Status tone={r.rank === 1 ? 'ok' : r.rank !== undefined && r.rank <= 3 ? 'warn' : 'err'}>
                  {r.rank === 1 ? 'top 1' : r.rank !== undefined && r.rank <= 3 ? 'top 3' : 'missed'}
                </Status>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.muted}>
        Settings: {state.size}-word chunks, {state.overlap} overlap, keyword weight{' '}
        {state.keywordWeight.toFixed(1)}.
      </p>
    </VizFrame>
  );
}
