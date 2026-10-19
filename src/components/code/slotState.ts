import { createContext } from 'react';
import type { Trace } from '@/lib/types';

/**
 * The experiment state that fills `{{slot}}` placeholders in code (data-model.md, Experiments).
 * Thread 3's Experiment component provides it, so code literals always match the visualization.
 */
export const SlotStateContext = createContext<unknown>(undefined);

/**
 * The trace an Experiment computes from its state (`def.trace(state)`). A StepThrough inside the
 * experiment uses it when it has no `trace` prop and its example is `exampleId` (or none is named).
 */
export const ExperimentTraceContext = createContext<{ trace: Trace; exampleId?: string } | undefined>(
  undefined,
);
