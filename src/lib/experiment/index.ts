import type { Control, ExperimentDef } from '../types';

export type ExperimentAction<S> = { type: 'update'; update: (s: S) => S } | { type: 'reset'; state: S };

/** The single reducer every experiment uses: all inputs go through `update`, so state has one owner. */
export function experimentReducer<S>(state: S, action: ExperimentAction<S>): S {
  return action.type === 'reset' ? action.state : action.update(state);
}

/** Applies a control's new value to state. Values from a range control are clamped to its bounds. */
export function applyControl<S>(control: Control<S>, state: S, value: number | string): S {
  switch (control.kind) {
    case 'slider':
    case 'number': {
      const min = control.min ?? -Infinity;
      const max = control.max ?? Infinity;
      return control.set(state, Math.min(max, Math.max(min, Number(value))));
    }
    case 'select':
      if (!control.options.some((o) => o.value === value))
        throw new Error(`Control "${control.id}" has no option "${value}"`);
      return control.set(state, String(value));
    case 'text':
      return control.set(state, String(value).slice(0, control.maxLength ?? Infinity));
    case 'matrix-cell':
      throw new Error('Matrix controls change one cell at a time: call control.set(state, i, j, value)');
  }
}

/** Is `value` acceptable for a matrix cell control? Returns the problem in words, or undefined. */
export function cellError(control: { min?: number; max?: number; integer?: boolean }, text: string) {
  const n = text.trim() === '' ? NaN : Number(text);
  const { min = -Infinity, max = Infinity, integer } = control;
  if (!Number.isFinite(n)) return 'Enter a number.';
  if (integer && !Number.isInteger(n)) return 'Enter a whole number.';
  if (n < min || n > max) return `Enter a number from ${min} to ${max}.`;
  return undefined;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export const isExperimentDef = (v: unknown): v is ExperimentDef<unknown, unknown> =>
  isObject(v) && 'initial' in v && Array.isArray(v.controls) && typeof v.compute === 'function';

/**
 * Checks an experiment against its own initial state: unique control ids, every control readable,
 * range values in bounds, select values among the options, and compute, trace and readout run.
 */
export function validateExperiment<S, R>(def: ExperimentDef<S, R>): string[] {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`experiment ${def.id}: ${msg}`);
  const ids = new Set<string>();
  for (const c of def.controls) {
    if (ids.has(c.id)) at(`duplicate control id "${c.id}"`);
    ids.add(c.id);
    if (!c.label.trim()) at(`control "${c.id}" needs a label`);
    try {
      if (c.kind === 'slider' || c.kind === 'number') {
        const v = c.get(def.initial);
        if (v < (c.min ?? -Infinity) || v > (c.max ?? Infinity)) at(`control "${c.id}" starts out of range`);
      } else if (c.kind === 'select') {
        if (!c.options.some((o) => o.value === c.get(def.initial)))
          at(`control "${c.id}" starts on a value that is not an option`);
      } else if (c.kind === 'matrix-cell') {
        const m = c.get(def.initial);
        if (m.flat().some((x) => cellError(c, String(x))))
          at(`control "${c.id}" starts with an invalid cell`);
      } else c.get(def.initial);
    } catch (e) {
      at(`control "${c.id}" can't read the initial state: ${(e as Error).message}`);
    }
  }
  try {
    const result = def.compute(def.initial);
    def.readout?.(def.initial, result);
    const trace = def.trace?.(def.initial);
    if (trace && trace.steps.length === 0) at('trace has no steps');
  } catch (e) {
    at(`compute, trace or readout failed on the initial state: ${(e as Error).message}`);
  }
  return errors;
}

export interface ExperimentStore<S> {
  get: () => S;
  dispatch: (action: ExperimentAction<S>) => void;
  subscribe: (listener: () => void) => () => void;
}

/** A tiny external store around experimentReducer, so several blocks can share one experiment's state. */
export function createExperimentStore<S>(initial: S): ExperimentStore<S> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    dispatch: (action) => {
      const next = experimentReducer(state, action);
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * One store per experiment id for a lesson page. Every <Experiment> with the same def.id on the page
 * shares state, so a cell edited in the Visual section also changes the code in the Code section.
 */
export function createStoreRegistry() {
  const stores = new Map<string, { initial: unknown; store: ExperimentStore<unknown> }>();
  return {
    get<S>(def: { id: string; initial: S }): ExperimentStore<S> {
      const found = stores.get(def.id);
      if (found && found.initial !== def.initial)
        throw new Error(`Two different experiments use the id "${def.id}" on one page`);
      if (found) return found.store as ExperimentStore<S>;
      const store = createExperimentStore<S>(def.initial);
      stores.set(def.id, { initial: def.initial, store: store as ExperimentStore<unknown> });
      return store;
    },
  };
}
export type StoreRegistry = ReturnType<typeof createStoreRegistry>;
