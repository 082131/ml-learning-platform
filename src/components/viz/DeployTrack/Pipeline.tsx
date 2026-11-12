import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { PipelineResult, PipelineState } from '@/lib/deploy/pipeline';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './DeployTrack.module.css';

/** The pipeline's steps, each marked ran or cached, followed by the registry gate. */
export function PipelineSteps() {
  const { state, result } = useExperimentContext<PipelineState, PipelineResult>('PipelineSteps');
  const ran = result.steps.filter((x) => x.ran);
  return (
    <VizFrame
      title="Which steps run, and does the model ship"
      badge={<Badge tone="simulated">Real accuracies</Badge>}
      caption={`Data ${state.data}, features ${state.features}, C ${state.C}. ${
        ran.length ? `Runs: ${ran.map((x) => x.step).join(', ')}.` : 'Every step is reused from the cache.'
      } Registry: ${result.promoted ? 'promoted' : 'blocked'}, ${result.reason}.`}
      table={
        <VizTable
          caption="Step, cache key and outcome"
          columns={['step', 'cache key', 'outcome']}
          rows={[
            ...result.steps.map((x) => [x.step, x.key, x.ran ? 'ran' : 'cached']),
            ['register', '', result.promoted ? 'promoted' : 'blocked'],
          ]}
        />
      }
    >
      <ol className={s.stages} data-ran={String(ran.length)} data-promoted={String(result.promoted)}>
        {result.steps.map((x, i) => (
          <li key={x.step} className={s.stage} data-state={x.ran ? 'ran' : undefined}>
            <span className={s.stageName}>
              {i + 1}. {x.step}
            </span>
            <span className={s.stageTool}>{x.ran ? 'ran' : 'cached'}</span>
            <span className={`${s.stageWhy} ${s.mono}`}>{x.key}</span>
          </li>
        ))}
        <li className={s.stage} data-state={result.promoted ? 'ran' : 'blocked'}>
          <span className={s.stageName}>6. register</span>
          <span className={s.stageTool}>{result.promoted ? 'promoted' : 'blocked'}</span>
          <span className={s.stageWhy}>{result.reason}</span>
        </li>
      </ol>
    </VizFrame>
  );
}
