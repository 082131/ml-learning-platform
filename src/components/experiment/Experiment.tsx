import { useMemo, type ReactNode } from 'react';
import type { ExperimentDef } from '@/lib/types';
import { Button } from '@/components/ui';
import { ExperimentTraceContext, SlotStateContext } from '@/components/code/slotState';
import { ExperimentContext, type ExperimentValue } from './ExperimentContext';
import { ExperimentControls } from './ExperimentControls';
import { useExperiment } from './useExperiment';
import s from './Experiment.module.css';

interface ExperimentProps<S, R> {
  def: ExperimentDef<S, R>;
  title?: string;
  /** Hide the controls, for a second view of an experiment whose controls are shown elsewhere on the page. */
  controls?: boolean;
  /** Visualizations, linked code (Code, StepThrough) and a Readout. They all read this experiment's state. */
  children?: ReactNode;
}

/**
 * Owns one experiment's state (shared with other blocks of the same def.id on the lesson page). Renders its controls, then its children inside the contexts that
 * fill code slots, supply the computed trace, and give visualizations `(state, result)`.
 */
export function Experiment<S, R>({ def, title, controls = true, children }: ExperimentProps<S, R>) {
  const exp = useExperiment(def);
  const { trace, ...value } = exp;
  const traceValue = useMemo(
    () => (trace ? { trace, exampleId: def.traceExample } : undefined),
    [trace, def],
  );
  return (
    <figure className={s.experiment} data-wide data-experiment={def.id}>
      <figcaption className={s.header}>
        <span>{title ?? 'Experiment'}</span>
        <Button size="sm" variant="ghost" onClick={exp.reset}>
          Reset
        </Button>
      </figcaption>
      <ExperimentContext.Provider value={value as unknown as ExperimentValue}>
        <SlotStateContext.Provider value={exp.state}>
          <ExperimentTraceContext.Provider value={traceValue}>
            {controls && def.controls.length > 0 && <ExperimentControls />}
            <div className={s.body}>{children}</div>
          </ExperimentTraceContext.Provider>
        </SlotStateContext.Provider>
      </ExperimentContext.Provider>
    </figure>
  );
}
