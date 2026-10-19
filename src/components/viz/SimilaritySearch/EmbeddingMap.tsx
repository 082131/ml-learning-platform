import { useRef } from 'react';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { TOP_K, type SimilarityResult, type SimilarityState } from '@/lib/ai/similarityExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge, cx } from '@/components/ui';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './SimilaritySearch.module.css';

const HEIGHT = 340;
const PAD = 36;
const FALLBACK_WIDTH = 640;
const RADIUS = 4;

/**
 * The sentences projected from 384 to 2 dimensions with PCA, with lines from the query to its top
 * matches. Distances in 2-D only approximate the real ones; the caption says how much variance is kept.
 */
export function EmbeddingMap() {
  const { result } = useExperimentContext<SimilarityState, SimilarityResult>('EmbeddingMap');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const { query, ranked, map } = result;
  // map.points follows the order of every item; ranked holds only sentences, so index by id.
  const items = ranked.map((r) => r.item);
  const all = [...items, ...(items.some((i) => i.id === query.id) ? [] : [query])];
  const pointOf = (id: string) => map.points[map.ids.indexOf(id)]!;
  const [x0, x1] = extent(map.points, (p) => p[0]) as [number, number];
  const [y0, y1] = extent(map.points, (p) => p[1]) as [number, number];
  const x = scaleLinear().domain([x0, x1]).range([PAD, width - PAD]);
  const y = scaleLinear().domain([y0, y1]).range([HEIGHT - PAD, PAD]);
  const top = ranked.filter((r) => r.item.id !== query.id).slice(0, TOP_K);
  const kept = Math.round((map.explained[0] + map.explained[1]) * 100);

  return (
    <VizFrame
      title="Embedding map (PCA to 2-D)"
      badge={<Badge tone="ok">Computed in your browser</Badge>}
      table={
        <VizTable
          caption="2-D coordinates of each text"
          columns={['Text', 'x', 'y']}
          rows={all.map((i) => [i.text, pointOf(i.id)[0].toFixed(3), pointOf(i.id)[1].toFixed(3)])}
        />
      }
      caption={`The two axes keep ${kept}% of the variance of the 384-dimension vectors, so nearby points are usually similar, but the ranking above is the exact answer. Lines join the query to its ${TOP_K} nearest sentences.`}
    >
      <div ref={ref}>
        <svg width={width} height={HEIGHT} role="img" aria-label={`Map of ${all.length} texts; the query is the diamond`}>
          {top.map((r) => {
            const [a, b] = [pointOf(query.id), pointOf(r.item.id)];
            return (
              <line key={r.item.id} className={cx(svg.accent, svg.dashed)} x1={x(a[0])} y1={y(a[1])} x2={x(b[0])} y2={y(b[1])} />
            );
          })}
          {items.map((i) => {
            const [px, py] = pointOf(i.id);
            const near = top.some((r) => r.item.id === i.id);
            return (
              <g key={i.id}>
                <circle className={near ? svg.accent : svg.muted} cx={x(px)} cy={y(py)} r={RADIUS} />
                <text className={cx(svg.tick, s.mapLabel)} x={x(px) + RADIUS + 2} y={y(py) + 4}>
                  {i.id}
                </text>
              </g>
            );
          })}
          <rect
            className={svg.ink}
            x={x(pointOf(query.id)[0]) - RADIUS - 1}
            y={y(pointOf(query.id)[1]) - RADIUS - 1}
            width={2 * RADIUS + 2}
            height={2 * RADIUS + 2}
            transform={`rotate(45 ${x(pointOf(query.id)[0])} ${y(pointOf(query.id)[1])})`}
          />
        </svg>
      </div>
    </VizFrame>
  );
}
