import { createContext, useContext } from 'react';
import type { ExperimentDef } from '@/lib/types';

export interface ExperimentValue<S = unknown, R = unknown> {
  def: ExperimentDef<S, R>;
  state: S;
  result: R;
  update: (fn: (s: S) => S) => void;
  reset: () => void;
}

export const ExperimentContext = createContext<ExperimentValue | undefined>(undefined);

/**
 * The shared (state, result) of the enclosing Experiment. Visualization components call this, so
 * they read and write the same state as the code slots and the readout (constitution III).
 */
export function useExperimentContext<S, R>(component: string): ExperimentValue<S, R> {
  const value = useContext(ExperimentContext);
  if (!value) throw new Error(`<${component}> must be placed inside an <Experiment>`);
  return value as unknown as ExperimentValue<S, R>;
}
