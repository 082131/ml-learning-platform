import { createContext } from 'react';

/**
 * The experiment state that fills `{{slot}}` placeholders in code (data-model.md, Experiments).
 * Thread 3's Experiment component provides it, so code literals always match the visualization.
 */
export const SlotStateContext = createContext<unknown>(undefined);
