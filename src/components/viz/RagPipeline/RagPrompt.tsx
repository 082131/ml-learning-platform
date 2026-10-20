import type { RagResult, RagState } from '@/lib/ai/ragExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import s from './RagPipeline.module.css';

/** The assembled prompt, character for character, and the scripted response, labeled as simulated. */
export function RagPrompt() {
  const { result } = useExperimentContext<RagState, RagResult>('RagPrompt');
  return (
    <div className={s.promptWrap} data-wide>
      <section className={s.panel} aria-label="Assembled prompt">
        <h3 className={s.panelTitle}>
          Prompt sent to the model <Badge tone="ok">Assembled in your browser</Badge>
        </h3>
        <pre className={s.prompt} tabIndex={0} data-prompt>
          {result.prompt}
        </pre>
      </section>
      <section
        className={s.panel}
        aria-label="Model response"
        data-response={result.response.grounded ? 'grounded' : 'missing'}
      >
        <h3 className={s.panelTitle}>
          Response <Badge tone="simulated">Simulated response</Badge>
        </h3>
        <p className={s.response}>{result.response.text}</p>
        <p className={s.note}>
          No language model ran. This reply was written for the lesson. The rule that picks it is computed: if
          a chunk in the prompt contains the answer, the grounded reply is shown with that chunk’s source
          number; otherwise the “not in the context” reply is shown.
        </p>
      </section>
    </div>
  );
}
