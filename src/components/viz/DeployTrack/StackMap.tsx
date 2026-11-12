import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { MODELS, TARGETS, type StackResult, type StackState } from '@/lib/deploy/stack';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './DeployTrack.module.css';

/** The six stages from a trained model to a running service, with the tool chosen at each. */
export function StackMap() {
  const { state, result } = useExperimentContext<StackState, StackResult>('StackMap');
  return (
    <VizFrame
      title="From trained model to running service"
      badge={<Badge tone="simulated">Rules of thumb</Badge>}
      caption={`${MODELS[state.model].label} on: ${TARGETS[state.target].label}. ${result.stages
        .slice(1, 5)
        .map((x) => `${x.stage}: ${x.tool}`)
        .join('. ')}.`}
      table={
        <VizTable
          caption="Choice at each stage"
          columns={['stage', 'choice', 'why']}
          rows={result.stages.map((x) => [x.stage, x.tool, x.why])}
        />
      }
    >
      <ol className={s.stages} data-format={result.stages[1]!.tool} data-fits={String(result.fits)}>
        {result.stages.map((x, i) => (
          <li key={x.stage} className={s.stage} data-state={i > 0 && i < 5 ? 'ran' : undefined}>
            <span className={s.stageName}>
              {i + 1}. {x.stage}
            </span>
            <span className={s.stageTool}>{x.tool}</span>
            <span className={s.stageWhy}>{x.why}</span>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}
