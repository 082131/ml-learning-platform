import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { createExperimentStore, type StoreRegistry } from '@/lib/experiment';
import type { ExperimentDef, Trace } from '@/lib/types';
import type { ExperimentValue } from './ExperimentContext';

/** Provided per lesson page (LessonBody): experiments with the same id share one store. */
export const ExperimentStoresContext = createContext<StoreRegistry | undefined>(undefined);

/** One reducer owns the state (shared by id on a lesson page); `compute` and `trace` are memoized on it. */
export function useExperiment<S, R>(def: ExperimentDef<S, R>): ExperimentValue<S, R> & { trace?: Trace } {
  const registry = useContext(ExperimentStoresContext);
  const [own] = useState(() => createExperimentStore(def.initial));
  const store = registry ? registry.get(def) : own;
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const result = useMemo(() => def.compute(state), [def, state]);
  const trace = useMemo(() => def.trace?.(state), [def, state]);
  const update = useCallback((fn: (s: S) => S) => store.dispatch({ type: 'update', update: fn }), [store]);
  const reset = useCallback(() => store.dispatch({ type: 'reset', state: def.initial }), [store, def]);
  return { def, state, result, trace, update, reset };
}
