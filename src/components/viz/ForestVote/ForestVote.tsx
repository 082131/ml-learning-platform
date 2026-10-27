import { SPECIES } from '@/lib/classical/penguins';
import {
  FOREST_TEST,
  FOREST_TRAIN,
  type ForestResult,
  type ForestState,
} from '@/lib/classical/treesExperiments';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './ForestVote.module.css';

const pct = (x: number) => `${formatNumber(Math.round(x * 1000) / 10)} %`;

/** A random forest's vote for one held-out penguin, and its accuracy against a single tree (use with forestExperiment). */
export function ForestVote() {
  const { state, result } = useExperimentContext<ForestState, ForestResult>('ForestVote');
  const p = result.penguin;
  const nTrain = FOREST_TRAIN.length;
  const distinct = result.distinctInFirstSample;
  const title = `Votes of ${state.trees} trees for row ${p.row}`;
  return (
    <div className={s.layout}>
      <VizFrame
        title={title}
        table={
          <VizTable
            caption={title}
            columns={['species', 'votes']}
            rows={SPECIES.map((sp, i) => [sp, result.votes[i]!])}
          />
        }
        caption={`Row ${p.row} is a ${p.species} with bill ${p.bill_length_mm} mm and flipper ${p.flipper_length_mm} mm. The forest says ${SPECIES[result.forestPrediction]}; the single tree says ${SPECIES[result.treePrediction]}.`}
      >
        <ul className={s.bars} data-votes={result.votes.join(',')}>
          {SPECIES.map((sp, i) => {
            const v = result.votes[i]!;
            const win = i === result.forestPrediction;
            return (
              <li key={sp} className={s.bar}>
                <span className={s.name}>
                  {sp}
                  {win && ' ■ majority'}
                </span>
                <span className={s.track}>
                  <span
                    className={win ? s.fillWin : s.fill}
                    style={{ width: `${(100 * v) / state.trees}%` }}
                  />
                </span>
                <span className={s.count}>
                  {v} of {state.trees}
                </span>
              </li>
            );
          })}
        </ul>
      </VizFrame>
      <LineChart
        title="Held-out accuracy vs number of trees"
        xLabel="trees"
        yLabel="accuracy"
        height={240}
        series={[
          {
            id: 'forest',
            label: 'Forest (majority vote)',
            points: result.curve.map((a, i) => [i + 1, a] as const),
          },
          {
            id: 'tree',
            label: 'Single full tree',
            tone: 'muted',
            dashed: true,
            points: [
              [1, result.treeAccuracy],
              [result.curve.length, result.treeAccuracy],
            ],
          },
        ]}
        caption={`On ${FOREST_TEST.length} held-out penguins: the forest of ${state.trees} trees gets ${pct(result.forestAccuracy)}, one fully grown tree ${pct(result.treeAccuracy)}. Tree 1's bootstrap sample drew ${nTrain} rows with replacement and contains ${distinct} distinct ones (${pct(distinct / nTrain)}).`}
      />
    </div>
  );
}
